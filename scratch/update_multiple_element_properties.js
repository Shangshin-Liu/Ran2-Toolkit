import fs from 'fs';
import path from 'path';

const jsonPath = path.resolve(process.cwd(), 'skill-design-meta/ran2_all_skills.json');
const rawData = fs.readFileSync(jsonPath, 'utf8');
const allSkills = JSON.parse(rawData);

const updates = {
  'kakuto_com_011': '冰',
  'shintou_com_010': '冰',
  'kendo_com_010': '毒',
  'shinken_com_009': '毒',
  'kendo_slash_016': '冰',
  'shinken_str_016': '冰',
  'archer_com_011': '火',
  'shinbow_com_010': '火',
  'qigong_com_008': '電',
  'shinki_com_008': '電'
};

let modifiedCount = 0;

allSkills.forEach(tree => {
  tree.skills.forEach(skill => {
    if (updates[skill.skill_group_id] !== undefined) {
      const newProp = updates[skill.skill_group_id];
      skill.element_property = newProp;
      modifiedCount++;
      console.log(`[修改屬性] ${skill.name} (${skill.skill_group_id}) -> 屬性設為 "${newProp}"`);
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
