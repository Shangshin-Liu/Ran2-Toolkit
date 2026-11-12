import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'

// skillProposalService 會載入 Firestore 版本的 store；這份測試只用本地版本，Firebase 以空殼取代
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(), doc: vi.fn(), getDocs: vi.fn(), query: vi.fn(), orderBy: vi.fn(), limit: vi.fn(),
  writeBatch: vi.fn(), updateDoc: vi.fn(), serverTimestamp: vi.fn()
}))
vi.mock('@/firebase.js', () => ({ db: {}, messaging: null }))

import { formatEffect, formatCostRows, CUSTOM_EFFECT_ICON } from '@/utils/skillEffects.js'
import {
  levelToDraft,
  draftToLevel,
  getLevelSnapshot,
  propagateLevelChanges,
  buildProposal,
  validateProposal,
  applyProposal,
  applyAcceptedProposals,
  checkStale,
  describeChanges,
  isSame
} from '@/utils/skillProposal.js'
import { LocalProposalStore } from '@/services/skillProposalService.js'
import SkillProposalModal from '@/components/SkillProposalModal.vue'
import ProposalReviewPanel from '@/components/ProposalReviewPanel.vue'

const allTrees = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../backups/ran2_all_skills.json'), 'utf8'))
const allLevels = allTrees.flatMap(t => t.skills.flatMap(s => s.levels))

// 改版前 Simulator.vue 的特殊效果顯示邏輯，用來確認重構後輸出完全一致
const legacyFormat = (eff) => {
  let text = ''
  let icon = ''
  if (eff.effect_type === '拉/推') {
    text = `拉/推 ${eff.probability * 100}% 距離 ${eff.distance}`; icon = '⚡'
  } else if (eff.effect_type === '移動速度') {
    const probStr = eff.probability !== undefined ? ` 發動率 ${eff.probability * 100}%` : ''
    text = `移動速度 ${eff.speed_rate > 0 ? '+' : ''}${eff.speed_rate * 100}%${probStr}`; icon = '🏃'
  } else if (eff.effect_type === '中毒') {
    text = `中毒 ${eff.probability * 100}% 傷害 ${eff.continuous_hit}/tick`; icon = '🤢'
  } else if (eff.effect_type === '燃燒') {
    text = `燃燒 ${eff.probability * 100}% 傷害 ${eff.continuous_hit}/tick`; icon = '🔥'
  } else if (eff.effect_type === '攻擊速度') {
    const probStr = eff.probability !== undefined ? ` 發動率 ${eff.probability * 100}%` : ''
    const speedStr = eff.speed_rate !== undefined ? ` 減速 ${eff.speed_rate * 100}%` : ''
    text = `攻擊速度 ${eff.attack_speed_rate}${probStr}${speedStr}`; icon = '⚔️'
  } else if (eff.effect_type === '冰凍') {
    text = `冰凍 ${eff.probability * 100}% 減速 ${eff.freeze_speed_rate} 傷害加成 ${eff.hit_bonus_rate}`; icon = '❄️'
  } else if (eff.effect_type === '昏厥') {
    text = `昏厥 ${eff.probability * 100}%`; icon = '💫'
  } else if (eff.effect_type === '貫穿程度') {
    text = `貫穿 ${eff.penetrate_value} 目標`; icon = '🏹'
  } else if (eff.effect_type === '防止狀態異常') {
    text = `免疫：${(eff.immune_states || []).join('、')}`; icon = '🛡️'
  }
  return { text, icon }
}

const AUTHOR = { charId: '測試角色' }

const makeStorage = () => {
  const m = new Map()
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k)
  }
}

