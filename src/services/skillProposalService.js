// 技能資料修正提案的資料存取層
//
// 兩種實作，介面相同（list / submit / withdraw / review / isMine）：
//   - FirestoreProposalStore（預設）：提案存放在 Firestore 的 skill_proposals 集合
//   - LocalProposalStore：只存在瀏覽器 localStorage，供單元測試與離線試用
//     （在 .env.local 設定 VITE_PROPOSAL_STORE=local 可切換）
//
// 權限模型：
//   - 任何人都可以送出提案（狀態固定為「待審核」）
//   - 送出時產生一組「撤回密鑰」，只存在提案人的瀏覽器；Firestore 端存放在前端讀不到的
//     skill_proposal_secrets 集合，由 firestore.rules 比對
//   - 只有持有密鑰的人能把自己「待審核」的提案改為「已撤回」
//   - 「採納」與站長撤回只能由站長以 Admin SDK 執行（本機 dev server 的審核 API），
//     firestore.rules 不允許前端做這件事，正式站也沒有這個入口

import { validateProposal, PROPOSAL_STATUS } from '@/utils/skillProposal.js'
import { db } from '@/firebase.js'
import { collection, doc, getDocs, query, orderBy, limit, writeBatch, updateDoc, serverTimestamp } from 'firebase/firestore'

export const PROPOSALS_COLLECTION = 'skill_proposals'
export const PROPOSAL_SECRETS_COLLECTION = 'skill_proposal_secrets'

// 撤回密鑰與送出時間存放在瀏覽器的 key
export const PROPOSAL_SECRETS_KEY = 'ran2_skill_proposal_secrets'
export const LAST_SUBMIT_KEY = 'ran2_skill_proposal_last_submit'

// 本地模擬用的 key
export const LOCAL_PROPOSALS_KEY = 'ran2_dev_skill_proposals'
export const LOCAL_SECRETS_KEY = 'ran2_dev_skill_proposal_secrets'

// 列表一次最多讀取的筆數（由新到舊）
export const PROPOSAL_LIST_LIMIT = 200
// 兩次送出提案之間的最短間隔，避免誤觸連續送出
export const SUBMIT_COOLDOWN_MS = 30 * 1000

export const WITHDRAW_NOTE = '提案人自行撤回'

// 提案功能開關：預設啟用；需要暫時關閉時在環境變數設定 VITE_DISABLE_SKILL_PROPOSAL=true 後重新建置
export const isSkillProposalEnabled = () => import.meta.env.VITE_DISABLE_SKILL_PROPOSAL !== 'true'

// 審核功能（採納、站長撤回）只在開發模式提供，正式建置一律關閉。
// 在 dev 模式想預覽一般使用者看到的畫面，可在 .env.local 設定 VITE_HIDE_PROPOSAL_REVIEW=true
export const isProposalReviewEnabled = () =>
  !!import.meta.env.DEV && import.meta.env.VITE_HIDE_PROPOSAL_REVIEW !== 'true'

