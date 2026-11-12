import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// 配點模擬整合測試：提案功能的入口，以及載入頁面時不會額外讀取提案資料

const mockGetDoc = vi.fn()
const mockGetDocs = vi.fn()
const mockSetDoc = vi.fn()
const mockWriteBatch = vi.fn()
const mockUpdateDoc = vi.fn()

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, name) => ({ type: 'collection', name })),
  doc: vi.fn((_db, col, id) => ({ type: 'doc', col, id })),
  getDoc: (...args) => mockGetDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  setDoc: (...args) => mockSetDoc(...args),
  query: vi.fn((ref) => ref),
  orderBy: vi.fn(),
  limit: vi.fn(),
  writeBatch: (...args) => mockWriteBatch(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  serverTimestamp: vi.fn(() => 'SERVER_TIME')
}))

vi.mock('@/firebase.js', () => ({ db: {}, messaging: null }))

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() })
}))

vi.mock('@/composables/useTour.js', () => ({
  useTour: () => ({ startTour: vi.fn() })
}))

import Simulator from '@/views/Simulator.vue'

const tree = {
  id: 'archer_swift',
  job: '弓箭部',
  skill_tree: '迅捷',
  require_stat_type: '敏捷',
  skills: [{
    skill_group_id: 'archer_swift_001',
    name: '冥想',
    degree: 1,
    initial_level: 1,
    type: '主動',
    equipment_required: null,
    description: '原本的說明',
    icon: null,
    animation: null,
    id: 'archer_swift_001',
    levels: [1, 2].map(lv => ({
      instance_id: `archer_swift_001_lv${lv}`,
      skill_level: lv,
      learn_condition: { character_level: lv, point_required: 0, prerequisite: null },
      base_stats: { hp_change: lv * 2, delay_time: 5 },
      special_effects: [{ effect_type: '錯亂', probability: 0.2 }],
      cost: { mp: 10, sp: 0, other: [{ item: '符咒', amount: 1 }] },
      id: `archer_swift_001_lv${lv}`
    }))
  }]
}

describe('Simulator 技能修正提案', () => {
  beforeEach(() => {
    localStorage.clear()
    mockGetDoc.mockReset()
    mockGetDocs.mockReset()
    mockSetDoc.mockReset()
    mockWriteBatch.mockReset()
    mockUpdateDoc.mockReset()
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ lastUpdated: 1 }) })
    mockGetDocs.mockImplementation(async (ref) => {
      const rows = ref?.name === 'skills' ? [tree] : []
      return { forEach: (cb) => rows.forEach(t => cb({ id: 'x', data: () => JSON.parse(JSON.stringify(t)) })) }
    })
  })

  it('顯示提案入口與技能資料；載入頁面時不讀取提案、不寫入任何資料', async () => {
    const wrapper = mount(Simulator, {
      global: { stubs: { teleport: true, LoadingOverlay: true } }
    })
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('📝 提案修正')
    // 未登入時不能提案
    const proposeBtn = wrapper.find('.btn-proposal')
    expect(proposeBtn.attributes('disabled')).toBeDefined()
    expect(proposeBtn.attributes('title')).toBe('登入後可使用此功能')
    expect(text).toContain('📋 已提案的技能')
    expect(text).toContain('🌳 技能脈絡')
    expect(text).toContain('⚔️ 預覽出招動作')
    expect(text).not.toContain('發動招式')
    expect(text).not.toContain('本地模擬')
    expect(text).not.toContain('社群修訂')
    expect(text).toContain('符咒 消耗')
    expect(text).toContain('錯亂（probability: 0.2）')

    const readCollections = mockGetDocs.mock.calls.map(c => c[0]?.name)
    expect(readCollections).toEqual(['skills'])
    expect(mockSetDoc).not.toHaveBeenCalled()
    expect(mockWriteBatch).not.toHaveBeenCalled()
    expect(mockUpdateDoc).not.toHaveBeenCalled()
  })

  it('開啟「已提案的技能」時才讀取 skill_proposals', async () => {
    const wrapper = mount(Simulator, {
      global: { stubs: { teleport: true, LoadingOverlay: true } }
    })
    await flushPromises()
    await wrapper.find('.btn-review-proposals').trigger('click')
    await flushPromises()
    expect(mockGetDocs.mock.calls.map(c => c[0]?.name)).toEqual(['skills', 'skill_proposals'])
    expect(wrapper.text()).toContain('目前沒有提案')
  })
})
