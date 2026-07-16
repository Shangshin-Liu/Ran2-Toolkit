import fs from 'fs';
import path from 'path';

const jsonPath = path.resolve(process.cwd(), 'skill-design-meta/ran2_all_skills.json');
const rawData = fs.readFileSync(jsonPath, 'utf8');
const allSkills = JSON.parse(rawData);

// 公告數值定義
const specs = {
  // 1. 覺醒
  '覺醒': {
    ids: ['kakuto_com_008', 'shintou_com_008'],
    delay_time: 80,
    duration: 60,
    levels: [
      { attack_rate_change: '-20%', defense_value_change: 5, attack_speed_rate: '-20%' },
      { attack_rate_change: '-15%', defense_value_change: 10, attack_speed_rate: '-30%' },
      { attack_rate_change: '-10%', defense_value_change: 15, attack_speed_rate: '-30%' },
      { attack_rate_change: '-5%', defense_value_change: 20, attack_speed_rate: '-30%' }
    ]
  },
  // 2. 光影
  '光影': {
    ids: ['kendo_com_007', 'shinken_com_007'],
    delay_time: 80,
    duration: 60,
    levels: [
      { defense_rate_change: '-30%', critical_rate: 1, attack_speed_rate: '-20%' },
      { defense_rate_change: '-25%', critical_rate: 2, attack_speed_rate: '-30%' },
      { defense_rate_change: '-20%', critical_rate: 3, attack_speed_rate: '-30%' },
      { defense_rate_change: '-15%', critical_rate: 4, attack_speed_rate: '-30%' }
    ]
  },
  // 3. 迅捷
  '迅捷': {
    ids: ['archer_com_008', 'shinbow_com_008'],
    delay_time: 80,
    duration: 60,
    levels: [
      { evasion_rate_change: 5, accuracy_rate_change: '-20%', attack_speed_rate: '-20%' },
      { evasion_rate_change: 10, accuracy_rate_change: '-15%', attack_speed_rate: '-30%' },
      { evasion_rate_change: 15, accuracy_rate_change: '-10%', attack_speed_rate: '-30%' },
      { evasion_rate_change: 20, accuracy_rate_change: '-5%', attack_speed_rate: '-30%' }
    ]
  },
  // 4. 風靈護體
  '風靈護體': {
    ids: ['qigong_com_010', 'shinki_com_006'],
    delay_time: 80,
    duration: 60,
    levels: [
      { resistance_change: -25, evasion_rate_change: 5, attack_speed_rate: '-10%' },
      { resistance_change: -20, evasion_rate_change: 10, attack_speed_rate: '-20%' },
      { resistance_change: -15, evasion_rate_change: 15, attack_speed_rate: '-30%' },
      { resistance_change: -10, evasion_rate_change: 20, attack_speed_rate: '-30%' },
      { resistance_change: -5, evasion_rate_change: 25, attack_speed_rate: '-30%' }
    ]
  },
  // 5. 劍影無形
  '劍影無形': {
    ids: ['kendo_stab_012', 'shinken_agi_012'],
    delay_time: 120,
    levels: [
      { duration: 60, hp_mp_sp_rate: '-0.20%', attack_speed_rate: '-20%' },
      { duration: 65, hp_mp_sp_rate: '-0.40%', attack_speed_rate: '-24%' },
      { duration: 70, hp_mp_sp_rate: '-0.60%', attack_speed_rate: '-32%' },
      { duration: 75, hp_mp_sp_rate: '-0.80%', attack_speed_rate: '-40%' },
      { duration: 80, hp_mp_sp_rate: '-1.00%', attack_speed_rate: '-48%' },
      { duration: 85, hp_mp_sp_rate: '-1.20%', attack_speed_rate: '-56%' },
      { duration: 90, hp_mp_sp_rate: '-1.40%', attack_speed_rate: '-64%' },
      { duration: 95, hp_mp_sp_rate: '-1.60%', attack_speed_rate: '-72%' },
      { duration: 100, hp_mp_sp_rate: '-1.80%', attack_speed_rate: '-80%' }
    ]
  },
  // 6. 劍奇法印
  '劍奇法印': {
    ids: ['shinken_spi_019'],
    delay_time: 100,
    levels: [
      { duration: 90, target_count: 1, defense_value_change: 10, attack_speed_rate: '-20%' },
      { duration: 92, target_count: 1, defense_value_change: 12, attack_speed_rate: '-25%' },
      { duration: 92, target_count: 1, defense_value_change: 15, attack_speed_rate: '-30%' },
      { duration: 94, target_count: 1, defense_value_change: 17, attack_speed_rate: '-35%' },
      { duration: 94, target_count: 1, defense_value_change: 20, attack_speed_rate: '-41%' },
      { duration: 96, target_count: 1, defense_value_change: 23, attack_speed_rate: '-47%' },
      { duration: 96, target_count: 1, defense_value_change: 25, attack_speed_rate: '-53%' },
      { duration: 98, target_count: 1, defense_value_change: 27, attack_speed_rate: '-59%' },
      { duration: 100, target_count: 1, defense_value_change: 30, attack_speed_rate: '-65%' }
    ]
  },
  // 7. 連環箭
  '連環箭': {
    ids: ['archer_power_014', 'shinbow_str_014'],
    delay_time: 120,
    levels: [
      { duration: 60, evasion_rate_change: -4, attack_speed_rate: '-20%' },
      { duration: 65, evasion_rate_change: -8, attack_speed_rate: '-22%' },
      { duration: 70, evasion_rate_change: -12, attack_speed_rate: '-26%' },
      { duration: 75, evasion_rate_change: -16, attack_speed_rate: '-30%' },
      { duration: 80, evasion_rate_change: -20, attack_speed_rate: '-34%' },
      { duration: 85, evasion_rate_change: -24, attack_speed_rate: '-38%' },
      { duration: 90, evasion_rate_change: -28, attack_speed_rate: '-42%' },
      { duration: 95, evasion_rate_change: -32, attack_speed_rate: '-46%' },
      { duration: 100, evasion_rate_change: -36, attack_speed_rate: '-50%' }
    ]
  },
  // 8. 快速施法
  '快速施法': {
    ids: ['qigong_atk_015', 'shinki_spi_atk_015'],
    delay_time: 120,
    levels: [
      { duration: 60, spirit_value: 50, attack_speed_rate: '-20%' },
      { duration: 65, spirit_value: 60, attack_speed_rate: '-22%' },
      { duration: 70, spirit_value: 70, attack_speed_rate: '-26%' },
      { duration: 75, spirit_value: 80, attack_speed_rate: '-30%' },
      { duration: 80, spirit_value: 90, attack_speed_rate: '-34%' },
      { duration: 85, spirit_value: 100, attack_speed_rate: '-38%' },
      { duration: 90, spirit_value: 110, attack_speed_rate: '-42%' },
      { duration: 95, spirit_value: 120, attack_speed_rate: '-46%' },
      { duration: 100, spirit_value: 130, attack_speed_rate: '-50%' }
    ]
  },
  // 9. 不動如山
  '不動如山': {
    ids: ['kakuto_foot_014', 'shintou_str_014'],
    delay_time: 110,
    levels: [
      { duration: 50, defense_rate_change: '4%', resistance_change: 10, speed_rate: -0.3 },
      { duration: 55, defense_rate_change: '6%', resistance_change: 15, speed_rate: -0.3 },
      { duration: 60, defense_rate_change: '8%', resistance_change: 20, speed_rate: -0.3 },
      { duration: 65, defense_rate_change: '10%', resistance_change: 25, speed_rate: -0.3 },
      { duration: 70, defense_rate_change: '12%', resistance_change: 30, speed_rate: -0.3 },
      { duration: 75, defense_rate_change: '14%', resistance_change: 35, speed_rate: -0.3 },
      { duration: 80, defense_rate_change: '16%', resistance_change: 40, speed_rate: -0.3 },
      { duration: 85, defense_rate_change: '18%', resistance_change: 45, speed_rate: -0.3 },
      { duration: 90, defense_rate_change: '20%', resistance_change: 50, speed_rate: -0.3 }
    ]
  },
  // 10. 紫氣玄流
  '紫氣玄流': {
    ids: ['shinki_spi_atk_023'],
    delay_time: 10,
    levels: [
      { duration: 120, spirit_value: 60, mp_rate_change: '1.4%' },
      { duration: 130, spirit_value: 80, mp_rate_change: '1.6%' },
      { duration: 140, spirit_value: 100, mp_rate_change: '1.8%' },
      { duration: 150, spirit_value: 120, mp_rate_change: '2.0%' },
      { duration: 160, spirit_value: 140, mp_rate_change: '2.2%' },
      { duration: 170, spirit_value: 160, mp_rate_change: '2.4%' },
      { duration: 180, spirit_value: 180, mp_rate_change: '2.6%' },
      { duration: 190, spirit_value: 200, mp_rate_change: '2.8%' },
      { duration: 200, spirit_value: 220, mp_rate_change: '3.0%' }
    ]
  },
  // 11. 大弱化符
  '大弱化符': {
    ids: ['qigong_atk_012', 'shinki_spi_atk_012'],
    delay_time: 13,
    levels: [
      { duration: 15, range: 150, attack_rate_change: '-6%', defense_value_change: -22, attack_speed_rate: '12%', probability: 0.3 },
      { duration: 17, range: 150, attack_rate_change: '-9%', defense_value_change: -24, attack_speed_rate: '14%', probability: 0.3 },
      { duration: 19, range: 150, attack_rate_change: '-12%', defense_value_change: -26, attack_speed_rate: '16%', probability: 0.3 },
      { duration: 21, range: 150, attack_rate_change: '-15%', defense_value_change: -28, attack_speed_rate: '20%', probability: 0.3 },
      { duration: 23, range: 150, attack_rate_change: '-18%', defense_value_change: -30, attack_speed_rate: '24%', probability: 0.3 },
      { duration: 25, range: 150, attack_rate_change: '-21%', defense_value_change: -32, attack_speed_rate: '28%', probability: 0.3 },
      { duration: 27, range: 150, attack_rate_change: '-24%', defense_value_change: -34, attack_speed_rate: '32%', probability: 0.3 },
      { duration: 29, range: 150, attack_rate_change: '-27%', defense_value_change: -36, attack_speed_rate: '36%', probability: 0.3 },
      { duration: 31, range: 150, attack_rate_change: '-30%', defense_value_change: -38, attack_speed_rate: '40%', probability: 0.3 }
    ]
  },
  // 12. 弱化符
  '弱化符': {
    ids: ['qigong_atk_002', 'shinki_spi_atk_002'],
    delay_time: 8,
    levels: [
      { duration: 15, target_count: 1, range: 150, resistance_change: -20, defense_rate_change: '-6%' },
      { duration: 17, target_count: 1, range: 150, resistance_change: -30, defense_rate_change: '-9%' },
      { duration: 19, target_count: 1, range: 150, resistance_change: -40, defense_rate_change: '-12%' },
      { duration: 21, target_count: 1, range: 150, resistance_change: -50, defense_rate_change: '-15%' },
      { duration: 23, target_count: 1, range: 150, resistance_change: -60, defense_rate_change: '-18%' },
      { duration: 25, target_count: 1, range: 150, resistance_change: -70, defense_rate_change: '-21%' },
      { duration: 27, target_count: 1, range: 150, resistance_change: -80, defense_rate_change: '-24%' },
      { duration: 29, target_count: 1, range: 150, resistance_change: -90, defense_rate_change: '-27%' },
      { duration: 31, target_count: 1, range: 150, resistance_change: -100, defense_rate_change: '-30%' }
    ]
  },
  // 13. 拘束指令陣
  '拘束指令陣': {
    ids: ['qigong_sup_017', 'shinki_spi_sup_017'],
    delay_time: 20,
    levels: [
      { range: 150, duration: 2 },
      { range: 150, duration: 2.5 },
      { range: 150, duration: 3 },
      { range: 150, duration: 3.5 },
      { range: 150, duration: 4 },
      { range: 150, duration: 4.5 },
      { range: 150, duration: 5 },
      { range: 150, duration: 5.5 },
      { range: 150, duration: 6 }
    ]
  },
  // 14. 奧義：正氣引歸
  '正氣引歸': {
    ids: ['shinki_spi_sup_024'],
    checkOnly: true
  },
  // 15. 奧義：聖耀天讚
  '聖耀天讚': {
    ids: ['shinki_spi_sup_023'],
    delay_time: 120,
    levels: [
      { duration: 60, hp_rate_change: '1.0%', attack_speed_rate: '-4%' },
      { duration: 65, hp_rate_change: '1.0%', attack_speed_rate: '-6%' },
      { duration: 70, hp_rate_change: '1.0%', attack_speed_rate: '-8%' },
      { duration: 75, hp_rate_change: '1.0%', attack_speed_rate: '-10%' },
      { duration: 80, hp_rate_change: '1.0%', attack_speed_rate: '-12%' },
      { duration: 85, hp_rate_change: '1.0%', attack_speed_rate: '-14%' },
      { duration: 90, hp_rate_change: '1.0%', attack_speed_rate: '-16%' },
      { duration: 95, hp_rate_change: '1.0%', attack_speed_rate: '-18%' },
      { duration: 100, hp_rate_change: '1.0%', attack_speed_rate: '-20%' }
    ]
  },
  // 16. 奧義：迴照大千
  '迴照大千': {
    ids: ['shinki_spi_sup_026'],
    delay_time: 20,
    levels: [
      { duration: 60, hp_increase_rate: '2%', resistance_change: 5 },
      { duration: 90, hp_increase_rate: '3%', resistance_change: 7 },
      { duration: 120, hp_increase_rate: '4%', resistance_change: 10 },
      { duration: 150, hp_increase_rate: '5%', resistance_change: 13 },
      { duration: 180, hp_increase_rate: '6%', resistance_change: 15 },
      { duration: 210, hp_increase_rate: '7%', resistance_change: 17 },
      { duration: 240, hp_increase_rate: '8%', resistance_change: 20 },
      { duration: 270, hp_increase_rate: '9%', resistance_change: 23 },
      { duration: 300, hp_increase_rate: '10%', resistance_change: 25 }
    ]
  },
  // 17. 生命恢復
  '生命恢復': {
    ids: ['qigong_sup_001', 'shinki_spi_sup_001'],
    checkOnly: true,
    appendDesc: '（新增解除「弱化符」技能效果）'
  },
  // 18. 女神的祝福
  '女神的祝福': {
    ids: ['qigong_sup_020', 'shinki_spi_sup_020'],
    checkOnly: true,
    appendDesc: '（新增解除「大弱化符」技能效果）'
  },
  // 19. 千里眼
  '千里眼': {
    ids: ['archer_qi_005', 'shinbow_spi_005'],
    checkOnly: true,
    appendDesc: '（滿級射程提升20）'
  }
};

