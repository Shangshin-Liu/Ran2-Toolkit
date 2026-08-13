import fs from 'fs';
import path from 'path';

const jsonPath = path.resolve(process.cwd(), 'skill-design-meta/ran2_all_skills.json');
const rawData = fs.readFileSync(jsonPath, 'utf8');
const allSkills = JSON.parse(rawData);

const updates = {
  // 4級技能
  'kakuto_com_008': ['-20%', '-30%', '-40%', '-50%'],
  'shintou_com_008': ['-20%', '-30%', '-40%', '-50%'],
  'kendo_com_007': ['-20%', '-30%', '-40%', '-50%'],
  'shinken_com_007': ['-20%', '-30%', '-40%', '-50%'],
  'archer_com_008': ['-20%', '-30%', '-40%', '-50%'],
  'shinbow_com_008': ['-20%', '-30%', '-40%', '-50%'],
  // 5級技能
  'qigong_com_010': ['-10%', '-20%', '-30%', '-40%', '-50%'],
  'shinki_com_006': ['-10%', '-20%', '-30%', '-40%', '-50%']
};

let modifiedCount = 0;

allSkills.forEach(tree => {
  tree.skills.forEach(skill => {
    const rates = updates[skill.skill_group_id];
    if (rates) {
      console.log(`[修改攻速] ${skill.name} (${skill.skill_group_id}):`);
      skill.levels.forEach((lv, idx) => {
        if (idx < rates.length) {
          let speedEffect = (lv.special_effects || []).find(e => e.effect_type === '攻擊速度');
          if (!speedEffect) {
            speedEffect = { effect_type: '攻擊速度', attack_speed_rate: rates[idx] };
            lv.special_effects = lv.special_effects || [];
            lv.special_effects.push(speedEffect);
          } else {
            console.log(`  - Lv.${lv.skill_level}: ${speedEffect.attack_speed_rate} -> ${rates[idx]}`);
            speedEffect.attack_speed_rate = rates[idx];
          }
          modifiedCount++;
        }
      });
    }
  });
});

if (modifiedCount > 0) {
  fs.writeFileSync(jsonPath, JSON.stringify(allSkills, null, 2), 'utf8');
  console.log(`\n🎉 成功修改 ${modifiedCount} 處技能攻速，並已寫回 JSON 檔案！`);
} else {
  console.log('\n未找到指定技能。');
}

process.exit(0);
