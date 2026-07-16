import fs from 'fs';
import path from 'path';

const jsonPath = path.resolve(process.cwd(), 'skill-design-meta/ran2_all_skills.json');
const rawData = fs.readFileSync(jsonPath, 'utf8');
const allSkills = JSON.parse(rawData);

let modifiedCount = 0;

allSkills.forEach(tree => {
  tree.skills.forEach(skill => {
    // 1. 大弱化符系列
    if (skill.skill_group_id === 'qigong_atk_012' || skill.skill_group_id === 'shinki_spi_atk_012') {
      console.log(`[修改大弱化符] ${skill.name} (${skill.skill_group_id})`);
      skill.levels.forEach(lv => {
        if (lv.special_effects) {
          const effect = lv.special_effects.find(e => e.effect_type === '攻擊速度');
          if (effect) {
            effect.probability = 0.3;
            modifiedCount++;
          }
        }
      });
    }

    // 2. 生命恢復系列描述
    if (skill.skill_group_id === 'qigong_sup_001' || skill.skill_group_id === 'shinki_spi_sup_001') {
      const suffix = '（新增解除「弱化符」技能效果）';
      if (!skill.description.includes(suffix)) {
        console.log(`[修改描述] ${skill.name} (${skill.skill_group_id}) 追加 "${suffix}"`);
        skill.description += suffix;
        modifiedCount++;
      }
    }

    // 3. 女神的祝福系列描述
    if (skill.skill_group_id === 'qigong_sup_020' || skill.skill_group_id === 'shinki_spi_sup_020') {
      const suffix = '（新增解除「大弱化符」技能效果）';
      if (!skill.description.includes(suffix)) {
        console.log(`[修改描述] ${skill.name} (${skill.skill_group_id}) 追加 "${suffix}"`);
        skill.description += suffix;
        modifiedCount++;
      }
    }

    // 4. 千里眼系列描述
    if (skill.skill_group_id === 'archer_qi_005' || skill.skill_group_id === 'shinbow_spi_005') {
      const suffix = '（滿級射程提升20）';
      if (!skill.description.includes(suffix)) {
        console.log(`[修改描述] ${skill.name} (${skill.skill_group_id}) 追加 "${suffix}"`);
        skill.description += suffix;
        modifiedCount++;
      }
    }
  });
});

if (modifiedCount > 0) {
  fs.writeFileSync(jsonPath, JSON.stringify(allSkills, null, 2), 'utf8');
  console.log(`\n🎉 成功修改 ${modifiedCount} 處技能屬性/描述，並已寫回 JSON 檔案！`);
} else {
  console.log('\n未發現需要修改的數值。');
}

process.exit(0);
