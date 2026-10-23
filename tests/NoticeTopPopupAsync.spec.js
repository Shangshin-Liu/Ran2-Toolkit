import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'

// 模擬正式站行為：onSnapshot 不會同步回傳資料，而是稍後才觸發 callback
let emitSnapshot = null
let emitError = null

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({}))
}))

vi.mock('@/firebase.js', () => ({
  db: {}
}))

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  onSnapshot: vi.fn((ref, callback, onError) => {
    emitSnapshot = (list) => {
      const docs = list.map(item => ({ id: item.id, data: () => ({ ...item }) }))
      callback({ forEach: (cb) => docs.forEach(cb) })
    }
    emitError = onError
    return () => {}
  }),
  addDoc: vi.fn(async () => ({ id: 'new-id' }))
}))

const topNotice = {
  id: 'async-top-1', type: '公告消息', top: true, title: '非同步置頂公告',
  createdAt: '2026-10-20T10:00:00Z', updatedAt: '2026-10-20T10:00:00Z'
}

describe('置頂公告彈窗：公告非同步載入 (正式站情境)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
    emitSnapshot = null
    emitError = null
  })

  it('公告尚未載入時呼叫 checkAndShowTopNotices，應於首次載入完成後才彈出', async () => {
    const { useNotice } = await import('../src/composables/useNotice.js')
    const { showTopNoticePopup, isLoadingNotices, checkAndShowTopNotices } = useNotice()

    expect(isLoadingNotices.value).toBe(true)
    checkAndShowTopNotices()
    expect(showTopNoticePopup.value).toBe(false)

    emitSnapshot([topNotice])
    await nextTick()
    expect(showTopNoticePopup.value).toBe(true)
  })

  it('重複呼叫只會註冊一次等待，關閉後後續快照更新不會再次彈出', async () => {
    const { useNotice } = await import('../src/composables/useNotice.js')
    const { showTopNoticePopup, checkAndShowTopNotices, closeTopNoticePopup } = useNotice()

    checkAndShowTopNotices()
    checkAndShowTopNotices()
    emitSnapshot([topNotice])
    await nextTick()
    expect(showTopNoticePopup.value).toBe(true)

    closeTopNoticePopup()
    emitSnapshot([topNotice, { ...topNotice, id: 'async-top-2' }])
    await nextTick()
    expect(showTopNoticePopup.value).toBe(false)
  })

  it('已忽略的置頂公告在非同步載入後不應彈出', async () => {
    localStorage.setItem('ran2_dismissed_top_ids', JSON.stringify(['async-top-1']))
    const { useNotice } = await import('../src/composables/useNotice.js')
    const { showTopNoticePopup, checkAndShowTopNotices } = useNotice()

    checkAndShowTopNotices()
    emitSnapshot([topNotice])
    await nextTick()
    expect(showTopNoticePopup.value).toBe(false)
  })

  it('載入失敗時不應彈出，也不應拋出錯誤', async () => {
    const { useNotice } = await import('../src/composables/useNotice.js')
    const { showTopNoticePopup, isLoadingNotices, checkAndShowTopNotices } = useNotice()

    checkAndShowTopNotices()
    emitError(new Error('permission-denied'))
    await nextTick()
    expect(isLoadingNotices.value).toBe(false)
    expect(showTopNoticePopup.value).toBe(false)
  })
})
