import fs from 'fs';
import path from 'path';

const jsonPath = path.resolve(process.cwd(), 'skill-design-meta/ran2_all_skills.json');
const rawData = fs.readFileSync(jsonPath, 'utf8');
const allSkills = JSON.parse(rawData);

const ids = ['archer_qi_005', 'shinbow_spi_005'];

ids.forEach(id => {
  let found = null;
  allSkills.forEach(tree => {
    const s = tree.skills.find(sk => sk.skill_group_id === id);
    if (s) found = s;
  });
  if (found) {
    console.log(`\n【${found.name}】 ID: ${found.skill_group_id}`);
    console.log(`  - 描述: ${found.description}`);
    found.levels.forEach(lv => {
      console.log(`  Lv.${lv.skill_level}: base_stats:`, lv.base_stats);
    });
  }
});

process.exit(0);
