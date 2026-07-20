import fs from 'fs';
import path from 'path';

const jsonPath = path.resolve(process.cwd(), 'skill-design-meta/ran2_all_skills.json');
const rawData = fs.readFileSync(jsonPath, 'utf8');
const allSkills = JSON.parse(rawData);

// 建立技能地圖，包含所有技能
const skillMap = {};
allSkills.forEach(tree => {
  tree.skills.forEach(skill => {
    skillMap[skill.name] = skill;
  });
});

let modifiedSkillsCount = 0;
let modifiedLevelsCount = 0;
let modifiedDescsCount = 0;

allSkills.forEach(tree => {
  tree.skills.forEach(skill => {
    // 我們遍歷所有的奧義技能，並以此更新同名的普通技能
    if (skill.name.startsWith('奧義：')) {
      const normalName = skill.name.replace('奧義：', '');
      const normalSkill = skillMap[normalName];

      if (!normalSkill) return;

      let isSkillModified = false;

      // 1. 描述對齊 (以奧義描述去除 "奧義：" 與 "奧義" 來更新普通版)
      const targetDesc = skill.description
        .replace(/奧義：/g, '')
        .replace(/奧義/g, '')
        .trim();

      if (normalSkill.description !== targetDesc) {
        console.log(`[描述變更] ${normalSkill.name} (${normalSkill.skill_group_id}):`);
        console.log(`  - 舊: "${normalSkill.description}"`);
        console.log(`  - 新: "${targetDesc}"`);
        normalSkill.description = targetDesc;
        isSkillModified = true;
        modifiedDescsCount++;
      }

      // 2. 前置技能要求等級對齊
      const maxLvl = Math.min(skill.levels.length, normalSkill.levels.length);
      for (let i = 0; i < maxLvl; i++) {
        const ultLvl = skill.levels[i];
        const normLvl = normalSkill.levels[i];

        const ultPre = ultLvl.learn_condition && ultLvl.learn_condition.prerequisite;
        const normPre = normLvl.learn_condition && normLvl.learn_condition.prerequisite;

        if (ultPre && normPre) {
          if (normPre.required_skill_level !== ultPre.required_skill_level) {
            console.log(`[前置等級] ${normalSkill.name} (Lv.${i + 1}):`);
            console.log(`  - 前置技能 "${normPre.skill_name}" 要求等級: ${normPre.required_skill_level} -> ${ultPre.required_skill_level}`);
            normPre.required_skill_level = ultPre.required_skill_level;
            isSkillModified = true;
            modifiedLevelsCount++;
          }
        }
      }

      if (isSkillModified) {
        modifiedSkillsCount++;
      }
    }
  });
});

if (modifiedSkillsCount > 0) {
  fs.writeFileSync(jsonPath, JSON.stringify(allSkills, null, 2), 'utf8');
  console.log(`\n🎉 成功對齊！共更新 ${modifiedSkillsCount} 個普通技能，包含 ${modifiedDescsCount} 處描述修正與 ${modifiedLevelsCount} 處前置等級要求修正！`);
} else {
  console.log('\n未發現需要對齊的技能屬性。');
}

process.exit(0);
