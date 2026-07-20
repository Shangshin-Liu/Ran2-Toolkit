import fs from 'fs';
import path from 'path';

const jsonPath = path.resolve(process.cwd(), 'skill-design-meta/ran2_all_skills.json');
const rawData = fs.readFileSync(jsonPath, 'utf8');
const allSkills = JSON.parse(rawData);

const passiveNames = [
  '拳術專精', '奧義：拳術專精',
  '劈斬專精', '奧義：劈斬專精',
  '刺擊專精', '奧義：刺擊專精',
  '劍術專精', '奧義：劍術專精'
];

allSkills.forEach(tree => {
  tree.skills.forEach(skill => {
    if (passiveNames.includes(skill.name)) {
      console.log(`\n技能: 【${skill.name}】 | ID: ${skill.skill_group_id} | 樹: ${tree.job}_${tree.skill_tree}`);
      const lv1 = skill.levels[0];
      console.log(`  描述: "${skill.description}"`);
      console.log(`  Lv.1: base_stats =`, lv1.base_stats);
    }
  });
});

process.exit(0);
