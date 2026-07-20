import fs from 'fs';
import path from 'path';

const jsonPath = path.resolve(process.cwd(), 'skill-design-meta/ran2_all_skills.json');
const rawData = fs.readFileSync(jsonPath, 'utf8');
const allSkills = JSON.parse(rawData);

// 建立技能地圖，包含所有技能及其樹的資訊
const skillMap = {};
allSkills.forEach(tree => {
  tree.skills.forEach(skill => {
    skillMap[skill.name] = {
      skill,
      job: tree.job,
      skill_tree: tree.skill_tree
    };
  });
});

const plannedChanges = [];

Object.entries(skillMap).forEach(([name, info]) => {
  if (name.startsWith('奧義：')) {
    const normalName = name.replace('奧義：', '');
    const ultimateSkill = info.skill;
    const normalInfo = skillMap[normalName];

    if (!normalInfo) {
      return;
    }

    const normalSkill = normalInfo.skill;
    const changeItem = {
      skillName: normalName,
      normalId: normalSkill.skill_group_id,
      ultimateId: ultimateSkill.skill_group_id,
      descChange: null,
      prereqChanges: []
    };

    // 1. 處理描述對齊 (以奧義描述去除 "奧義："、"奧義" 並修飾來更新普通版)
    // 我們可以把奧義描述做清洗：把 "奧義：" 與 "奧義" 移除後，來作為普通版的新描述
    // 互斥文字例如：(無法與奧義：嗜血術、奧義：血箭疊加) -> (無法與嗜血術、血箭疊加)
    let targetDesc = ultimateSkill.description
      .replace(/奧義：/g, '')
      .replace(/奧義/g, '')
      .trim();

    // 如果清洗後與普通版描述不同，則計畫更新普通描述
    if (normalSkill.description !== targetDesc) {
      changeItem.descChange = {
        from: normalSkill.description,
        to: targetDesc
      };
    }

    // 2. 處理前置技能等級對齊
    const maxLvl = Math.min(ultimateSkill.levels.length, normalSkill.levels.length);
    for (let i = 0; i < maxLvl; i++) {
      const ultLvl = ultimateSkill.levels[i];
      const normLvl = normalSkill.levels[i];

      const ultPre = ultLvl.learn_condition && ultLvl.learn_condition.prerequisite;
      const normPre = normLvl.learn_condition && normLvl.learn_condition.prerequisite;

      if (ultPre && normPre) {
        if (normPre.required_skill_level !== ultPre.required_skill_level) {
          changeItem.prereqChanges.push({
            level: i + 1,
            prereqSkill: normPre.skill_name,
            from: normPre.required_skill_level,
            to: ultPre.required_skill_level
          });
        }
      }
    }

    if (changeItem.descChange || changeItem.prereqChanges.length > 0) {
      plannedChanges.push(changeItem);
    }
  }
});

// 寫出預覽計畫檔案
const previewPath = path.resolve(process.cwd(), 'scratch/alignment_preview.txt');
let previewContent = '============================================================\n';
previewContent += ' 技能屬性對齊預覽計畫：以【奧義版本】更新【非奧義版本】\n';
previewContent += '============================================================\n';

plannedChanges.forEach(c => {
  previewContent += `\n【${c.skillName}】 (普通 ID: ${c.normalId} ➔ 參照奧義 ID: ${c.ultimateId})\n`;
  
  if (c.descChange) {
    previewContent += `  📝 描述變更：\n`;
    previewContent += `    - 調整前: "${c.descChange.from}"\n`;
    previewContent += `    - 調整後: "${c.descChange.to}"\n`;
  }

  if (c.prereqChanges.length > 0) {
    previewContent += `  ⚠️ 前置技能要求等級變更：\n`;
    c.prereqChanges.forEach(p => {
      previewContent += `    - Lv.${p.level}: 前置 "${p.prereqSkill}" 等級限制由 Lv.${p.from} ➔ 調整為 Lv.${p.to}\n`;
    });
  }
});

fs.writeFileSync(previewPath, previewContent, 'utf8');
console.log('預覽計畫產生完成，報告已儲存至 scratch/alignment_preview.txt');
process.exit(0);
