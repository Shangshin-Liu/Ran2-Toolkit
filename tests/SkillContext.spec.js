import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import { buildSkillContext } from '@/utils/skillContext.js'
import SkillContextModal from '@/components/SkillContextModal.vue'

const allTrees = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../backups/ran2_all_skills.json'), 'utf8'))

const mk = (id, name, prereq) => ({
  skill_group_id: id,
  name,
  type: '主動',
  icon: null,
  levels: [1, 2, 3].map(lv => ({
    skill_level: lv,
    learn_condition: { character_level: lv, point_required: 0, prerequisite: prereq ? { skill_name: prereq[0], required_skill_level: prereq[1] } : null }
  }))
})

// A → B → C、B → D、C → E；F 獨立
const tree = {
  id: 't',
  skills: [mk('a', 'A'), mk('b', 'B', ['A', 2]), mk('c', 'C', ['B', 1]), mk('d', 'D', ['B', 3]), mk('e', 'E', ['C', 1]), mk('f', 'F')]
}

describe('buildSkillContext', () => {
  it('列出所有前置（由源頭到直接前置）與所有延伸（逐層）', () => {
    const ctx = buildSkillContext(tree, 'b')
    expect(ctx.upLayers.map(l => l.nodes.map(n => n.name))).toEqual([['A']])
    expect(ctx.downLayers.map(l => l.nodes.map(n => n.name))).toEqual([['C', 'D'], ['E']])
    expect(ctx.downLayers.map(l => l.title)).toEqual(['直接延伸技能', '延伸第 2 層'])
    expect(ctx.totalPrereqCount).toBe(1)
    expect(ctx.totalFollowUpCount).toBe(3)

    const deep = buildSkillContext(tree, 'e')
    expect(deep.upLayers.map(l => l.nodes[0].name)).toEqual(['A', 'B', 'C'])
    expect(deep.upLayers.map(l => l.title)).toEqual(['前置第 3 層', '前置第 2 層', '直接前置技能'])
    expect(deep.downLayers).toEqual([])
  })

  it('沒有前置與延伸的技能標示為獨立', () => {
    expect(buildSkillContext(tree, 'f').isIsolated).toBe(true)
    expect(buildSkillContext(tree, 'zzz')).toBeNull()
  })

  it('依目前配點計算狀態', () => {
    const levels = { a: 2, b: 1 }
    const ctx = buildSkillContext(tree, 'b', id => levels[id] || 0)
    expect(ctx.upLayers[0].nodes[0]).toMatchObject({ status: 'learned', statusLabel: '已學 Lv.2', requirementText: '無前置需求' })
    expect(ctx.centerNode).toMatchObject({ status: 'learned', requirementText: '需 A Lv.2' })
    const [c, d] = ctx.downLayers[0].nodes
    expect(c).toMatchObject({ status: 'available', statusLabel: '可學習' })
    expect(d).toMatchObject({ status: 'locked', statusLabel: '未解鎖', requirementText: '需 B Lv.3' })
  })

  it('實際資料：每個技能的前置＋自己＋延伸都落在同一棵樹內且不重複', () => {
    allTrees.forEach(t => {
      t.skills.forEach(s => {
        const ctx = buildSkillContext(t, s.skill_group_id)
        const ids = [
          ...ctx.upLayers.flatMap(l => l.nodes.map(n => n.id)),
          ctx.centerNode.id,
          ...ctx.downLayers.flatMap(l => l.nodes.map(n => n.id))
        ]
        expect(new Set(ids).size).toBe(ids.length)
        const hasPrereq = !!s.levels[0].learn_condition.prerequisite
        expect(ctx.upLayers.length > 0).toBe(hasPrereq)
      })
    })
    const power = allTrees.find(t => t.id === 'archer_power')
    const root = power.skills.find(s => s.name === '凝聚射擊')
    expect(buildSkillContext(power, root.skill_group_id).totalFollowUpCount).toBe(16)
  })
})

describe('SkillContextModal', () => {
  it('點節點可切換中心，並可回到原技能', async () => {
    const wrapper = mount(SkillContextModal, {
      props: { show: true, tree, skillGroupId: 'b' },
      global: { stubs: { teleport: true, transition: false } }
    })
    await flushPromises()
    expect(wrapper.find('[data-test="ctx-center"]').text()).toContain('B')
    expect(wrapper.text()).toContain('前置 1 個 · 延伸 3 個')
    expect(wrapper.find('[data-test="ctx-back"]').exists()).toBe(false)

    await wrapper.find('[data-test="ctx-node-e"]').trigger('click')
    expect(wrapper.find('[data-test="ctx-center"]').text()).toContain('E')
    expect(wrapper.text()).toContain('前置 3 個 · 延伸 0 個')

    await wrapper.find('[data-test="ctx-back"]').trigger('click')
    expect(wrapper.find('[data-test="ctx-center"]').text()).toContain('B')
  })
})
