import fs from 'fs';
import path from 'path';

const jsonPath = path.resolve(process.cwd(), 'skill-design-meta/ran2_all_skills.json');
const rawData = fs.readFileSync(jsonPath, 'utf8');
const allSkills = JSON.parse(rawData);

allSkills.forEach(tree => {
  tree.skills.forEach(skill => {
    if (skill.name === '石化符' || skill.name === '奧義：石化符') {
      console.log(`\n技能: 【${skill.name}】 | ID: ${skill.skill_group_id}`);
      console.log(`  Lv.1: special_effects =`, skill.levels[0].special_effects);
    }
  });
});

process.exit(0);
