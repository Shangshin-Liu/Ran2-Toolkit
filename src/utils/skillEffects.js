// 技能數值與特殊效果的共用定義
// 供配點模擬的顯示（Simulator.vue）與技能修正提案表單（SkillProposalModal.vue）共同使用

/**
 * base_stats 各欄位定義
 * format:
 *  - number:  純數字（例如 hp_change: 2）
 *  - seconds: 秒數（顯示時加上「秒」）
 *  - percent: 百分比字串（例如 "-50%"）
 *  - signed_percent: 數字，但顯示為 +N%（例如 evasion_rate_change: 5）
 */
export const BASE_STAT_DEFS = {
  hp_change: { label: '傷害', format: 'number' },
  target_count: { label: '目標數', format: 'number' },
  range: { label: '射程', format: 'number' },
  angle: { label: '攻擊角度', format: 'number' },
  duration: { label: '持續時間', format: 'seconds' },
  cast_time: { label: '冷卻時間', format: 'seconds' },
  delay_time: { label: '冷卻時間', format: 'seconds' },
  evasion_rate_change: { label: '迴避率變化', format: 'signed_percent' },
  accuracy_rate_change: { label: '命中率變化', format: 'percent' },
  attack_change: { label: '攻擊力變化', format: 'number' },
  attack_value_change: { label: '攻擊值變化', format: 'number' },
  attack_rate_change: { label: '攻擊率變化', format: 'percent' },
  defense_rate_change: { label: '防禦率變化', format: 'percent' },
  defense_value_change: { label: '防禦值變化', format: 'number' },
  combat_value: { label: '格鬥值變化', format: 'number' },
  spirit_value: { label: '氣力值變化', format: 'number' },
  hp_rate_change: { label: 'HP 變化率', format: 'percent' },
  hp_increase_rate: { label: 'HP上限增加率', format: 'percent' },
  mp_rate_change: { label: 'MP 變化率', format: 'percent' },
  sp_rate: { label: 'SP 變化率', format: 'percent' },
  hp_mp_sp_rate: { label: 'HP/MP/SP變化率', format: 'percent' },
  magic_value: { label: '魔力值變化', format: 'number' },
  shoot_value: { label: '射擊值變化', format: 'number' },
  critical_rate: { label: '爆擊率變化', format: 'signed_percent' },
  detox_value: { label: '解毒效果值', format: 'number' },
  continuous_hit_value: { label: '持續打擊間隔', format: 'seconds' },
  resistance_change: { label: '抗性變化', format: 'number' }
}

/**
 * 既有的 special_effects.effect_type 定義
 * params 的 format:
 *  - ratio:   小數機率／比例（0.2 代表 20%）
 *  - number:  數字
 *  - percent: 百分比字串（例如 "-20%"）
 *  - list:    字串陣列（以「、」分隔輸入）
 */
export const EFFECT_TYPE_DEFS = {
  '拉/推': {
    icon: '⚡',
    params: [
      { key: 'probability', label: '機率', format: 'ratio' },
      { key: 'distance', label: '距離', format: 'number', optional: true }
    ]
  },
  '昏厥': {
    icon: '💫',
    params: [{ key: 'probability', label: '機率', format: 'ratio' }]
  },
  '移動速度': {
    icon: '🏃',
    params: [
      { key: 'speed_rate', label: '移動速度變化', format: 'ratio', optional: true },
      { key: 'probability', label: '發動率', format: 'ratio', optional: true }
    ]
  },
  '攻擊速度': {
    icon: '⚔️',
    params: [
      { key: 'attack_speed_rate', label: '攻擊速度變化', format: 'percent' },
      { key: 'probability', label: '發動率', format: 'ratio', optional: true },
      { key: 'speed_rate', label: '減速', format: 'ratio', optional: true }
    ]
  },
  '燃燒': {
    icon: '🔥',
    params: [
      { key: 'probability', label: '機率', format: 'ratio' },
      { key: 'continuous_hit', label: '每次傷害', format: 'number' }
    ]
  },
  '冰凍': {
    icon: '❄️',
    params: [
      { key: 'probability', label: '機率', format: 'ratio' },
      { key: 'freeze_speed_rate', label: '減速', format: 'percent' },
      { key: 'hit_bonus_rate', label: '傷害加成', format: 'percent' }
    ]
  },
  '中毒': {
    icon: '🤢',
    params: [
      { key: 'probability', label: '機率', format: 'ratio' },
      { key: 'continuous_hit', label: '每次傷害', format: 'number' }
    ]
  },
  '貫穿程度': {
    icon: '🏹',
    params: [{ key: 'penetrate_value', label: '貫穿目標數', format: 'number' }]
  },
  '防止狀態異常': {
    icon: '🛡️',
    params: [{ key: 'immune_states', label: '免疫狀態', format: 'list' }]
  }
}

