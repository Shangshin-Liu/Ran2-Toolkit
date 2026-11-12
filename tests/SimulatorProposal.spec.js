import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// 配點模擬整合測試：本地提案採納後，技能詳細面板顯示修訂後的資料
// 全程不呼叫任何 Firestore 寫入函式

const mockGetDoc = vi.fn()
const mockGetDocs = vi.fn()
const mockSetDoc = vi.fn()

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, name) => ({ type: 'collection', name })),
  doc: vi.fn((_db, col, id) => ({ type: 'doc', col, id })),
  getDoc: (...args) => mockGetDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  setDoc: (...args) => mockSetDoc(...args)
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
import { LOCAL_PROPOSALS_KEY } from '@/services/skillProposalService.js'

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
      special_effects: [],
      cost: { mp: 10, sp: 0 },
      id: `archer_swift_001_lv${lv}`
    }))
  }]
}

describe('Simulator 技能修正提案（本地模擬）', () => {
  beforeEach(() => {
    localStorage.clear()
    mockGetDoc.mockReset()
    mockGetDocs.mockReset()
    mockSetDoc.mockReset()
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ lastUpdated: 1 }) })
    mockGetDocs.mockResolvedValue({ forEach: (cb) => [tree].forEach(t => cb({ data: () => JSON.parse(JSON.stringify(t)) })) })
  })

  it('已採納的提案會疊加顯示，但不寫回技能快取', async () => {
    localStorage.setItem(LOCAL_PROPOSALS_KEY, JSON.stringify([{
      id: 'p1',
      skillGroupId: 'archer_swift_001',
      skillName: '冥想',
      status: 'accepted',
      reviewedAt: 1,
      reason: '測試',
      changes: {
        description: '修正後的說明',
        levels: { 1: { cost: { mp: 10, sp: 0, other: [{ item: '符咒', amount: 1 }] }, special_effects: [{ effect_type: '錯亂', probability: 0.2 }] } }
      },
      before: {}
    }]))

    const wrapper = mount(Simulator, {
      global: { stubs: { teleport: true, LoadingOverlay: true } }
    })
    await flushPromises()

    // 選取技能
    const item = wrapper.findAll('.skill-row').find(w => w.text().includes('冥想'))
    if (item) await item.trigger('click')
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('📝 提案修正')
    expect(text).toContain('🛠️ 提案審核')
    expect(text).toContain('社群修訂')
    expect(text).toContain('修正後的說明')
    expect(text).toContain('符咒 消耗')
    expect(text).toContain('錯亂（probability: 0.2）')

    // 快取仍是原始資料
    const cache = JSON.parse(localStorage.getItem('ran2_skills_cache'))
    expect(cache[0].skills[0].description).toBe('原本的說明')
    expect(mockSetDoc).not.toHaveBeenCalled()
  })
})
