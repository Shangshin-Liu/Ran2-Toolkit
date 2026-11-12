import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// 配點模擬：技能列表的「−」「<<」按鈕，以及類型與學習需求的顯示

const mockGetDoc = vi.fn()
const mockGetDocs = vi.fn()

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, name) => ({ type: 'collection', name })),
  doc: vi.fn((_db, col, id) => ({ type: 'doc', col, id })),
  getDoc: (...args) => mockGetDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  setDoc: vi.fn()
}))
vi.mock('@/firebase.js', () => ({ db: {}, messaging: null }))
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() })
}))
vi.mock('@/composables/useTour.js', () => ({ useTour: () => ({ startTour: vi.fn() }) }))

import Simulator from '@/views/Simulator.vue'

const mk = (id, name, prereq) => ({
  skill_group_id: id,
  name,
  degree: 1,
  initial_level: 1,
  type: '主動',
  equipment_required: null,
  description: `${name} 的說明`,
  icon: null,
  animation: null,
  id,
  levels: Array.from({ length: 9 }, (_, i) => i + 1).map(lv => ({
    instance_id: `${id}_lv${lv}`,
    skill_level: lv,
    learn_condition: {
      character_level: lv * 5,
      point_required: 1,
      prerequisite: prereq ? { skill_name: prereq[0], required_skill_level: prereq[1] } : null
    },
    base_stats: { hp_change: lv },
    special_effects: [],
    cost: { mp: 1, sp: 0 },
    id: `${id}_lv${lv}`
  }))
})

// 與實際弓箭部迅捷系相同的前置關係
const NAMES = ['閃電之擊', '迴避提升', '流星守護', '迴避驟升', '幻影飄移']
const tree = {
  id: 'archer_swift',
  job: '弓箭部',
  skill_tree: '迅捷',
  require_stat_type: '敏捷',
  skills: [
    mk('s1', '閃電之擊'),
    mk('s2', '迴避提升', ['閃電之擊', 3]),
    mk('s3', '流星守護', ['閃電之擊', 4]),
    mk('s4', '迴避驟升', ['迴避提升', 3]),
    mk('s5', '幻影飄移', ['流星守護', 3])
  ]
}

const setup = () => {
  localStorage.clear()
  mockGetDoc.mockReset()
  mockGetDocs.mockReset()
  mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ lastUpdated: 1 }) })
  mockGetDocs.mockResolvedValue({ forEach: (cb) => [tree].forEach(t => cb({ data: () => JSON.parse(JSON.stringify(t)) })) })
  vi.stubGlobal('confirm', vi.fn(() => true))
}

const mountSim = async () => {
  const wrapper = mount(Simulator, { global: { stubs: { teleport: true, LoadingOverlay: true } } })
  await flushPromises()
  const row = (name) => wrapper.findAll('.skill-row').find(w => w.find('.skill-name').text().startsWith(name))
  const click = async (name, cls, times = 1) => {
    for (let i = 0; i < times; i++) {
      await row(name).find(cls).trigger('click')
      await flushPromises()
    }
  }
  const levels = () => NAMES.map(n => row(n).find('.level-num').text()).join(',')
  return { wrapper, row, click, levels }
}

// 閃電之擊手動點到 Lv9 → 學迴避驟升（自動學迴避提升 Lv3）→ 學幻影飄移（自動學流星守護 Lv3）
const learnScenario = async (click) => {
  await click('閃電之擊', '.btn-plus', 9)
  await click('迴避驟升', '.btn-plus')
  await click('幻影飄移', '.btn-plus')
}

describe('Simulator 技能列表「<<」取消學習並回退前置', () => {
  beforeEach(setup)

  it('取消迴避驟升：迴避提升一併取消，閃電之擊降到流星守護要求的 Lv4', async () => {
    const { click, levels } = await mountSim()
    await learnScenario(click)
    expect(levels()).toBe('MAX,3,3,1,1')

    await click('迴避驟升', '.btn-cancel-chain')
    expect(levels()).toBe('4,0,3,0,1')

    const msg = globalThis.confirm.mock.calls.at(-1)[0]
    expect(msg).toContain('此按鈕會取消此技能學習，並連同和此技能相關的前置一併回退學習狀態')
    expect(msg).toContain('迴避驟升 (Lv 1 → 未習得)')
    expect(msg).toContain('迴避提升 (Lv 3 → 未習得)')
    expect(msg).toContain('閃電之擊 (Lv 9 → Lv 4)')
    expect(msg).not.toContain('流星守護')
  })

  it('沒有其他技能需要時，前置全部取消；仰賴此技能的延伸技能也一併取消', async () => {
    const { click, levels } = await mountSim()
    await learnScenario(click)
    await click('迴避驟升', '.btn-cancel-chain') // 4,0,3,0,1
    await click('流星守護', '.btn-cancel-chain') // 流星守護、幻影飄移取消，閃電之擊無人需要 → 0
    expect(levels()).toBe('0,0,0,0,0')
  })

  it('提示視窗按取消時不變更；未學習的技能不能按', async () => {
    const { click, levels, row } = await mountSim()
    await learnScenario(click)
    globalThis.confirm.mockReturnValue(false)
    await click('迴避驟升', '.btn-cancel-chain')
    expect(levels()).toBe('MAX,3,3,1,1')
    await click('迴避驟升', '.btn-minus')
    expect(row('迴避驟升').find('.btn-cancel-chain').attributes('disabled')).toBeDefined()
  })

  it('「−」維持單純降低一級，不會回退前置', async () => {
    const { click, levels } = await mountSim()
    await learnScenario(click)
    await click('迴避驟升', '.btn-minus')
    expect(levels()).toBe('MAX,3,3,0,1')
    await click('閃電之擊', '.btn-minus')
    expect(levels()).toBe('8,3,3,0,1')
  })
})

describe('Simulator 技能詳細頁顯示', () => {
  beforeEach(setup)

  it('類型顯示在技能級別上方；未學習時顯示「學習需要」，學習後顯示「下一級」', async () => {
    const { wrapper, click } = await mountSim()
    const items = () => wrapper.findAll('.unlock-row .unlock-item').map(w => w.text().replace(/\s+/g, ''))
    expect(items()[0]).toContain('類型：主動')
    expect(items()[1]).toContain('技能級別')
    expect(wrapper.find('.detail-actions-row .type-badge').exists()).toBe(false)

    const unlearned = wrapper.find('.unlock-row').text()
    expect(unlearned).toContain('學習需要Lv.5')
    expect(unlearned).toContain('學習需要1點')
    expect(unlearned).not.toContain('下一級')

    await click('閃電之擊', '.btn-plus')
    const learned = wrapper.find('.unlock-row').text()
    expect(learned).toContain('下一級Lv.10')
    expect(learned).toContain('下一級需要1點')
    expect(learned).not.toContain('學習需要')
  })
})
