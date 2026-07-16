import fs from 'fs';
import path from 'path';

const jsonPath = path.resolve(process.cwd(), 'skill-design-meta/ran2_all_skills.json');
const rawData = fs.readFileSync(jsonPath, 'utf8');
const allSkills = JSON.parse(rawData);

const targetIds = [
  'kakuto_com_008', 'kendo_com_007', 'archer_com_008', 'qigong_com_010',
  'kendo_stab_012', 'shinken_spi_019', 'archer_power_014', 'qigong_atk_015',
  'kakuto_foot_014', 'shinki_spi_atk_023', 'qigong_atk_012', 'qigong_atk_002',
  'qigong_sup_017', 'shinki_spi_sup_024', 'shinki_spi_sup_023', 'shinki_spi_sup_026',
  'qigong_sup_001', 'qigong_sup_020', 'archer_qi_005'
];

targetIds.forEach(id => {
  let found = null;
  allSkills.forEach(tree => {
    const s = tree.skills.find(sk => sk.skill_group_id === id);
    if (s) found = s;
  });
  if (found) {
    console.log(`\n【${found.name}】 ID: ${found.skill_group_id}`);
    console.log(`  - 描述: ${found.description}`);
    const lv1 = found.levels[0];
    console.log(`  - delay_time (lv1): ${lv1.base_stats.delay_time}`);
    console.log(`  - duration (lv1): ${lv1.base_stats.duration}`);
    console.log(`  - base_stats (lv1) keys:`, Object.keys(lv1.base_stats));
    console.log(`  - base_stats (lv1) values:`, lv1.base_stats);
    if (lv1.special_effects) {
      console.log(`  - special_effects (lv1):`, lv1.special_effects);
    }
  }
});

process.exit(0);
