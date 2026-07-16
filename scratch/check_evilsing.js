import fs from 'fs';
import path from 'path';

const jsonPath = path.resolve(process.cwd(), 'skill-design-meta/ran2_all_skills.json');
const rawData = fs.readFileSync(jsonPath, 'utf8');
const allSkills = JSON.parse(rawData);

allSkills.forEach(tree => {
  tree.skills.forEach(skill => {
    if (skill.name === '奧義：邪靈詠唱') {
      console.log(`技能名稱: 【${skill.name}】 | ID: ${skill.skill_group_id}`);
      skill.levels.forEach(lv => {
        console.log(`  Lv.${lv.skill_level}: target_count = ${lv.base_stats.target_count}, hp_rate_change = ${lv.base_stats.hp_rate_change}`);
      });
    }
  });
});

process.exit(0);
