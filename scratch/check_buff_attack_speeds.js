import fs from 'fs';
import path from 'path';

const jsonPath = path.resolve(process.cwd(), 'skill-design-meta/ran2_all_skills.json');
const rawData = fs.readFileSync(jsonPath, 'utf8');
const allSkills = JSON.parse(rawData);

const targetNames = [
  '覺醒', '奧義：覺醒',
  '光影', '奧義：光影',
  '迅捷', '奧義：迅捷',
  '風靈護體', '奧義：風靈護體'
];

allSkills.forEach(tree => {
  tree.skills.forEach(skill => {
    if (targetNames.includes(skill.name)) {
      console.log(`\n技能: 【${skill.name}】 | ID: ${skill.skill_group_id} | 樹: ${tree.job}_${tree.skill_tree} | 等級數: ${skill.levels.length}`);
      skill.levels.forEach(lv => {
        const speedEffect = (lv.special_effects || []).find(e => e.effect_type === '攻擊速度');
        console.log(`  Lv.${lv.skill_level}: 攻速 = ${speedEffect ? speedEffect.attack_speed_rate : '無'}`);
      });
    }
  });
});

process.exit(0);
