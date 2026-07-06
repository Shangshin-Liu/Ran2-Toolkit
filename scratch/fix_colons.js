import fs from 'fs';
import path from 'path';

const jsonPath = path.resolve(process.cwd(), 'skill-design-meta/ran2_all_skills.json');
const rawData = fs.readFileSync(jsonPath, 'utf8');
const allSkills = JSON.parse(rawData);

// 1. 蒐集定義對照表
const skillDefineMap = {};
const getCleanName = (name) => name.replace('：', ':').replace(/\s+/g, '').trim();

allSkills.forEach(tree => {
  tree.skills.forEach(skill => {
    const clean = getCleanName(skill.name);
    skillDefineMap[clean] = {
      name: skill.name
    };
  });
});

let fixCount = 0;

// 2. 遍歷並自動修正
allSkills.forEach(tree => {
  tree.skills.forEach(skill => {
    skill.levels.forEach(lv => {
      if (lv.learn_condition && lv.learn_condition.prerequisite) {
        const refName = lv.learn_condition.prerequisite.skill_name;
        const cleanRef = getCleanName(refName);
        
        const define = skillDefineMap[cleanRef];
        if (define && define.name !== refName) {
          console.log(`修正技能【${skill.name}】Lv.${lv.skill_level} 的前置: "${refName}" -> "${define.name}"`);
          lv.learn_condition.prerequisite.skill_name = define.name;
          fixCount++;
        }
      }
    });
  });
});

if (fixCount > 0) {
  fs.writeFileSync(jsonPath, JSON.stringify(allSkills, null, 2), 'utf8');
  console.log(`\n🎉 成功將 ${fixCount} 處全半形不一致的前置名稱寫回: skill-design-meta/ran2_all_skills.json`);
} else {
  console.log('\n未偵測到需要修正的項目。');
}

process.exit(0);
