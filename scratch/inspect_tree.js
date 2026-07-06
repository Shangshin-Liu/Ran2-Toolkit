import fs from 'fs'
import path from 'path'

const jsonPath = path.resolve(process.cwd(), 'skill-design-meta/ran2_all_skills.json')
const rawData = fs.readFileSync(jsonPath, 'utf8')
const allSkills = JSON.parse(rawData)

const targetSkillId = 'shinbow_str_019'
for (const tree of allSkills) {
  const hasSkill = tree.skills.some(s => s.skill_group_id === targetSkillId)
  if (hasSkill) {
    console.log('找到所屬技能樹資訊：')
    console.log(`Job: ${tree.job}`)
    console.log(`Skill Tree: ${tree.skill_tree}`)
    console.log(`Tree ID / Doc ID: ${tree.id}`)
    console.log(`Keys: ${Object.keys(tree).join(', ')}`)
    break
  }
}