const sampleTree = () => ({
  id: 'test_tree',
  job: '格鬥部',
  skill_tree: '共通',
  skills: [{
    skill_group_id: 'test_001',
    name: '測試技能',
    type: '主動',
    description: '原本的說明',
    levels: [1, 2, 3].map(lv => ({
      instance_id: `test_001_lv${lv}`,
      skill_level: lv,
      learn_condition: { character_level: lv * 2, point_required: 0, prerequisite: null },
      base_stats: { hp_change: lv * 10, delay_time: 5, defense_rate_change: '-50%' },
      special_effects: [{ effect_type: '昏厥', probability: 0.1 }],
      cost: { mp: 10, sp: 0 },
      id: `test_001_lv${lv}`
    }))
  }]
})

describe('skillEffects', () => {
  it('既有資料中所有特殊效果的顯示文字與改版前完全一致', () => {
    let count = 0
    allLevels.forEach(l => l.special_effects.forEach(eff => {
      expect(formatEffect(eff)).toEqual(legacyFormat(eff))
      count++
    }))
    expect(count).toBeGreaterThan(3000)
  })

  it('未知類型以通用格式顯示，不再是空白', () => {
    const r = formatEffect({ effect_type: '錯亂', probability: 0.2, duration: 3 })
    expect(r.icon).toBe(CUSTOM_EFFECT_ICON)
    expect(r.text).toBe('錯亂（probability: 0.2，duration: 3）')
  })

  it('cost 缺少欄位時不報錯，並列出 other 道具', () => {
    expect(formatCostRows({ sp: 5 })).toEqual([
      { key: 'mp', label: 'MP 消耗', value: '0' },
      { key: 'sp', label: 'SP 消耗', value: '5' }
    ])
    const rows = formatCostRows({ mp: 10, sp: 0, other: [{ item: '符咒', amount: 2 }] })
    expect(rows[2]).toEqual({ key: 'other_0', label: '符咒 消耗', value: '2' })
  })
})

describe('表單草稿轉換', () => {
  it('所有既有等級資料轉成草稿再轉回來，內容不變', () => {
    allLevels.forEach(l => {
      const { value, errors } = draftToLevel(levelToDraft(l))
      expect(errors).toEqual([])
      expect(isSame(value, getLevelSnapshot(l))).toBe(true)
    })
  })

  it('格式錯誤時回傳錯誤訊息', () => {
    const draft = levelToDraft(sampleTree().skills[0].levels[0])
    draft.base_stats.find(r => r.key === 'defense_rate_change').value = '五十'
    draft.special_effects[0].params[0].value = ''
    draft.cost.other.push({ item: '符咒', amount: '0' })
    const { errors } = draftToLevel(draft)
    expect(errors).toHaveLength(3)
  })

  it('自訂效果類型與參數', () => {
    const draft = levelToDraft(sampleTree().skills[0].levels[0])
    draft.special_effects.push({ type: '錯亂', isCustom: true, params: [{ key: 'probability', value: '0.3' }, { key: 'note', value: '僅限 PVP' }] })
    const { value, errors } = draftToLevel(draft)
    expect(errors).toEqual([])
    expect(value.special_effects[1]).toEqual({ effect_type: '錯亂', probability: 0.3, note: '僅限 PVP' })
  })

  it('取消勾選消耗會移除 cost', () => {
    const draft = levelToDraft(sampleTree().skills[0].levels[0])
    draft.cost.enabled = false
    expect(draftToLevel(draft).value.cost).toBeNull()
  })
})

describe('套用到其他等級', () => {
  it('只複製有變動的基礎數值，其他等級各自的數值保留', () => {
    const levels = sampleTree().skills[0].levels
    const src = getLevelSnapshot(levels[0])
    const edited = { ...src, base_stats: { ...src.base_stats, delay_time: 3 } }
    const target = propagateLevelChanges(src, edited, getLevelSnapshot(levels[2]))
    expect(target.base_stats).toEqual({ hp_change: 30, delay_time: 3, defense_rate_change: '-50%' })
  })
})

