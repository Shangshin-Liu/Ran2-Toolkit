import fs from 'fs';
import path from 'path';

const jsonPath = path.resolve(process.cwd(), 'skill-design-meta/ran2_all_skills.json');
const rawData = fs.readFileSync(jsonPath, 'utf8');
const allSkills = JSON.parse(rawData);

const baseNames = [
  '覺醒', '光影', '迅捷', '風靈護體',
  '劍影無形', '劍奇法印', '連環箭', '快速施法',
  '不動如山', '紫氣玄流', '大弱化符', '弱化符',
  '拘束指令陣', '正氣引歸', '聖耀天讚', '迴照大千',
  '生命恢復', '女神的祝福', '千里眼'
];

console.log('--- 尋找與定位技能資料 ---');
const foundSkills = {};

baseNames.forEach(name => {
  foundSkills[name] = [];
  const normalName = name;
  const ultimateName = `奧義：${name}`;

  allSkills.forEach(tree => {
    tree.skills.forEach(skill => {
      if (skill.name === normalName || skill.name === ultimateName) {
        foundSkills[name].push({
          treeName: `${tree.job}_${tree.skill_tree}`,
          skill_group_id: skill.skill_group_id,
          name: skill.name,
          levelsCount: skill.levels.length
        });
      }
    });
  });
});

baseNames.forEach(name => {
  console.log(`\n【${name}】`);
  if (foundSkills[name].length === 0) {
    console.log('  ❌ 找不到任何匹配技能');
  } else {
    foundSkills[name].forEach(info => {
      console.log(`  - 技能: ${info.name} | ID: ${info.skill_group_id} | 樹: ${info.treeName} | 等級數: ${info.levelsCount}`);
    });
  }
});

process.exit(0);
