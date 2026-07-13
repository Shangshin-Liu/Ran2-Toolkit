import fs from 'fs';
import path from 'path';

const jsonPath = path.resolve(process.cwd(), 'skill-design-meta/ran2_all_skills.json');
const rawData = fs.readFileSync(jsonPath, 'utf8');
const allSkills = JSON.parse(rawData);

let modifiedCount = 0;

allSkills.forEach(tree => {
  tree.skills.forEach(skill => {
    // 1. 普通技能 火雲旋風
    if (skill.skill_group_id === 'kakuto_foot_017') {
      skill.element_property = '火';
      modifiedCount++;
      console.log(`[修改屬性] ${skill.name} (${skill.skill_group_id}) -> 屬性設為 "火"`);
    }
    // 2. 奧義技能 奧義：火雲旋風
    if (skill.skill_group_id === 'shintou_str_017') {
      skill.element_property = '火';
      modifiedCount++;
      console.log(`[修改屬性] ${skill.name} (${skill.skill_group_id}) -> 屬性設為 "火"`);
    }
  });
});

if (modifiedCount > 0) {
  fs.writeFileSync(jsonPath, JSON.stringify(allSkills, null, 2), 'utf8');
  console.log(`\n🎉 成功修改 ${modifiedCount} 處技能屬性，並已寫回 JSON 檔案！`);
} else {
  console.log('\n未找到指定技能。');
}

process.exit(0);