describe('提案建立、驗證與套用', () => {
  const makeProposal = (trees) => {
    const tree = trees[0]
    const skill = tree.skills[0]
    const lv2 = getLevelSnapshot(skill.levels[1])
    lv2.base_stats.delay_time = 3
    lv2.cost = { mp: 10, sp: 0, other: [{ item: '符咒', amount: 1 }] }
    return buildProposal({
      tree,
      skill,
      description: '修正後的說明',
      editedLevels: { 1: getLevelSnapshot(skill.levels[0]), 2: lv2 },
      reason: '遊戲內實測',
      author: { code: 'ABC123', charId: '測試角色' }
    })
  }

  it('只記錄有變動的部分', () => {
    const p = makeProposal([sampleTree()])
    expect(p.levels).toEqual([2])
    expect(Object.keys(p.changes.levels[2])).toEqual(['base_stats', 'cost'])
    expect(p.before.description).toBe('原本的說明')
    expect(validateProposal(p)).toEqual([])
    // 不記錄提案人的識別碼
    expect(JSON.stringify(p)).not.toContain('ABC123')
    expect(p.authorCharId).toBe('測試角色')
  })

  it('拒絕不允許修改的欄位與錯誤格式', () => {
    const p = makeProposal([sampleTree()])
    p.changes.levels[2].learn_condition = { character_level: 1 }
    p.changes.levels[2].base_stats.unknown_key = 1
    const errors = validateProposal(p)
    expect(errors.some(e => e.includes('learn_condition'))).toBe(true)
    expect(errors.some(e => e.includes('unknown_key'))).toBe(true)
  })

  it('套用時不修改原始資料，且只改到可編輯欄位', () => {
    const trees = [sampleTree()]
    const snapshot = JSON.stringify(trees)
    const { trees: out, applied } = applyProposal(trees, makeProposal(trees))
    expect(applied).toBe(true)
    expect(JSON.stringify(trees)).toBe(snapshot)
    const skill = out[0].skills[0]
    expect(skill.description).toBe('修正後的說明')
    expect(skill.levels[1].base_stats.delay_time).toBe(3)
    expect(skill.levels[1].cost.other).toEqual([{ item: '符咒', amount: 1 }])
    expect(skill.levels[1].learn_condition).toEqual(trees[0].skills[0].levels[1].learn_condition)
    expect(skill.levels[0]).toEqual(trees[0].skills[0].levels[0])
  })

  it('只套用已採納的提案，並能偵測原始資料已變動', () => {
    const trees = [sampleTree()]
    const p1 = { ...makeProposal(trees), id: 'a', status: 'accepted', reviewedAt: 1 }
    const p2 = { ...makeProposal(trees), id: 'b', status: 'pending' }
    const { trees: out, appliedIds } = applyAcceptedProposals(trees, [p1, p2])
    expect(appliedIds).toEqual(['a'])
    expect(checkStale(trees, p2)).toEqual([])
    expect(checkStale(out, p2)).toEqual(['技能說明', 'Lv2 基礎數值', 'Lv2 技能消耗'])
  })

  it('產生審核用的差異說明', () => {
    const rows = describeChanges(makeProposal([sampleTree()]))
    expect(rows).toContainEqual({ scope: 'Lv2', label: '冷卻時間', before: '5', after: '3' })
    expect(rows.find(r => r.label === '技能消耗').after).toContain('符咒 消耗 1')
  })
})

