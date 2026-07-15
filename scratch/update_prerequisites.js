import fs from 'fs';
import path from 'path';

const jsonPath = path.resolve(process.cwd(), 'skill-design-meta/ran2_all_skills.json');
const rawData = fs.readFileSync(jsonPath, 'utf8');
const allSkills = JSON.parse(rawData);

let modifiedCount = 0;

allSkills.forEach(tree => {
  tree.skills.forEach(skill => {
    // 尋找 流星守護
    if (skill.skill_group_id === 'archer_swift_003') {
      skill.levels.forEach(lv => {
        const pre = lv.learn_condition && lv.learn_condition.prerequisite;
        if (pre && pre.skill_name === '閃電之擊') {
          console.log(`[修改前置] ${skill.name} (Lv.${lv.skill_level}) 前置 "${pre.skill_name}" 等級: ${pre.required_skill_level} -> 4`);
          pre.required_skill_level = 4;
          modifiedCount++;
        }
      });
    }
  });
});

if (modifiedCount > 0) {
  fs.writeFileSync(jsonPath, JSON.stringify(allSkills, null, 2), 'utf8');
  console.log(`\n🎉 成功修改 ${modifiedCount} 處前置等級，並已寫回 JSON 檔案！`);
} else {
  console.log('\n未找到指定技能或前置條件。');
}

process.exit(0);