export const CUSTOM_EFFECT_ICON = '✨'

const formatParamValue = (value) => {
  if (Array.isArray(value)) return value.join('、')
  if (value === null || value === undefined) return ''
  return String(value)
}

/**
 * 將單筆特殊效果轉為顯示文字。
 * 既有 9 種類型維持原本的顯示格式；未定義的類型（例如使用者自訂）以「類型 參數:值」通用格式顯示。
 */
export const formatEffect = (eff) => {
  if (!eff || typeof eff !== 'object') return { text: '', icon: '' }
  const type = eff.effect_type

  if (type === '拉/推') {
    return { text: `拉/推 ${eff.probability * 100}% 距離 ${eff.distance}`, icon: '⚡' }
  }
  if (type === '移動速度') {
    const probStr = eff.probability !== undefined ? ` 發動率 ${eff.probability * 100}%` : ''
    return { text: `移動速度 ${eff.speed_rate > 0 ? '+' : ''}${eff.speed_rate * 100}%${probStr}`, icon: '🏃' }
  }
  if (type === '中毒') {
    return { text: `中毒 ${eff.probability * 100}% 傷害 ${eff.continuous_hit}/tick`, icon: '🤢' }
  }
  if (type === '燃燒') {
    return { text: `燃燒 ${eff.probability * 100}% 傷害 ${eff.continuous_hit}/tick`, icon: '🔥' }
  }
  if (type === '攻擊速度') {
    const probStr = eff.probability !== undefined ? ` 發動率 ${eff.probability * 100}%` : ''
    const speedStr = eff.speed_rate !== undefined ? ` 減速 ${eff.speed_rate * 100}%` : ''
    return { text: `攻擊速度 ${eff.attack_speed_rate}${probStr}${speedStr}`, icon: '⚔️' }
  }
  if (type === '冰凍') {
    return { text: `冰凍 ${eff.probability * 100}% 減速 ${eff.freeze_speed_rate} 傷害加成 ${eff.hit_bonus_rate}`, icon: '❄️' }
  }
  if (type === '昏厥') {
    return { text: `昏厥 ${eff.probability * 100}%`, icon: '💫' }
  }
  if (type === '貫穿程度') {
    return { text: `貫穿 ${eff.penetrate_value} 目標`, icon: '🏹' }
  }
  if (type === '防止狀態異常') {
    const states = eff.immune_states || []
    return { text: `免疫：${states.join('、')}`, icon: '🛡️' }
  }

  // 通用格式：未知或自訂類型
  const parts = Object.keys(eff)
    .filter(k => k !== 'effect_type')
    .map(k => `${k}: ${formatParamValue(eff[k])}`)
  const name = type ? String(type) : '未命名效果'
  return {
    text: parts.length > 0 ? `${name}（${parts.join('，')}）` : name,
    icon: CUSTOM_EFFECT_ICON
  }
}

/**
 * 將 cost 轉為顯示列。缺少 mp/sp 時以 0 顯示，other 中的道具逐筆列出。
 */
export const formatCostRows = (cost) => {
  if (!cost || typeof cost !== 'object') return []
  const rows = [
    { key: 'mp', label: 'MP 消耗', value: String(cost.mp ?? 0) },
    { key: 'sp', label: 'SP 消耗', value: String(cost.sp ?? 0) }
  ]
  if (Array.isArray(cost.other)) {
    cost.other.forEach((o, idx) => {
      if (!o || !o.item) return
      rows.push({ key: `other_${idx}`, label: `${o.item} 消耗`, value: String(o.amount ?? 1) })
    })
  }
  return rows
}