describe('LocalProposalStore', () => {
  let store
  beforeEach(() => { store = new LocalProposalStore(makeStorage(), 'k') })

  it('送出、列出、審核與清除', () => {
    const trees = [sampleTree()]
    const skill = trees[0].skills[0]
    const p = buildProposal({ tree: trees[0], skill, description: '新說明', editedLevels: {}, reason: '理由', author: AUTHOR })
    const saved = store.submit(p)
    expect(saved.id).toBeTruthy()
    expect(store.list()).toHaveLength(1)
    store.review(saved.id, 'accepted', '已確認')
    expect(store.list()[0]).toMatchObject({ status: 'accepted', reviewNote: '已確認' })
    store.clear()
    expect(store.list()).toEqual([])
  })

  it('提案人可以撤回自己待審核的提案，其他人不行', () => {
    const storage = makeStorage()
    const mine = new LocalProposalStore(storage, 'k', 's')
    const trees = [sampleTree()]
    const p = buildProposal({ tree: trees[0], skill: trees[0].skills[0], description: '新說明', editedLevels: {}, reason: '理由', author: AUTHOR })
    const saved = mine.submit(p)
    expect(mine.isMine(saved.id)).toBe(true)
    // 送出的提案本身不含撤回密鑰
    expect(JSON.stringify(mine.list()[0])).not.toMatch(/secret/i)

    // 另一個瀏覽器（共用提案資料、但沒有密鑰）
    const otherStorage = makeStorage()
    otherStorage.setItem('k', storage.getItem('k'))
    const other = new LocalProposalStore(otherStorage, 'k', 's')
    expect(other.isMine(saved.id)).toBe(false)
    expect(() => other.withdraw(saved.id)).toThrow('只能撤回自己送出的提案')
    expect(() => other.withdraw(saved.id, 'guess')).toThrow('只能撤回自己送出的提案')

    mine.withdraw(saved.id)
    expect(mine.list()[0].status).toBe('withdrawn')
    expect(() => mine.withdraw(saved.id)).toThrow('只有待審核的提案可以撤回')
  })

  it('狀態只有待審核、已採納、已撤回', () => {
    const trees = [sampleTree()]
    const saved = store.submit(buildProposal({ tree: trees[0], skill: trees[0].skills[0], description: '新說明', editedLevels: {}, reason: '理由', author: AUTHOR }))
    expect(() => store.review(saved.id, 'rejected')).toThrow()
    store.review(saved.id, 'withdrawn', '資料有誤')
    expect(store.list()[0]).toMatchObject({ status: 'withdrawn', reviewNote: '資料有誤' })
  })

  it('未登入（沒有提案人）時不能提案', () => {
    const trees = [sampleTree()]
    const p = buildProposal({ tree: trees[0], skill: trees[0].skills[0], description: '新說明', editedLevels: {}, reason: '理由' })
    expect(validateProposal(p)).toEqual(['請先登入再提出修正提案'])
    expect(() => store.submit(p)).toThrow('請先登入再提出修正提案')
    expect(store.list()).toEqual([])
  })

  it('驗證失敗時不會存入', () => {
    const trees = [sampleTree()]
    const p = buildProposal({ tree: trees[0], skill: trees[0].skills[0], editedLevels: {}, reason: '', author: AUTHOR })
    expect(() => store.submit(p)).toThrow()
    expect(store.list()).toEqual([])
  })
})

