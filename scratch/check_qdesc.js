import fs from 'fs';
import path from 'path';

const jsonPath = path.resolve(process.cwd(), 'skill-design-meta/ran2_all_skills.json');
const rawData = fs.readFileSync(jsonPath, 'utf8');
const allSkills = JSON.parse(rawData);

allSkills.forEach(tree => {
  tree.skills.forEach(skill => {
    if (skill.name === '氣彈拳' || skill.name === '奧義：氣彈拳') {
      console.log(`技能: 【${skill.name}】 | ID: ${skill.skill_group_id} | 描述: "${skill.description}"`);
    }
  });
});

process.exit(0);
