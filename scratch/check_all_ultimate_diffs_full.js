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

const diffs = [];

Object.entries(skillMap).forEach(([name, info]) => {
  if (name.startsWith('奧義：')) {
    const normalName = name.replace('奧義：', '');
    const ultimateSkill = info.skill;
    const normalInfo = skillMap[normalName];

    if (!normalInfo) {
      // 沒有普通版本的奧義技能跳過
      return;
    }

    const normalSkill = normalInfo.skill;
    const skillDiff = {
      ultimateName: name,
      normalName: normalName,
      ultimateId: ultimateSkill.skill_group_id,
      normalId: normalSkill.skill_group_id,
      job: info.job,
      tree: info.skill_tree,
      prereqDiffs: [],
      descDiff: null,
      statsDiffs: []
    };

    // 1. 比對每一級的前置技能與前置等級
    const maxLvl = Math.min(ultimateSkill.levels.length, normalSkill.levels.length);
    for (let i = 0; i < maxLvl; i++) {
      const ultLvl = ultimateSkill.levels[i];
      const normLvl = normalSkill.levels[i];

      const ultPre = ultLvl.learn_condition && ultLvl.learn_condition.prerequisite;
      const normPre = normLvl.learn_condition && normLvl.learn_condition.prerequisite;

      const ultPreName = ultPre ? ultPre.skill_name : null;
      const normPreName = normPre ? normPre.skill_name : null;
      const cleanUltPreName = ultPreName ? ultPreName.replace('奧義：', '') : null;

      const ultPreLvl = ultPre ? ultPre.required_skill_level : null;
      const normPreLvl = normPre ? normPre.required_skill_level : null;

      // 檢查前置技能名稱是否不同，或前置等級要求不同
      if (cleanUltPreName !== normPreName || ultPreLvl !== normPreLvl) {
        skillDiff.prereqDiffs.push({
          level: i + 1,
          ultimatePre: ultPreName || '無',
          normalPre: normPreName || '無',
          ultimatePreReqLvl: ultPreLvl || '無',
          normalPreReqLvl: normPreLvl || '無'
        });
      }
    }

    // 2. 比對效果描述
    const cleanUltDesc = ultimateSkill.description.replace(/奧義：/g, '').replace(/奧義/g, '').trim();
    const cleanNormDesc = normalSkill.description.replace(/奧義：/g, '').replace(/奧義/g, '').trim();

    if (cleanUltDesc !== cleanNormDesc) {
      skillDiff.descDiff = {
        ultimateDesc: ultimateSkill.description,
        normalDesc: normalSkill.description
      };
    }

    // 3. 比對 base_stats 的鍵名 (以 Lv.1 為準，若各等級有差也可以)
    const ultLvl1 = ultimateSkill.levels[0];
    const normLvl1 = normalSkill.levels[0];
    if (ultLvl1 && normLvl1) {
      const ultKeys = Object.keys(ultLvl1.base_stats).sort();
      const normKeys = Object.keys(normLvl1.base_stats).sort();

      // 比對兩個陣列是否相同
      const keysDiff = ultKeys.filter(k => !normKeys.includes(k)).concat(normKeys.filter(k => !ultKeys.includes(k)));
      if (keysDiff.length > 0) {
        skillDiff.statsDiffs.push({
          ultimateKeys: ultKeys,
          normalKeys: normKeys
        });
      }
    }

    if (skillDiff.prereqDiffs.length > 0 || skillDiff.descDiff || skillDiff.statsDiffs.length > 0) {
      diffs.push(skillDiff);
    }
  }
});

// 寫出報告檔案
const reportPath = path.resolve(process.cwd(), 'scratch/ultimate_diff_report_full.txt');
let reportContent = '--- 奧義與非奧義技能一致性檢查完整報告 ---\n';

diffs.forEach(d => {
  reportContent += `\n【${d.ultimateName}】 (ID: ${d.ultimateId}) ➔ 【${d.normalName}】 (ID: ${d.normalId}) [${d.job}_${d.tree}]\n`;
  
  if (d.prereqDiffs.length > 0) {
    reportContent += '  ⚠️ 前置技能/要求等級有落差:\n';
    d.prereqDiffs.forEach(p => {
      reportContent += `    - Lv.${p.level}: 奧義前置 "${p.ultimatePre}" (要求 Lv.${p.ultimatePreReqLvl}) vs 普通前置 "${p.normalPre}" (要求 Lv.${p.normalPreReqLvl})\n`;
    });
  }

  if (d.statsDiffs.length > 0) {
    reportContent += '  📊 數值屬性鍵名 (base_stats) 不一致:\n';
    d.statsDiffs.forEach(s => {
      reportContent += `    - 奧義鍵名: [${s.ultimateKeys.join(', ')}]\n`;
      reportContent += `    - 普通鍵名: [${s.normalKeys.join(', ')}]\n`;
    });
  }

  if (d.descDiff) {
    reportContent += '  📝 效果描述有落差:\n';
    reportContent += `    - 奧義描述: "${d.descDiff.ultimateDesc}"\n`;
    reportContent += `    - 普通描述: "${d.descDiff.normalDesc}"\n`;
  }
});

fs.writeFileSync(reportPath, reportContent, 'utf8');
console.log('比對完成，完整報告已儲存至 scratch/ultimate_diff_report_full.txt');
process.exit(0);