describe('SkillProposalModal', () => {
  it('修改數值、加入道具消耗並送出後，提案存入 store', async () => {
    const store = new LocalProposalStore(makeStorage(), 'k')
    const tree = sampleTree()
    const wrapper = mount(SkillProposalModal, {
      props: { show: true, skill: tree.skills[0], tree, initialLevel: 2, author: { code: 'ABC123', charId: '測試角色' }, store },
      global: { stubs: { teleport: true, transition: false } }
    })
    await flushPromises()

    await wrapper.find('[data-test="stat-delay_time"]').setValue('3')
    await wrapper.find('[data-test="cost-add-other"]').trigger('click')
    await wrapper.find('[data-test="cost-item-0"]').setValue('符咒')
    await wrapper.find('[data-test="cost-amount-0"]').setValue('2')

    // 未填理由時不能送出
    await wrapper.find('[data-test="submit"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-test="errors"]').text()).toContain('請填寫修正理由')
    expect(store.list()).toHaveLength(0)

    await wrapper.find('[data-test="reason"]').setValue('遊戲內冷卻時間為 3 秒')
    await wrapper.find('[data-test="submit"]').trigger('click')
    await flushPromises()

    const list = store.list()
    expect(list).toHaveLength(1)
    expect(list[0].levels).toEqual([2])
    expect(list[0].changes.levels[2].base_stats.delay_time).toBe(3)
    expect(list[0].changes.levels[2].cost).toEqual({ mp: 10, sp: 0, other: [{ item: '符咒', amount: 2 }] })
    expect(list[0].authorCharId).toBe('測試角色')
    expect(wrapper.emitted('submitted')).toHaveLength(1)
  })

  it('切換為自訂類型時，不帶入原類型的參數名稱，且沒有佐證連結欄位', async () => {
    const store = new LocalProposalStore(makeStorage(), 'k')
    const tree = sampleTree()
    const wrapper = mount(SkillProposalModal, {
      props: { show: true, skill: tree.skills[0], tree, initialLevel: 1, author: AUTHOR, store },
      global: { stubs: { teleport: true, transition: false } }
    })
    await flushPromises()
    expect(wrapper.find('[data-test="evidence"]').exists()).toBe(false)
    expect(document.body.style.overflow).toBe('hidden')

    await wrapper.find('[data-test="effect-type-0"]').setValue('貫穿程度')
    await wrapper.find('[data-test="effect-type-0"]').setValue('__custom__')
    expect(wrapper.find('[data-test="effect-custom-name-0"]').element.value).toBe('')
    expect(wrapper.find('[data-test="effect-0-key-0"]').element.value).toBe('')
    expect(wrapper.html()).not.toContain('penetrate_value')

    await wrapper.find('[data-test="effect-custom-name-0"]').setValue('錯亂')
    await wrapper.find('[data-test="effect-0-key-0"]').setValue('機率')
    await wrapper.find('[data-test="effect-0-param-0"]').setValue('20%')
    await wrapper.find('[data-test="reason"]').setValue('遊戲內顯示會錯亂')
    await wrapper.find('[data-test="submit"]').trigger('click')
    await flushPromises()
    expect(store.list()[0].changes.levels[1].special_effects).toEqual([{ effect_type: '錯亂', '機率': '20%' }])

    wrapper.unmount()
  })

  it('套用到其他等級', async () => {
    const store = new LocalProposalStore(makeStorage(), 'k')
    const tree = sampleTree()
    const wrapper = mount(SkillProposalModal, {
      props: { show: true, skill: tree.skills[0], tree, initialLevel: 1, author: AUTHOR, store },
      global: { stubs: { teleport: true, transition: false } }
    })
    await flushPromises()
    await wrapper.find('[data-test="stat-delay_time"]').setValue('3')
    await wrapper.find('[data-test="propagate"]').trigger('click')
    await wrapper.find('[data-test="reason"]').setValue('全等級冷卻都是 3 秒')
    await wrapper.find('[data-test="submit"]').trigger('click')
    await flushPromises()

    const p = store.list()[0]
    expect(p.levels).toEqual([1, 2, 3])
    expect(p.changes.levels[3].base_stats).toEqual({ hp_change: 30, delay_time: 3, defense_rate_change: '-50%' })
  })
})

