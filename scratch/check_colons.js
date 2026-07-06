import fs from 'fs';
import path from 'path';

const jsonPath = path.resolve(process.cwd(), 'skill-design-meta/ran2_all_skills.json');
const rawData = fs.readFileSync(jsonPath, 'utf8');
const allSkills = JSON.parse(rawData);

// 1. 蒐集所有奧義技能定義時的名稱與冒號格式
const defineNames = [];
allSkills.forEach(tree => {
  tree.skills.forEach(skill => {
    if (skill.name.includes('奧義')) {
      defineNames.push({
        id: skill.skill_group_id,
        name: skill.name,
        hasHalf: skill.name.includes('奧義:'),
        hasFull: skill.name.includes('奧義：')
      });
    }
  });
});

console.log('=== 奧義技能定義名稱中的冒號分佈 ===');
let halfCount = 0;
let fullCount = 0;
defineNames.forEach(d => {
  if (d.hasHalf) halfCount++;
  if (d.hasFull) fullCount++;
  console.log(`- ID: ${d.id}, Name: "${d.name}"`);
});
console.log(`統計：共有 ${defineNames.length} 個奧義技能。半形冒號: ${halfCount} 個，全形冒號: ${fullCount} 個。\n`);

// 2. 蒐集所有 prerequisite 裡奧義技能被引用的名稱與冒號格式
const refNames = [];
allSkills.forEach(tree => {
  tree.skills.forEach(skill => {
    skill.levels.forEach(lv => {
      if (lv.learn_condition && lv.learn_condition.prerequisite) {
        const preName = lv.learn_condition.prerequisite.skill_name;
        if (preName.includes('奧義')) {
          const already = refNames.find(r => r.name === preName);
          if (!already) {
            refNames.push({
              name: preName,
              hasHalf: preName.includes('奧義:'),
              hasFull: preName.includes('奧義：')
            });
          }
        }
      }
    });
  });
});

console.log('=== 前置條件 (prerequisite) 中引用的奧義名稱分佈 ===');
refNames.forEach(r => {
  console.log(`- Name: "${r.name}", 半形: ${r.hasHalf}, 全形: ${r.hasFull}`);
});

process.exit(0);
