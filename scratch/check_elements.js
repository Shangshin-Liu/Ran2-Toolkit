import fs from 'fs';
import path from 'path';

const jsonPath = path.resolve(process.cwd(), 'skill-design-meta/ran2_all_skills.json');
const rawData = fs.readFileSync(jsonPath, 'utf8');
const allSkills = JSON.parse(rawData);

const targetIds = [
  '寒冰刀獄', '奧義：寒冰刀獄',
  '毒爆川流', '奧義：毒爆川流',
  '電殛霹靂', '奧義：電殛霹靂',
  '冰凍裂痕', '奧義：冰凍裂痕',
  '獄火焚身', '奧義：獄火焚身'
];

allSkills.forEach(tree => {
  tree.skills.forEach(skill => {
    if (targetIds.includes(skill.name)) {
      console.log(`技能: 【${skill.name}】 | ID: ${skill.skill_group_id} | 屬性欄位 element_property: "${skill.element_property || '未定義'}"`);
    }
  });
});

process.exit(0);
