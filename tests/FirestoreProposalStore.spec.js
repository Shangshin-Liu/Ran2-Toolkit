import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockGetDocs = vi.fn()
const mockUpdateDoc = vi.fn()
const batch = { set: vi.fn(), commit: vi.fn() }

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, name) => ({ type: 'collection', name })),
  doc: vi.fn((a, col, id) => (a?.type === 'collection' ? { type: 'doc', col: a.name, id: 'NEW_ID' } : { type: 'doc', col, id })),
  getDocs: (...args) => mockGetDocs(...args),
  query: vi.fn((ref, ...constraints) => ({ ...ref, constraints })),
  orderBy: vi.fn((field, dir) => ({ orderBy: field, dir })),
  limit: vi.fn((n) => ({ limit: n })),
  writeBatch: vi.fn(() => batch),
  updateDoc: (...args) => mockUpdateDoc(...args),
  serverTimestamp: vi.fn(() => 'SERVER_TIME')
}))
vi.mock('@/firebase.js', () => ({ db: {}, messaging: null }))

import {
  FirestoreProposalStore,
  PROPOSAL_SECRETS_KEY,
  LAST_SUBMIT_KEY,
  WITHDRAW_NOTE
} from '@/services/skillProposalService.js'

const makeStorage = () => {
  const m = new Map()
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k)
  }
}

const proposal = () => ({
  skillGroupId: 'kakuto_com_001',
  skillName: '冥想',
  treeId: 'kakuto_com',
  job: '格鬥部',
  skillTree: '共通',
  levels: [],
  changes: { description: '新的說明' },
  before: { description: '舊的說明' },
  reason: '遊戲內不同',
  authorCharId: '測試角色',
  status: 'accepted', // 惡意或錯誤的狀態應該被覆蓋
  reviewNote: 'x',
  extraField: 'should be dropped'
})

describe('FirestoreProposalStore', () => {
  let storage
  let store
  beforeEach(() => {
    storage = makeStorage()
    store = new FirestoreProposalStore(storage)
    mockGetDocs.mockReset()
    mockUpdateDoc.mockReset()
    batch.set.mockReset()
    batch.commit.mockReset()
    batch.commit.mockResolvedValue()
    mockUpdateDoc.mockResolvedValue()
  })

  it('送出：提案與撤回密鑰在同一個批次建立，狀態固定為待審核，只寫入白名單欄位', async () => {
    const saved = await store.submit(proposal())
    expect(saved.id).toBe('NEW_ID')
    expect(batch.set).toHaveBeenCalledTimes(2)

    const [ref, data] = batch.set.mock.calls[0]
    expect(ref).toMatchObject({ col: 'skill_proposals', id: 'NEW_ID' })
    expect(Object.keys(data).sort()).toEqual([
      'authorCharId', 'before', 'changes', 'createdAt', 'job', 'levels', 'reason',
      'reviewNote', 'reviewedAt', 'skillGroupId', 'skillName', 'skillTree', 'status', 'treeId'
    ])
    expect(data).toMatchObject({ status: 'pending', reviewNote: '', reviewedAt: null, createdAt: 'SERVER_TIME' })

    const [secretRef, secretData] = batch.set.mock.calls[1]
    expect(secretRef).toMatchObject({ col: 'skill_proposal_secrets', id: 'NEW_ID' })
    expect(secretData.secret).toMatch(/^[0-9a-f]{32}$/)

    expect(JSON.parse(storage.getItem(PROPOSAL_SECRETS_KEY)).NEW_ID).toBe(secretData.secret)
    expect(store.isMine('NEW_ID')).toBe(true)
    expect(JSON.stringify(data)).not.toContain(secretData.secret)
  })

  it('送出失敗時不留下撤回密鑰；驗證失敗時不會連線', async () => {
    batch.commit.mockRejectedValue(Object.assign(new Error('denied'), { code: 'permission-denied' }))
    await expect(store.submit(proposal())).rejects.toThrow('denied')
    expect(store.isMine('NEW_ID')).toBe(false)
    expect(storage.getItem(LAST_SUBMIT_KEY)).toBeNull()

    batch.commit.mockClear()
    await expect(store.submit({ ...proposal(), reason: '' })).rejects.toThrow('請填寫修正理由')
    expect(batch.commit).not.toHaveBeenCalled()
  })

  it('短時間內不能連續送出', async () => {
    await store.submit(proposal())
    await expect(store.submit(proposal())).rejects.toThrow('送出太頻繁')
    expect(batch.commit).toHaveBeenCalledTimes(1)
  })

  it('列表：由新到舊、限制筆數，時間轉成毫秒，並去除撤回密鑰', async () => {
    mockGetDocs.mockResolvedValue({
      forEach: (cb) => [
        { id: 'a', data: () => ({ skillName: '甲', status: 'withdrawn', createdAt: { toMillis: () => 2000 }, reviewedAt: { toMillis: () => 3000 }, withdrawSecret: 'abc' }) },
        { id: 'b', data: () => ({ skillName: '乙', status: 'accepted', createdAt: { toMillis: () => 1000 }, reviewedAt: 1500 }) }
      ].forEach(cb)
    })
    const list = await store.list()
    expect(list).toEqual([
      { id: 'a', skillName: '甲', status: 'withdrawn', createdAt: 2000, reviewedAt: 3000 },
      { id: 'b', skillName: '乙', status: 'accepted', createdAt: 1000, reviewedAt: 1500 }
    ])
    const q = mockGetDocs.mock.calls[0][0]
    expect(q.name).toBe('skill_proposals')
    expect(q.constraints).toEqual([{ orderBy: 'createdAt', dir: 'desc' }, { limit: 200 }])
  })

  it('撤回：附上撤回密鑰；沒有密鑰時不會連線', async () => {
    await expect(store.withdraw('other')).rejects.toThrow('只能撤回自己送出的提案')
    expect(mockUpdateDoc).not.toHaveBeenCalled()

    await store.submit(proposal())
    const secret = JSON.parse(storage.getItem(PROPOSAL_SECRETS_KEY)).NEW_ID
    await store.withdraw('NEW_ID')
    const [ref, data] = mockUpdateDoc.mock.calls[0]
    expect(ref).toMatchObject({ col: 'skill_proposals', id: 'NEW_ID' })
    expect(data).toEqual({ status: 'withdrawn', reviewNote: WITHDRAW_NOTE, reviewedAt: 'SERVER_TIME', withdrawSecret: secret })
  })

  it('審核：呼叫本機審核 API，不直接寫入 Firestore', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ success: true }) }))
    vi.stubGlobal('fetch', fetchMock)
    await store.review('p1', 'accepted', '已確認')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/__dev/skill-proposals/review')
    expect(init.method).toBe('POST')
    expect(init.headers['X-Ran2-Dev-Review']).toBe('1')
    expect(JSON.parse(init.body)).toEqual({ id: 'p1', status: 'accepted', note: '已確認' })
    expect(mockUpdateDoc).not.toHaveBeenCalled()

    fetchMock.mockResolvedValue({ ok: false, status: 409, json: async () => ({ success: false, error: '只有待審核的提案可以採納' }) })
    await expect(store.review('p1', 'accepted')).rejects.toThrow('只有待審核的提案可以採納')
    vi.unstubAllGlobals()
  })
})
