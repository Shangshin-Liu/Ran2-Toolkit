import fs from 'fs';
import path from 'path';

const jsonPath = path.resolve(process.cwd(), 'skill-design-meta/ran2_all_skills.json');
const rawData = fs.readFileSync(jsonPath, 'utf8');
const allSkills = JSON.parse(rawData);

const targetNames = ['流星守護', '奧義：流星守護'];

allSkills.forEach(tree => {
  tree.skills.forEach(skill => {
    if (targetNames.includes(skill.name)) {
      console.log(`\n技能名稱: 【${skill.name}】 | ID: ${skill.skill_group_id} | 職業/技能樹: ${tree.job}_${tree.skill_tree}`);
      skill.levels.forEach(lv => {
        const pre = lv.learn_condition && lv.learn_condition.prerequisite;
        if (pre) {
          console.log(`  Lv.${lv.skill_level}: 前置技能: "${pre.skill_name}" | 當前要求等級: ${pre.required_skill_level}`);
        } else {
          console.log(`  Lv.${lv.skill_level}: 無前置技能`);
        }
      });
    }
  });
});

process.exit(0);
