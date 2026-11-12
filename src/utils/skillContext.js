// 技能脈絡：以某個技能為中心，整理出「前置」與「延伸」的所有技能（純函式）
//
// 技能資料中，每個技能最多只有一個前置技能（learn_condition.prerequisite.skill_name），
// 且前置技能一定在同一棵技能樹內，所以：
//   - 往上（前置）是一條直線
//   - 往下（延伸）是一棵樹，同一層可能有多個技能

const prereqOf = (skill) => skill?.levels?.[0]?.learn_condition?.prerequisite || null

const layerTitle = (direction, distance) => {
  if (direction === 'up') return distance === 1 ? '直接前置技能' : `前置第 ${distance} 層`
  return distance === 1 ? '直接延伸技能' : `延伸第 ${distance} 層`
}

/**
 * @param {object} tree           技能樹（含 skills 陣列）
 * @param {string} skillGroupId   中心技能
 * @param {(id: string) => number} getLevel 取得目前配點等級
 * @returns {null | {
 *   centerNode: object,
 *   upLayers: Array<{ distance: number, title: string, nodes: object[] }>,   // 由最遠的前置排到直接前置
 *   downLayers: Array<{ distance: number, title: string, nodes: object[] }>, // 由直接延伸排到最遠
 *   totalPrereqCount: number,
 *   totalFollowUpCount: number,
 *   isIsolated: boolean
 * }}
 */
export const buildSkillContext = (tree, skillGroupId, getLevel = () => 0) => {
  const skills = tree?.skills || []
  const center = skills.find(s => s.skill_group_id === skillGroupId)
  if (!center) return null

  const byName = new Map()
  skills.forEach(s => { if (!byName.has(s.name)) byName.set(s.name, s) })

  const childrenOf = new Map()
  skills.forEach(s => {
    const p = prereqOf(s)
    if (!p?.skill_name) return
    if (!childrenOf.has(p.skill_name)) childrenOf.set(p.skill_name, [])
    childrenOf.get(p.skill_name).push(s)
  })

  const toNode = (skill) => {
    const currentLevel = getLevel(skill.skill_group_id) || 0
    const maxLevel = skill.levels.length
    const prereq = prereqOf(skill)
    const parent = prereq?.skill_name ? byName.get(prereq.skill_name) : null
    const parentLevel = parent ? (getLevel(parent.skill_group_id) || 0) : 0
    const isUnlocked = !prereq?.skill_name || parentLevel >= prereq.required_skill_level

    let status = 'locked'
    let statusLabel = '未解鎖'
    if (currentLevel > 0) {
      status = 'learned'
      statusLabel = currentLevel === maxLevel ? '已學 MAX' : `已學 Lv.${currentLevel}`
    } else if (isUnlocked) {
      status = 'available'
      statusLabel = '可學習'
    }

    return {
      id: skill.skill_group_id,
      name: skill.name,
      icon: skill.icon || '',
      type: skill.type,
      currentLevel,
      maxLevel,
      status,
      statusLabel,
      requirementText: prereq?.skill_name ? `需 ${prereq.skill_name} Lv.${prereq.required_skill_level}` : '無前置需求'
    }
  }

  // 往上：沿著前置一路找到最源頭
  const ancestors = []
  const seen = new Set([center.name])
  let cursor = center
  while (true) {
    const p = prereqOf(cursor)
    const parent = p?.skill_name ? byName.get(p.skill_name) : null
    if (!parent || seen.has(parent.name)) break
    seen.add(parent.name)
    ancestors.push(parent)
    cursor = parent
  }
  const upLayers = ancestors
    .map((skill, idx) => ({ distance: idx + 1, title: layerTitle('up', idx + 1), nodes: [toNode(skill)] }))
    .reverse()

  // 往下：逐層展開所有延伸技能
  const downLayers = []
  const visited = new Set([center.name])
  let frontier = [center]
  while (frontier.length > 0) {
    const next = []
    frontier.forEach(s => {
      ;(childrenOf.get(s.name) || []).forEach(child => {
        if (visited.has(child.name)) return
        visited.add(child.name)
        next.push(child)
      })
    })
    if (next.length === 0) break
    const distance = downLayers.length + 1
    downLayers.push({ distance, title: layerTitle('down', distance), nodes: next.map(toNode) })
    frontier = next
  }

  const totalPrereqCount = ancestors.length
  const totalFollowUpCount = downLayers.reduce((sum, l) => sum + l.nodes.length, 0)

  return {
    centerNode: toNode(center),
    upLayers,
    downLayers,
    totalPrereqCount,
    totalFollowUpCount,
    isIsolated: totalPrereqCount === 0 && totalFollowUpCount === 0
  }
}