describe('ProposalReviewPanel', () => {
  const setup = (canReview) => {
    const store = new LocalProposalStore(makeStorage(), 'k', 's')
    const trees = [sampleTree()]
    const saved = store.submit(buildProposal({
      tree: trees[0], skill: trees[0].skills[0], description: '新說明', editedLevels: {}, reason: '理由說明',
      author: { code: 'ABC123', charId: '測試角色' }
    }))
    const wrapper = mount(ProposalReviewPanel, {
      props: { show: true, canReview, currentTrees: trees, store },
      global: { stubs: { teleport: true, transition: false } }
    })
    return { store, saved, wrapper }
  }

  it('列表預設收合，只顯示技能名稱、部門與提案人', async () => {
    const { saved, wrapper } = setup(true)
    await flushPromises()
    const item = wrapper.find(`[data-test="proposal-${saved.id}"]`)
    expect(item.text()).toContain('測試技能')
    expect(item.text()).toContain('格鬥部・共通')
    expect(item.text()).toContain('測試角色')
    expect(item.find('.sum-time').text()).toMatch(/^\d{1,2}\/\d{1,2} \d{2}:\d{2}$/)
    expect(item.text()).not.toContain('理由說明')
    expect(item.find('table').exists()).toBe(false)

    await wrapper.find(`[data-test="toggle-${saved.id}"]`).trigger('click')
    expect(wrapper.find(`[data-test="proposal-${saved.id}"]`).text()).toContain('理由說明')
    expect(wrapper.find(`[data-test="proposal-${saved.id}"] table`).exists()).toBe(true)
  })

  it('審核模式可以採納', async () => {
    const { store, saved, wrapper } = setup(true)
    await flushPromises()
    await wrapper.find(`[data-test="toggle-${saved.id}"]`).trigger('click')
    // 審核元件為動態載入，等待載入完成
    await vi.waitFor(() => expect(wrapper.find(`[data-test="accept-${saved.id}"]`).exists()).toBe(true))
    expect(wrapper.find(`[data-test="withdraw-${saved.id}"]`).exists()).toBe(false)
    expect(wrapper.text()).not.toContain('ABC123')
    await wrapper.find(`[data-test="accept-${saved.id}"]`).trigger('click')
    await flushPromises()
    expect(store.list()[0].status).toBe('accepted')
    expect(wrapper.emitted('changed')).toHaveLength(1)
  })

  it('非審核模式（正式站）看不到採納按鈕，但可以撤回自己的提案', async () => {
    const { store, saved, wrapper } = setup(false)
    await flushPromises()
    await wrapper.find(`[data-test="toggle-${saved.id}"]`).trigger('click')
    await flushPromises()
    expect(wrapper.find(`[data-test="accept-${saved.id}"]`).exists()).toBe(false)
    expect(wrapper.find(`[data-test="admin-withdraw-${saved.id}"]`).exists()).toBe(false)
    expect(wrapper.find('[data-test="clear-all"]').exists()).toBe(false)

    const btn = wrapper.find(`[data-test="withdraw-${saved.id}"]`)
    await btn.trigger('click') // 第一次：要求確認
    expect(store.list()[0].status).toBe('pending')
    await wrapper.find(`[data-test="withdraw-${saved.id}"]`).trigger('click')
    await flushPromises()
    expect(store.list()[0].status).toBe('withdrawn')
  })
})

describe('ProposalReviewPanel 分頁', () => {
  it('每頁 10 筆，可換頁，切換分類時回到第一頁', async () => {
    const store = new LocalProposalStore(makeStorage(), 'k', 's')
    const trees = [sampleTree()]
    for (let i = 0; i < 12; i++) {
      store.submit(buildProposal({ tree: trees[0], skill: trees[0].skills[0], description: `說明 ${i}`, editedLevels: {}, reason: '理由', author: AUTHOR }))
    }
    const wrapper = mount(ProposalReviewPanel, {
      props: { show: true, canReview: false, currentTrees: trees, store },
      global: { stubs: { teleport: true, transition: false } }
    })
    await flushPromises()
    expect(wrapper.findAll('.review-item')).toHaveLength(10)
    expect(wrapper.find('[data-test="page-info"]').text()).toBe('1 / 2')
    expect(wrapper.find('[data-test="page-prev"]').attributes('disabled')).toBeDefined()

    await wrapper.find('[data-test="page-next"]').trigger('click')
    expect(wrapper.findAll('.review-item')).toHaveLength(2)
    expect(wrapper.find('[data-test="page-next"]').attributes('disabled')).toBeDefined()

    await wrapper.find('[data-test="tab-all"]').trigger('click')
    expect(wrapper.find('[data-test="page-info"]').text()).toBe('1 / 2')

    // 沒有資料時分頁列仍然存在（視窗大小固定）
    await wrapper.find('[data-test="tab-accepted"]').trigger('click')
    expect(wrapper.findAll('.review-item')).toHaveLength(0)
    expect(wrapper.find('[data-test="page-info"]').text()).toBe('1 / 1')
    wrapper.unmount()
  })
})
