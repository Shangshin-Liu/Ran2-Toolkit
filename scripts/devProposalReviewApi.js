// 技能修正提案：本機審核 API（只存在於 `npm run dev` 的開發伺服器）
//
// 前端 SDK 受 firestore.rules 限制，無法把提案改為「已採納」。審核必須以 Admin SDK 執行，
// 而 Admin SDK 需要專案根目錄的 serviceAccountKey.json，所以只有站長的電腦做得到。
//
// 流程（採納）：
//   1. 讀取 Firestore 的提案並重新驗證內容
//   2. 把修改套用到 backups/ran2_all_skills.json（本機檔案）
//   3. 把提案狀態改為「已採納」
//   之後由站長確認 JSON 的差異，再執行 `node scripts/upload_skills.js` 發布到線上。
//
// 這個外掛設定了 apply: 'serve'，`vite build` 不會包含它；正式站沒有這個 API。

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { applyProposal, validateProposal } from '../src/utils/skillProposal.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_SKILLS_PATH = path.join(__dirname, '../backups/ran2_all_skills.json')
const DEFAULT_KEY_PATH = path.join(__dirname, '../serviceAccountKey.json')

export const REVIEW_API_PATH = '/__dev/skill-proposals/review'
const COLLECTION = 'skill_proposals'
const NOTE_LIMIT = 500

const httpError = (status, message) => Object.assign(new Error(message), { httpStatus: status })

/**
 * 執行審核（純邏輯，方便測試）
 * @param {object} args
 * @param {object} args.db          Admin SDK 的 Firestore 實例
 * @param {string} args.skillsPath  技能 JSON 路徑
 * @param {string} args.id          提案 ID
 * @param {'accepted'|'withdrawn'|'pending'} args.status
 * @param {string} [args.note]
 */
export async function reviewProposal({ db, skillsPath = DEFAULT_SKILLS_PATH, id, status, note = '', now = Date.now() }) {
  if (typeof id !== 'string' || !id || id.includes('/')) throw httpError(400, '提案 ID 不正確')
  if (!['accepted', 'withdrawn', 'pending'].includes(status)) throw httpError(400, `未知的狀態：${status}`)
  const reviewNote = String(note || '').trim().slice(0, NOTE_LIMIT)

  const ref = db.collection(COLLECTION).doc(id)
  const snap = await ref.get()
  if (!snap.exists) throw httpError(404, '找不到該提案')
  const proposal = { id, ...snap.data() }
  const warnings = []

  if (status === 'accepted') {
    if (proposal.status !== 'pending') throw httpError(409, '只有待審核的提案可以採納')
    const errors = validateProposal(proposal)
    if (errors.length) throw httpError(422, `提案內容驗證失敗：${errors.join('；')}`)

    const trees = JSON.parse(fs.readFileSync(skillsPath, 'utf8'))
    const result = applyProposal(trees, proposal)
    if (!result.applied) throw httpError(422, result.warnings.join('；') || '無法套用到技能資料')
    warnings.push(...result.warnings)
    // 先寫本機檔案再改線上狀態：若第二步失敗，提案仍是待審核，重新採納只會寫入相同內容
    fs.writeFileSync(skillsPath, JSON.stringify(result.trees, null, 2) + '\n', 'utf8')
  } else if (status === 'withdrawn') {
    if (proposal.status !== 'pending') throw httpError(409, '只有待審核的提案可以撤回')
  } else if (proposal.status !== 'withdrawn') {
    // 已採納的提案已經寫進技能 JSON，無法單純改回待審核
    throw httpError(409, '只有已撤回的提案可以改回待審核')
  }

  await ref.update({
    status,
    reviewNote,
    reviewedAt: status === 'pending' ? null : now
  })

  return { id, status, skillName: proposal.skillName || '', warnings }
}

// ── Admin SDK（第一次使用時才載入，沒有金鑰也不影響 dev server 啟動）──
let adminDbPromise = null
const getAdminDb = () => {
  if (!adminDbPromise) {
    adminDbPromise = (async () => {
      const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || DEFAULT_KEY_PATH
      if (!fs.existsSync(keyPath)) {
        throw httpError(500, `找不到服務帳戶金鑰：${keyPath}。請放好 serviceAccountKey.json 後重新啟動 dev server。`)
      }
      const { initializeApp, cert, getApps } = await import('firebase-admin/app')
      const { getFirestore } = await import('firebase-admin/firestore')
      const name = 'proposal-review'
      const app = getApps().find(a => a.name === name) ||
        initializeApp({ credential: cert(JSON.parse(fs.readFileSync(keyPath, 'utf8'))) }, name)
      return getFirestore(app)
    })().catch(err => {
      adminDbPromise = null
      throw err
    })
  }
  return adminDbPromise
}

const isLoopback = (addr = '') => addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1'
const isLocalHostname = (host = '') => ['localhost', '127.0.0.1', '[::1]'].includes(host)

/** 檢查請求是否來自本機的開發頁面；回傳錯誤訊息，通過則回傳 null */
export const checkReviewRequest = (req) => {
  if (req.method !== 'POST') return { status: 405, message: '只接受 POST' }
  // 即使 dev server 以 --host 對外開放，也只接受本機連線
  if (!isLoopback(req.socket?.remoteAddress)) return { status: 403, message: '審核 API 只接受本機連線' }
  // 自訂標頭＋來源檢查：避免其他網站的網頁對 localhost 發出請求
  if (req.headers['x-ran2-dev-review'] !== '1') return { status: 403, message: '缺少必要的標頭' }
  const origin = req.headers.origin
  if (origin) {
    let hostname = ''
    try { hostname = new URL(origin).hostname } catch { /* ignore */ }
    if (!isLocalHostname(hostname) && !isLocalHostname(`[${hostname}]`)) return { status: 403, message: '來源不被允許' }
  }
  return null
}

const readBody = (req) => new Promise((resolve, reject) => {
  let raw = ''
  req.on('data', chunk => {
    raw += chunk
    if (raw.length > 20000) reject(httpError(413, '內容過長'))
  })
  req.on('end', () => {
    try { resolve(raw ? JSON.parse(raw) : {}) } catch { reject(httpError(400, 'JSON 格式錯誤')) }
  })
  req.on('error', reject)
})

export function proposalReviewPlugin() {
  return {
    name: 'ran2-proposal-review-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(REVIEW_API_PATH, async (req, res) => {
        const send = (status, body) => {
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify(body))
        }
        const denied = checkReviewRequest(req)
        if (denied) return send(denied.status, { success: false, error: denied.message })
        try {
          const { id, status, note } = await readBody(req)
          const db = await getAdminDb()
          const result = await reviewProposal({ db, id, status, note })
          console.log(`[提案審核] ${result.skillName || id} → ${status}`)
          send(200, { success: true, ...result })
        } catch (err) {
          if (!err.httpStatus) console.error('[提案審核] 失敗：', err)
          send(err.httpStatus || 500, { success: false, error: err.message })
        }
      })
    }
  }
}
