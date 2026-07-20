import fs from 'fs';
import path from 'path';

const jsonPath = path.resolve(process.cwd(), 'skill-design-meta/ran2_all_skills.json');
const rawData = fs.readFileSync(jsonPath, 'utf8');
const allSkills = JSON.parse(rawData);

// 建立技能地圖，方便快速尋找
const skillMap = {};
allSkills.forEach(tree => {
  tree.skills.forEach(skill => {
    skillMap[skill.name] = {
      skill,
      treeName: `${tree.job}_${tree.skill_tree}`
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
      prereqDiffs: [],
      descDiff: null
    };

    // 1. 比對前置技能 (取第一級即可)
    const ultLvl1 = ultimateSkill.levels[0];
    const normLvl1 = normalSkill.levels[0];

    const ultPreObj = ultLvl1.learn_condition && ultLvl1.learn_condition.prerequisite;
    const normPreObj = normLvl1.learn_condition && normLvl1.learn_condition.prerequisite;

    const cleanUltPreName = ultPreObj ? ultPreObj.skill_name.replace('奧義：', '') : null;
    const normPreName = normPreObj ? normPreObj.skill_name : null;

    if (cleanUltPreName !== normPreName) {
      skillDiff.prereqDiffs.push({
        ultimatePre: ultPreObj ? ultPreObj.skill_name : '無',
        normalPre: normPreObj ? normPreObj.skill_name : '無',
        ultimatePreReqLvl: ultPreObj ? ultPreObj.required_skill_level : null,
        normalPreReqLvl: normPreObj ? normPreObj.required_skill_level : null
      });
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

    if (skillDiff.prereqDiffs.length > 0 || skillDiff.descDiff) {
      diffs.push(skillDiff);
    }
  }
});

// 寫出報告檔案
const reportPath = path.resolve(process.cwd(), 'scratch/ultimate_diff_report.txt');
let reportContent = '--- 奧義與非奧義技能一致性檢查報告 ---\n';

diffs.forEach(d => {
  reportContent += `\n【${d.ultimateName}】 (ID: ${d.ultimateId}) ➔ 【${d.normalName}】 (ID: ${d.normalId})\n`;
  
  if (d.prereqDiffs.length > 0) {
    reportContent += '  ⚠️ 前置技能有落差:\n';
    d.prereqDiffs.forEach(p => {
      reportContent += `    - 奧義前置: "${p.ultimatePre}" (要求 Lv.${p.ultimatePreReqLvl})\n`;
      reportContent += `    - 普通前置: "${p.normalPre}" (要求 Lv.${p.normalPreReqLvl})\n`;
    });
  }

  if (d.descDiff) {
    reportContent += '  📝 效果描述有落差:\n';
    reportContent += `    - 奧義描述: "${d.descDiff.ultimateDesc}"\n`;
    reportContent += `    - 普通描述: "${d.descDiff.normalDesc}"\n`;
  }
});

fs.writeFileSync(reportPath, reportContent, 'utf8');
console.log('比對完成，報告已儲存至 scratch/ultimate_diff_report.txt');
process.exit(0);
