import { describe, it, expect, beforeEach, vi } from 'vitest'
import { formatYYMMDDHH, sortNotices, useNotice, TOP_NOTICE_DISMISSED_KEY } from '../src/composables/useNotice.js'

// 測試用公告數據清單
const testNoticesList = [
  { id: 'notice-1', type: '公告消息', top: true, title: '置頂消息1', createdAt: '2026-08-16T14:30:00Z', updatedAt: '2026-08-16T14:30:00Z' },
  { id: 'notice-2', type: '更新歷程', top: true, title: '置頂消息2', createdAt: '2026-08-15T10:00:00Z', updatedAt: '2026-08-15T10:00:00Z' },
  { id: 'notice-3', type: '公告消息', top: false, title: '一般消息1', createdAt: '2026-08-14T12:00:00Z', updatedAt: '2026-08-14T12:00:00Z' },
  { id: 'notice-4', type: '更新歷程', top: false, title: '一般消息2', createdAt: '2026-08-13T09:00:00Z', updatedAt: '2026-08-13T09:00:00Z' }
]

// Mock firebase
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({}))
}))

vi.mock('@/firebase.js', () => ({
  db: {}
}))

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  onSnapshot: vi.fn((ref, callback) => {
    const docs = testNoticesList.map(item => ({
      id: item.id,
      data: () => ({ ...item })
    }))
    callback({
      forEach: (cb) => docs.forEach(cb)
    })
    return () => {}
  }),
  addDoc: vi.fn(async () => ({ id: 'new-id' }))
}))

describe('Notice System Unit Tests (公告系統單元測試)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('時間格式化 (formatYYMMDDHH)', () => {
    it('應正確將日期字串格式化為 YYMMDDHH 格式', () => {
      const testDate = new Date(2026, 7, 16, 14, 32, 55) // 月份由 0 開始，7 代表 8 月
      const formatted = formatYYMMDDHH(testDate)
      expect(formatted).toBe('26081614')
    })

    it('傳入無效日期應傳回空字串', () => {
      expect(formatYYMMDDHH('')).toBe('')
      expect(formatYYMMDDHH('invalid-date')).toBe('')
      expect(formatYYMMDDHH(null)).toBe('')
    })
  })

  describe('排序邏輯 (sortNotices)', () => {
    it('置頂 (top: true) 應排在最前面', () => {
      const sorted = sortNotices(testNoticesList)
      expect(sorted[0].top).toBe(true)
      expect(sorted[1].top).toBe(true)
    })

    it('同為置頂或非置頂時，應按 createdAt 由新到舊排序', () => {
      const sorted = sortNotices(testNoticesList)
      const nonTopNotices = sorted.filter(n => !n.top)
      
      for (let i = 0; i < nonTopNotices.length - 1; i++) {
        const timeCurrent = new Date(nonTopNotices[i].createdAt).getTime()
        const timeNext = new Date(nonTopNotices[i + 1].createdAt).getTime()
        expect(timeCurrent).toBeGreaterThanOrEqual(timeNext)
      }
    })
  })

  describe('Composable 與 Firestore 載入邏輯 (useNotice)', () => {
    it('應正確載入並按類別過濾資料', () => {
      const { setTab, paginatedNotices, filteredNotices, notices } = useNotice()
      expect(notices.value.length).toBe(4)

      setTab('公告消息')
      expect(filteredNotices.value.length).toBe(2)

      setTab('更新歷程')
      expect(filteredNotices.value.length).toBe(2)
    })
  })

  describe('LocalStorage 置頂公告記憶檢查 (方案 1)', () => {
    it('若 localStorage 尚未紀錄時，checkAndShowTopNotices 應開啟彈窗', () => {
      const { showTopNoticePopup, checkAndShowTopNotices } = useNotice()
      showTopNoticePopup.value = false
      checkAndShowTopNotices()
      expect(showTopNoticePopup.value).toBe(true)
    })

    it('點擊 dismissTopNoticePermanently 應寫入已讀文章 ID 陣列至 localStorage 並且關閉彈窗', () => {
      const { showTopNoticePopup, dismissTopNoticePermanently, checkAndShowTopNotices } = useNotice()
      dismissTopNoticePermanently()

      const savedIds = JSON.parse(localStorage.getItem(TOP_NOTICE_DISMISSED_KEY))
      expect(Array.isArray(savedIds)).toBe(true)
      expect(savedIds.length).toBeGreaterThan(0)
      expect(showTopNoticePopup.value).toBe(false)

      // 再次檢查時（因為無全新未讀置頂）不應彈出
      checkAndShowTopNotices()
      expect(showTopNoticePopup.value).toBe(false)
    })

    it('當發布全新置頂公告 (ID 不在已讀清單) 時，應能再次自動觸發彈窗', () => {
      const { showTopNoticePopup, dismissTopNoticePermanently, checkAndShowTopNotices, notices } = useNotice()
      dismissTopNoticePermanently()
      expect(showTopNoticePopup.value).toBe(false)

      // 模擬新增一筆全新的 top=true 文章
      notices.value.unshift({
        id: 'notice-new-099',
        type: '公告消息',
        top: true,
        title: '全新緊急置頂公告',
        content: '這是新的置頂內容',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      // 重新檢查，應自動再跳出彈窗！
      checkAndShowTopNotices()
      expect(showTopNoticePopup.value).toBe(true)
    })
  })
})
