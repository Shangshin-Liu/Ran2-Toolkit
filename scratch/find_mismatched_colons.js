import fs from 'fs';
import path from 'path';

const jsonPath = path.resolve(process.cwd(), 'skill-design-meta/ran2_all_skills.json');
const rawData = fs.readFileSync(jsonPath, 'utf8');
const allSkills = JSON.parse(rawData);

// 1. 蒐集所有奧義技能的定義名稱 (以 name 為鍵值)
const skillDefineMap = {}; // { [cleanName]: { id, originalName } }
// cleanName 將所有全半形冒號去除，用作匹配 key
const getCleanName = (name) => name.replace('：', ':').replace(/\s+/g, '').trim();

allSkills.forEach(tree => {
  tree.skills.forEach(skill => {
    const clean = getCleanName(skill.name);
    skillDefineMap[clean] = {
      id: skill.skill_group_id,
      name: skill.name // 定義時的真實名稱 (包含它所使用的冒號)
    };
  });
});

console.log('=== 開始掃描全半形冒號不一致的前置技能配置 ===\n');

let mismatchCount = 0;
const mismatches = [];

allSkills.forEach(tree => {
  tree.skills.forEach(skill => {
    skill.levels.forEach(lv => {
      if (lv.learn_condition && lv.learn_condition.prerequisite) {
        const refName = lv.learn_condition.prerequisite.skill_name;
        const cleanRef = getCleanName(refName);
        
        // 尋找定義
        const define = skillDefineMap[cleanRef];
        if (define) {
          if (define.name !== refName) {
            mismatchCount++;
            mismatches.push({
              skillId: skill.skill_group_id,
              skillName: skill.name,
              level: lv.skill_level,
              refName: refName,
              defineName: define.name,
              defineId: define.id
            });
          }
        }
      }
    });
  });
});

if (mismatchCount === 0) {
  console.log('🎉 恭喜！未發現任何全半形冒號不一致的情形。');
} else {
  console.log(`❌ 共發現 ${mismatchCount} 處前置技能引用名稱與定義名稱不一致：\n`);
  
  // 進行去重與群組顯示，讓報告更易讀
  const grouped = {};
  mismatches.forEach(m => {
    const key = `${m.skillName} -> ${m.refName} (應為: ${m.defineName})`;
    if (!grouped[key]) {
      grouped[key] = {
        skillName: m.skillName,
        refName: m.refName,
        defineName: m.defineName,
        levels: []
      };
    }
    grouped[key].levels.push(m.level);
  });

  Object.values(grouped).forEach(g => {
    console.log(`- 技能【${g.skillName}】在等級 [${g.levels.join(', ')}] 中：`);
    console.log(`  - 引用前置名: "${g.refName}"`);
    console.log(`  - 官方定義名: "${g.defineName}" (不一致！)`);
  });
}

process.exit(0);
