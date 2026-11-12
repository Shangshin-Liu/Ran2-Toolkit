// 技能資料修正提案的資料存取層
//
// 目前只有「本地模擬」實作：資料存放在瀏覽器 localStorage，不會連線 Firestore。
// 正式上線時，另外實作相同介面的 Firestore 版本替換即可：
//   - submit / withdraw：一般使用者透過前端 SDK 操作，受 firestore.rules 限制
//   - review：只能由站長以 Admin SDK 執行（本機 dev server 或 CLI），前端 SDK 永遠做不到
//
// 權限模型（本地模擬與日後 Firestore 版本相同）：
//   - 任何人都可以送出提案（狀態固定為「待審核」）
//   - 送出時產生一組「撤回密鑰」，只存在提案人的瀏覽器；
//     日後在 Firestore 會存在一個前端讀不到的集合，由 rules 比對
//   - 只有持有密鑰的人能把自己「待審核」的提案改為「已撤回」
//   - 「採納」與站長撤回只能透過 review()，正式站不提供這個入口

import { validateProposal, PROPOSAL_STATUS } from '@/utils/skillProposal.js'

export const LOCAL_PROPOSALS_KEY = 'ran2_dev_skill_proposals'
export const LOCAL_SECRETS_KEY = 'ran2_dev_skill_proposal_secrets'

// 提案功能目前只在本地開發模式（npm run dev）啟用，正式建置不會顯示
export const isSkillProposalEnabled = () => !!import.meta.env.DEV

// 審核功能（採納、站長撤回）只在開發模式提供，正式建置一律關閉。
// 在 dev 模式想預覽一般使用者看到的畫面，可在 .env.local 設定 VITE_HIDE_PROPOSAL_REVIEW=true
export const isProposalReviewEnabled = () =>
  !!import.meta.env.DEV && import.meta.env.VITE_HIDE_PROPOSAL_REVIEW !== 'true'

const genId = () => `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

const genSecret = () => {
  const bytes = new Uint8Array(16)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

export class LocalProposalStore {
  constructor(storage = globalThis.localStorage, key = LOCAL_PROPOSALS_KEY, secretsKey = LOCAL_SECRETS_KEY) {
    this.storage = storage
    this.key = key
    this.secretsKey = secretsKey
  }

  _readJson(key, fallback) {
    try {
      const raw = this.storage.getItem(key)
      return raw ? JSON.parse(raw) : fallback
    } catch {
      return fallback
    }
  }

  _read() {
    const list = this._readJson(this.key, [])
    return Array.isArray(list) ? list : []
  }

  _write(list) {
    this.storage.setItem(this.key, JSON.stringify(list))
  }

  _secrets() {
    const s = this._readJson(this.secretsKey, {})
    return s && typeof s === 'object' ? s : {}
  }

  /** 依建立時間由新到舊回傳所有提案 */
  list() {
    return this._read().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  }

  /** 這份提案是否由目前這個瀏覽器送出（持有撤回密鑰） */
  isMine(id) {
    return !!this._secrets()[id]
  }

  /** 一般使用者：新增提案；驗證失敗時丟出錯誤 */
  submit(proposal) {
    const errors = validateProposal(proposal)
    if (errors.length > 0) {
      const err = new Error(errors.join('\n'))
      err.validationErrors = errors
      throw err
    }
    const saved = { ...proposal, id: genId(), status: 'pending', reviewNote: '', reviewedAt: null, createdAt: Date.now() }
    const list = this._read()
    list.push(saved)
    this._write(list)

    const secrets = this._secrets()
    secrets[saved.id] = genSecret()
    this.storage.setItem(this.secretsKey, JSON.stringify(secrets))
    return saved
  }

  /** 一般使用者：撤回自己「待審核」的提案（需持有撤回密鑰） */
  withdraw(id, secret = this._secrets()[id]) {
    const list = this._read()
    const p = list.find(x => x.id === id)
    if (!p) throw new Error('找不到該提案')
    if (!secret || secret !== this._secrets()[id]) throw new Error('只能撤回自己送出的提案')
    if (p.status !== 'pending') throw new Error('只有待審核的提案可以撤回')
    p.status = 'withdrawn'
    p.reviewNote = '提案人自行撤回'
    p.reviewedAt = Date.now()
    this._write(list)
    return p
  }

  /** 站長審核（僅開發模式使用）：採納、撤回或改回待審核，並記錄備註 */
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
  if (!defaultStore) defaultStore = new LocalProposalStore()
  return defaultStore
}
