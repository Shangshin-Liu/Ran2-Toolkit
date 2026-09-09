import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  useParty, 
  MAX_PARTY_MEMBERS, 
  getEffectiveStatus, 
  getMemberCount, 
  isPartyJoined 
} from '@/composables/useParty.js'

vi.mock('@/firebase', () => ({
  db: {},
  messaging: {}
}))

const mockUpdateDoc = vi.fn()
const mockSetDoc = vi.fn()
const mockDeleteDoc = vi.fn()

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((db, col, id) => ({ path: `${col}/${id}`, id })),
  updateDoc: (...args) => mockUpdateDoc(...args),
  setDoc: (...args) => mockSetDoc(...args),
  deleteDoc: (...args) => mockDeleteDoc(...args),
  arrayUnion: vi.fn(val => val),
  arrayRemove: vi.fn(val => val),
  increment: vi.fn(val => val)
}))

vi.mock('firebase/messaging', () => ({
  getToken: vi.fn(() => Promise.resolve('mock-fcm-token'))
}))

describe('useParty 工具函式與邏輯測試', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
  })

  describe('MAX_PARTY_MEMBERS 常數', () => {
    it('組隊人數上限必須為 8 人', () => {
      expect(MAX_PARTY_MEMBERS).toBe(8)
    })
  })

  describe('getEffectiveStatus (動態推算狀態)', () => {
    it('當 party 為空時應回傳空字串', () => {
      expect(getEffectiveStatus(null)).toBe('')
    })

    it('若 party 狀態已被關閉或已結束，應維持原狀態不變', () => {
      expect(getEffectiveStatus({ status: '已關閉', startTime: 1000, endTime: 2000 })).toBe('已關閉')
      expect(getEffectiveStatus({ status: '已結束', startTime: 1000, endTime: 2000 })).toBe('已結束')
    })

    it('當前時間超過 endTime 時，應動態回傳「已結束」', () => {
      const pastParty = {
        status: '招募中',
        startTime: Date.now() - 7200000,
        endTime: Date.now() - 3600000
      }
      expect(getEffectiveStatus(pastParty)).toBe('已結束')
    })

    it('當前時間介於 startTime 與 endTime 之間時，應動態回傳「進行中」', () => {
      const activeParty = {
        status: '招募中',
        startTime: Date.now() - 1000,
        endTime: Date.now() + 3600000
      }
      expect(getEffectiveStatus(activeParty)).toBe('進行中')
    })

    it('當前時間尚未到達 startTime 時，應維持原生狀態「招募中」', () => {
      const futureParty = {
        status: '招募中',
        startTime: Date.now() + 3600000,
        endTime: Date.now() + 7200000
      }
      expect(getEffectiveStatus(futureParty)).toBe('招募中')
    })
  })

  describe('getMemberCount (成員計數去雙軌化)', () => {
    it('優先返回 memberCharIds 陣列長度', () => {
      const party = {
        memberCharIds: ['劍客A', '弓箭手B'],
        expectedCount: 5
      }
      expect(getMemberCount(party)).toBe(2)
    })

    it('當 memberCharIds 不存在時 fallback 至 expectedCount', () => {
      const legacyParty = {
        expectedCount: 3
      }
      expect(getMemberCount(legacyParty)).toBe(3)
    })

    it('party 為 null 時回傳 0', () => {
      expect(getMemberCount(null)).toBe(0)
    })
  })

  describe('isPartyJoined (判斷是否在團中)', () => {
    it('當角色在 memberCharIds 中時應回傳 true', () => {
      const party = { memberCharIds: ['角色A', '角色B'] }
      const currentUser = { charId: '角色A' }
      expect(isPartyJoined(party, currentUser)).toBe(true)
    })

    it('當角色不在 memberCharIds 中時應回傳 false', () => {
      const party = { memberCharIds: ['角色A', '角色B'] }
      const currentUser = { charId: '角色C' }
      expect(isPartyJoined(party, currentUser)).toBe(false)
    })

    it('當使用者未登入時回傳 false', () => {
      const party = { memberCharIds: ['角色A'] }
      expect(isPartyJoined(party, null)).toBe(false)
    })
  })

  describe('handleToggleSubscribe (加入/退出跟團防護)', () => {
    it('伺服器不匹配時應被攔截，不可跟團', async () => {
      const { handleToggleSubscribe } = useParty()
      const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {})

      const party = {
        id: 'p1',
        server: '新東京',
        status: '招募中',
        startTime: Date.now() + 3600000,
        endTime: Date.now() + 7200000,
        memberCharIds: []
      }
      const currentUser = { server: '新大阪', charId: '玩家1' }

      await handleToggleSubscribe({ party, currentUser })
      expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('伺服器不匹配'))
      expect(mockUpdateDoc).not.toHaveBeenCalled()
    })

    it('發起人不可參加自己發起的招募團', async () => {
      const { handleToggleSubscribe } = useParty()
      const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {})

      const party = {
        id: 'p1',
        server: '新東京',
        leaderId: '團長A',
        status: '招募中',
        startTime: Date.now() + 3600000,
        endTime: Date.now() + 7200000,
        memberCharIds: []
      }
      const currentUser = { server: '新東京', charId: '團長A' }

      await handleToggleSubscribe({ party, currentUser })
      expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('發起人'))
      expect(mockUpdateDoc).not.toHaveBeenCalled()
    })

    it('招募人數已達 8 人上限時，不可再加入', async () => {
      const { handleToggleSubscribe } = useParty()
      const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {})

      const party = {
        id: 'p1',
        server: '新東京',
        leaderId: '團長A',
        status: '招募中',
        startTime: Date.now() + 3600000,
        endTime: Date.now() + 7200000,
        memberCharIds: ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8']
      }
      const currentUser = { server: '新東京', charId: '新人' }

      await handleToggleSubscribe({ party, currentUser })
      expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('名額已滿'))
      expect(mockUpdateDoc).not.toHaveBeenCalled()
    })
  })

  describe('handleCloseParty (軟刪除安全關團)', () => {
    it('成功關閉招募並將狀態設為已關閉', async () => {
      const { handleCloseParty } = useParty()
      mockUpdateDoc.mockResolvedValueOnce({})

      const showToast = vi.fn()
      const success = await handleCloseParty({
        partyId: 'party123',
        closeReason: '發起人手動取消招募',
        showToast
      })

      expect(success).toBe(true)
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'parties/party123' }),
        {
          status: '已關閉',
          closeReason: '發起人手動取消招募'
        }
      )
      expect(showToast).toHaveBeenCalledWith('招募已成功取消關閉！')
    })
  })
})
