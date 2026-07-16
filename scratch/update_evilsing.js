import fs from 'fs';
import path from 'path';

const jsonPath = path.resolve(process.cwd(), 'skill-design-meta/ran2_all_skills.json');
const rawData = fs.readFileSync(jsonPath, 'utf8');
const allSkills = JSON.parse(rawData);

let modifiedCount = 0;

allSkills.forEach(tree => {
  tree.skills.forEach(skill => {
    // 尋找 奧義：邪靈詠唱
    if (skill.skill_group_id === 'shinki_spi_sup_022') {
      // 1. 修改招式描述
      const originalDesc = skill.description;
      skill.description = "創造死神的形像，令其詠唱死靈之歌，讓範圍內的敵人短時間內降低HP上限（經實測此技能目標數量每一等級均為 1，且無降低HP上限效果）";
      console.log(`[修改描述] "${originalDesc}" -> "${skill.description}"`);
      
      // 2. 修改目標數與移除 hp_rate_change
      skill.levels.forEach(lv => {
        console.log(`[修改等級 Lv.${lv.skill_level}]`);
        console.log(`  - target_count: ${lv.base_stats.target_count} -> 1`);
        lv.base_stats.target_count = 1;
        
        if (lv.base_stats.hp_rate_change !== undefined) {
          console.log(`  - 移除 hp_rate_change: "${lv.base_stats.hp_rate_change}"`);
          delete lv.base_stats.hp_rate_change;
        }
        modifiedCount++;
      });
    }
  });
});

if (modifiedCount > 0) {
  fs.writeFileSync(jsonPath, JSON.stringify(allSkills, null, 2), 'utf8');
  console.log(`\n🎉 成功修改 ${modifiedCount} 個等級的屬性，且已更新描述並寫回 JSON 檔案！`);
} else {
  console.log('\n未找到指定技能。');
}

process.exit(0);
