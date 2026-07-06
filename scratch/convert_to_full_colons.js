import fs from 'fs';
import path from 'path';

const jsonPath = path.resolve(process.cwd(), 'skill-design-meta/ran2_all_skills.json');
const rawData = fs.readFileSync(jsonPath, 'utf8');
const allSkills = JSON.parse(rawData);

let renameCount = 0;
let prereqCount = 0;

allSkills.forEach(tree => {
  tree.skills.forEach(skill => {
    // 1. 檢查招式定義原有名稱 (例如 奧義:惡虎咆哮 -> 奧義：惡虎咆哮)
    if (skill.name.includes('奧義:')) {
      const oldName = skill.name;
      skill.name = skill.name.replace('奧義:', '奧義：');
      renameCount++;
      console.log(`[招式改名] "${oldName}" -> "${skill.name}"`);
    }

    // 2. 檢查 levels 裡的前置技能要求 (例如 奧義:惡虎咆哮 -> 奧義：惡虎咆哮)
    skill.levels.forEach(lv => {
      if (lv.learn_condition && lv.learn_condition.prerequisite) {
        const pre = lv.learn_condition.prerequisite;
        if (pre.skill_name && pre.skill_name.includes('奧義:')) {
          const oldPre = pre.skill_name;
          pre.skill_name = pre.skill_name.replace('奧義:', '奧義：');
          prereqCount++;
          console.log(`[前置改名] 技能【${skill.name}】Lv.${lv.skill_level} 的前置: "${oldPre}" -> "${pre.skill_name}"`);
        }
      }
    });
  });
});

if (renameCount > 0 || prereqCount > 0) {
  fs.writeFileSync(jsonPath, JSON.stringify(allSkills, null, 2), 'utf8');
  console.log(`\n🎉 成功將招式名稱修改 ${renameCount} 處，前置技能修改 ${prereqCount} 處，並已寫回 JSON 檔案！`);
} else {
  console.log('\n未偵測到任何半形冒號奧義技能。');
}

process.exit(0);
