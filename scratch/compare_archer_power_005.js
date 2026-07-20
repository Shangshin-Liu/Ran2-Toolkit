import fs from 'fs';
import path from 'path';

const jsonPath = path.resolve(process.cwd(), 'skill-design-meta/ran2_all_skills.json');
const rawData = fs.readFileSync(jsonPath, 'utf8');
const allSkills = JSON.parse(rawData);

let normal = null;
let ultimate = null;

allSkills.forEach(tree => {
  tree.skills.forEach(skill => {
    if (skill.skill_group_id === 'archer_power_005') normal = skill;
    if (skill.skill_group_id === 'shinbow_str_005') ultimate = skill;
  });
});

console.log('--- 弓術修練 比對 ---');
if (normal) {
  console.log(`普通版: ${normal.name} | ID: ${normal.skill_group_id}`);
  normal.levels.forEach(lv => {
    const pre = lv.learn_condition && lv.learn_condition.prerequisite;
    console.log(`  Lv.${lv.skill_level}: character_level = ${lv.learn_condition.character_level}, prerequisite = ${pre ? pre.skill_name + ' Lv.' + pre.required_skill_level : '無'}, base_stats =`, lv.base_stats);
  });
}

console.log('\n--- 奧義：弓術修練 比對 ---');
if (ultimate) {
  console.log(`奧義版: ${ultimate.name} | ID: ${ultimate.skill_group_id}`);
  ultimate.levels.forEach(lv => {
    const pre = lv.learn_condition && lv.learn_condition.prerequisite;
    console.log(`  Lv.${lv.skill_level}: character_level = ${lv.learn_condition.character_level}, prerequisite = ${pre ? pre.skill_name + ' Lv.' + pre.required_skill_level : '無'}, base_stats =`, lv.base_stats);
  });
}

process.exit(0);