const genLocalId = () => `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

const genSecret = () => {
  const bytes = new Uint8Array(16)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

const readJson = (storage, key, fallback) => {
  try {
    const raw = storage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

// Firestore 的時間欄位可能是 Timestamp（前端以伺服器時間寫入）或毫秒數（審核 API 寫入），統一轉成毫秒
const toMillis = (v) => {
  if (v && typeof v.toMillis === 'function') return v.toMillis()
  return typeof v === 'number' ? v : null
}

const assertValid = (proposal) => {
  const errors = validateProposal(proposal)
  if (errors.length > 0) {
    const err = new Error(errors.join('\n'))
    err.validationErrors = errors
    throw err
  }
}

// 寫入 Firestore 的欄位（與 firestore.rules 的白名單一致）
const pickProposalFields = (p) => ({
  skillGroupId: p.skillGroupId,
  skillName: p.skillName || '',
  treeId: p.treeId || '',
  job: p.job || '',
  skillTree: p.skillTree || '',
  levels: p.levels || [],
  changes: p.changes || {},
  before: p.before || {},
  reason: p.reason,
  authorCharId: p.authorCharId || ''
})

// ─────────────────────────────────────────
// Firestore
// ─────────────────────────────────────────
export class FirestoreProposalStore {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage
  }

  _secrets() {
    const s = readJson(this.storage, PROPOSAL_SECRETS_KEY, {})
    return s && typeof s === 'object' ? s : {}
  }

  _setSecret(id, secret) {
    const secrets = this._secrets()
    if (secret) secrets[id] = secret
    else delete secrets[id]
    this.storage.setItem(PROPOSAL_SECRETS_KEY, JSON.stringify(secrets))
  }

  /** 這份提案是否由目前這個瀏覽器送出（持有撤回密鑰） */
  isMine(id) {
    return !!this._secrets()[id]
  }

  /** 由新到舊讀取提案 */
  async list() {
    const snap = await getDocs(query(collection(db, PROPOSALS_COLLECTION), orderBy('createdAt', 'desc'), limit(PROPOSAL_LIST_LIMIT)))
    const list = []
    snap.forEach(d => {
      const { withdrawSecret, ...data } = d.data()
      list.push({ id: d.id, ...data, createdAt: toMillis(data.createdAt), reviewedAt: toMillis(data.reviewedAt) })
    })
    return list
  }

  /** 一般使用者：送出提案 */
  async submit(proposal) {
    assertValid(proposal)

    const last = Number(this.storage.getItem(LAST_SUBMIT_KEY) || 0)
    const wait = SUBMIT_COOLDOWN_MS - (Date.now() - last)
    if (wait > 0) throw new Error(`送出太頻繁，請 ${Math.ceil(wait / 1000)} 秒後再試`)

    const ref = doc(collection(db, PROPOSALS_COLLECTION))
    const secret = genSecret()
    const data = {
      ...pickProposalFields(proposal),
      status: 'pending',
      reviewNote: '',
      reviewedAt: null
    }

    // 提案與撤回密鑰必須同時建立（firestore.rules 會檢查）；時間一律使用伺服器時間
    const batch = writeBatch(db)
    batch.set(ref, { ...data, createdAt: serverTimestamp() })
    batch.set(doc(db, PROPOSAL_SECRETS_COLLECTION, ref.id), { secret })

    this._setSecret(ref.id, secret)
    try {
      await batch.commit()
    } catch (err) {
      this._setSecret(ref.id, null)
      throw err
    }
    this.storage.setItem(LAST_SUBMIT_KEY, String(Date.now()))
    return { id: ref.id, ...data, createdAt: Date.now() }
  }

  /** 一般使用者：撤回自己「待審核」的提案 */
  async withdraw(id) {
    const secret = this._secrets()[id]
    if (!secret) throw new Error('只能撤回自己送出的提案')
    await updateDoc(doc(db, PROPOSALS_COLLECTION, id), {
      status: 'withdrawn',
      reviewNote: WITHDRAW_NOTE,
      reviewedAt: serverTimestamp(),
      withdrawSecret: secret
    })
  }

  /**
   * 站長審核：只能在本機開發環境使用。
   * 前端 SDK 沒有權限修改審核狀態，這裡是呼叫 dev server 上的審核 API（scripts/devProposalReviewApi.js），
   * 由它以 Admin SDK 寫入。正式建置時 import.meta.env.DEV 為 false，這段程式會被移除。
   */
  async review(id, status, note = '') {
    if (import.meta.env.DEV) {
      const res = await fetch('/__dev/skill-proposals/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Ran2-Dev-Review': '1' },
        body: JSON.stringify({ id, status, note })
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) throw new Error(json.error || `審核失敗（HTTP ${res.status}）`)
      return json
    }
    throw new Error('審核只能在本機開發環境進行')
  }
}

// ─────────────────────────────────────────
// 本地模擬（localStorage）
// ─────────────────────────────────────────
export class LocalProposalStore {
  constructor(storage = globalThis.localStorage, key = LOCAL_PROPOSALS_KEY, secretsKey = LOCAL_SECRETS_KEY) {
    this.storage = storage
    this.key = key
    this.secretsKey = secretsKey
  }

  _read() {
    const list = readJson(this.storage, this.key, [])
    return Array.isArray(list) ? list : []
  }

  _write(list) {
    this.storage.setItem(this.key, JSON.stringify(list))
  }

  _secrets() {
    const s = readJson(this.storage, this.secretsKey, {})
    return s && typeof s === 'object' ? s : {}
  }

  /** 依建立時間由新到舊回傳所有提案 */
  list() {
    return this._read().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  }

  isMine(id) {
    return !!this._secrets()[id]
  }

  submit(proposal) {
    assertValid(proposal)
    const saved = { ...proposal, id: genLocalId(), status: 'pending', reviewNote: '', reviewedAt: null, createdAt: Date.now() }
    const list = this._read()
    list.push(saved)
    this._write(list)

    const secrets = this._secrets()
    secrets[saved.id] = genSecret()
    this.storage.setItem(this.secretsKey, JSON.stringify(secrets))
    return saved
  }

  withdraw(id, secret = this._secrets()[id]) {
    const list = this._read()
    const p = list.find(x => x.id === id)
    if (!p) throw new Error('找不到該提案')
    if (!secret || secret !== this._secrets()[id]) throw new Error('只能撤回自己送出的提案')
    if (p.status !== 'pending') throw new Error('只有待審核的提案可以撤回')
    p.status = 'withdrawn'
    p.reviewNote = WITHDRAW_NOTE
    p.reviewedAt = Date.now()
    this._write(list)
    return p
  }

  review(id, status, note = '') {
    if (!PROPOSAL_STATUS[status]) throw new Error(`未知的狀態：${status}`)
    const list = this._read()
    const p = list.find(x => x.id === id)
    if (!p) throw new Error('找不到該提案')
    p.status = status
    p.reviewNote = String(note || '').trim()
    p.reviewedAt = status === 'pending' ? null : Date.now()
    this._write(list)
    return p
  }

  /** 清除所有本地模擬提案 */
  clear() {
    this.storage.removeItem(this.key)
    this.storage.removeItem(this.secretsKey)
  }
}

let defaultStore = null
export const getProposalStore = () => {
  if (!defaultStore) {
    defaultStore = import.meta.env.VITE_PROPOSAL_STORE === 'local'
      ? new LocalProposalStore()
      : new FirestoreProposalStore()
  }
  return defaultStore
}