const diffReport = [];

Object.entries(specs).forEach(([name, spec]) => {
  spec.ids.forEach(id => {
    let foundSkill = null;
    allSkills.forEach(tree => {
      const s = tree.skills.find(sk => sk.skill_group_id === id);
      if (s) foundSkill = s;
    });

    if (!foundSkill) {
      diffReport.push(`❌ 找不到技能 ID: ${id} (${name})`);
      return;
    }

    const skillDiffs = [];

    // 檢查描述
    if (spec.appendDesc) {
      if (!foundSkill.description.includes(spec.appendDesc)) {
        skillDiffs.push(`描述："${foundSkill.description}" ➔ 需追加 "${spec.appendDesc}"`);
      }
    }

    // 正氣引歸的特殊檢查
    if (id === 'shinki_spi_sup_024') {
      foundSkill.levels.forEach(lv => {
        if (lv.base_stats.magic_value !== undefined) {
          skillDiffs.push(`Lv.${lv.skill_level} 包含 magic_value: ${lv.base_stats.magic_value} (應為 shoot_value)`);
        }
      });
    }

    if (spec.checkOnly) {
      if (skillDiffs.length > 0) {
        diffReport.push(`【${foundSkill.name}】(${id}) 需要修改:\n  ` + skillDiffs.join('\n  '));
      }
      return;
    }

    // 檢查通用屬性
    if (spec.delay_time !== undefined) {
      foundSkill.levels.forEach(lv => {
        if (lv.base_stats.delay_time !== spec.delay_time) {
          skillDiffs.push(`Lv.${lv.skill_level} delay_time: ${lv.base_stats.delay_time} ➔ 應改為 ${spec.delay_time}`);
        }
      });
    }

    if (spec.duration !== undefined) {
      foundSkill.levels.forEach(lv => {
        if (lv.base_stats.duration !== spec.duration) {
          skillDiffs.push(`Lv.${lv.skill_level} duration: ${lv.base_stats.duration} ➔ 應改為 ${spec.duration}`);
        }
      });
    }

    // 檢查各等級屬性
    spec.levels.forEach((lvSpec, index) => {
      const lvObj = foundSkill.levels[index];
      if (!lvObj) return;

      Object.entries(lvSpec).forEach(([key, specVal]) => {
        if (key === 'attack_speed_rate' || key === 'speed_rate' || key === 'probability') {
          // 在 special_effects 裡
          if (!lvObj.special_effects) {
            skillDiffs.push(`Lv.${lvObj.skill_level} 缺少 special_effects (需設定 ${key}: ${specVal})`);
          } else {
            const effect = lvObj.special_effects.find(e => {
              if (key === 'attack_speed_rate') return e.effect_type === '攻擊速度';
              if (key === 'speed_rate') return e.effect_type === '移動速度';
              return false;
            });
            if (!effect) {
              skillDiffs.push(`Lv.${lvObj.skill_level} special_effects 缺少對應效果 ${key}`);
            } else {
              const actualVal = effect[key];
              if (actualVal !== specVal) {
                skillDiffs.push(`Lv.${lvObj.skill_level} special_effects ${key}: ${actualVal} ➔ 應改為 ${specVal}`);
              }
              if (key === 'attack_speed_rate' && lvSpec.probability !== undefined) {
                if (effect.probability !== lvSpec.probability) {
                  skillDiffs.push(`Lv.${lvObj.skill_level} special_effects 攻速觸發率: ${effect.probability} ➔ 應改為 ${lvSpec.probability}`);
                }
              }
            }
          }
        } else {
          // 在 base_stats 裡
          const actualVal = lvObj.base_stats[key];
          if (actualVal !== specVal) {
            skillDiffs.push(`Lv.${lvObj.skill_level} base_stats.${key}: ${actualVal} ➔ 應改為 ${specVal}`);
          }
        }
      });
    });

    if (skillDiffs.length > 0) {
      diffReport.push(`【${foundSkill.name}】(${id}) 需要修改:\n  ` + skillDiffs.join('\n  '));
    }
  });
});

fs.writeFileSync(path.resolve(process.cwd(), 'scratch/diff_report.txt'), diffReport.join('\n\n'), 'utf8');
console.log('比對完成，報告已儲存至 scratch/diff_report.txt');
process.exit(0);
