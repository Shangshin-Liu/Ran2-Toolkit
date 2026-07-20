import fs from 'fs';
import path from 'path';

const jsonPath = path.resolve(process.cwd(), 'skill-design-meta/ran2_all_skills.json');
const rawData = fs.readFileSync(jsonPath, 'utf8');
const allSkills = JSON.parse(rawData);

allSkills.forEach(tree => {
  tree.skills.forEach(skill => {
    skill.levels.forEach(lv => {
      if (lv.special_effects) {
        lv.special_effects.forEach(eff => {
          if (JSON.stringify(eff).includes('石化')) {
            console.log(`技能: 【${skill.name}】 | ID: ${skill.skill_group_id} | 包含 "石化" 效果:`, eff);
          }
        });
      }
    });
  });
});

process.exit(0);
