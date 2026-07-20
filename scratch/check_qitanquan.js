import fs from 'fs';
import path from 'path';

const jsonPath = path.resolve(process.cwd(), 'skill-design-meta/ran2_all_skills.json');
const rawData = fs.readFileSync(jsonPath, 'utf8');
const allSkills = JSON.parse(rawData);

const targetIds = ['氣彈拳', '奧義：氣彈拳'];

allSkills.forEach(tree => {
  tree.skills.forEach(skill => {
    if (targetIds.includes(skill.name)) {
      console.log(`\n技能名稱: 【${skill.name}】 | ID: ${skill.skill_group_id} | 職業: ${tree.job}_${tree.skill_tree}`);
      skill.levels.forEach(lv => {
        console.log(`  Lv.${lv.skill_level}: special_effects =`, lv.special_effects);
      });
    }
  });
});

process.exit(0);
