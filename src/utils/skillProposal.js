// 技能資料修正提案：純函式（不依賴瀏覽器或 Firebase）
// 前端提案表單、本地審核面板，以及 scripts/apply_proposals.js 共用

import { BASE_STAT_DEFS, EFFECT_TYPE_DEFS, formatEffect, formatCostRows } from './skillEffects.js'

// 可以透過提案修改的欄位（其餘欄位一律不可異動）
export const EDITABLE_LEVEL_FIELDS = ['base_stats', 'special_effects', 'cost']

export const PROPOSAL_STATUS = {
  pending: '待審核',
  accepted: '已採納',
  withdrawn: '已撤回'
}

export const LIMITS = {
  reason: 1000,
  description: 2000,
  effectType: 20,
  itemName: 30,
  authorCharId: 30,
  textValue: 100
}

const NUMBER_RE = /^[+-]?\d+(\.\d+)?$/
const PERCENT_RE = /^[+-]?\d+(\.\d+)?%$/

const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)))

// 鍵值排序後序列化，用於比較兩個值是否相同（不受屬性順序影響）
export const stableStringify = (v) => {
  if (v === undefined) return 'undefined'
  if (v === null || typeof v !== 'object') return JSON.stringify(v)
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`
  return `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${stableStringify(v[k])}`).join(',')}}`
}

export const isSame = (a, b) => stableStringify(a ?? null) === stableStringify(b ?? null)

// ─────────────────────────────────────────
// 輸入值解析
// ─────────────────────────────────────────

/** 解析 base_stats 的輸入字串 */
export const parseStatInput = (raw, format) => {
  const s = String(raw ?? '').trim()
  if (s === '') return { ok: true, empty: true }
  if (format === 'percent') {
    // 既有資料中部分百分比欄位沒有「%」（例如 accuracy_rate_change: "-2"），一律保留為字串
    if (PERCENT_RE.test(s) || NUMBER_RE.test(s)) return { ok: true, value: s }
    return { ok: false, error: '請輸入百分比，例如 -50% 或 20%' }
  }
  if (NUMBER_RE.test(s)) return { ok: true, value: Number(s) }
  return { ok: false, error: '請輸入數字' }
}

/** 解析特殊效果參數的輸入字串；format 未定義時自動判斷 */
export const parseEffectParam = (raw, format) => {
  const s = String(raw ?? '').trim()
  if (s === '') return { ok: true, empty: true }
  if (format === 'list') {
    const list = s.split(/[、,，]/).map(x => x.trim()).filter(Boolean)
    if (list.some(x => x.length > LIMITS.textValue)) return { ok: false, error: '項目過長' }
    return { ok: true, value: list }
  }
  if (format === 'percent') {
    if (PERCENT_RE.test(s)) return { ok: true, value: s }
    return { ok: false, error: '請輸入百分比，例如 -20%' }
  }
  if (format === 'ratio' || format === 'number') {
    if (NUMBER_RE.test(s)) return { ok: true, value: Number(s) }
    return { ok: false, error: '請輸入數字' }
  }
  // 自訂參數：數字就存數字，否則存文字
  if (NUMBER_RE.test(s)) return { ok: true, value: Number(s) }
  if (s.length > LIMITS.textValue) return { ok: false, error: '內容過長' }
  return { ok: true, value: s }
}

const inferFormat = (value) => {
  if (Array.isArray(value)) return 'list'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'string' && PERCENT_RE.test(value)) return 'percent'
  return 'text'
}

const toInputString = (value) => {
  if (value === undefined || value === null) return ''
  if (Array.isArray(value)) return value.join('、')
  return String(value)
}

// ─────────────────────────────────────────
// 等級資料 ⇄ 表單草稿
// ─────────────────────────────────────────

/** 取得某等級可編輯欄位的快照 */
export const getLevelSnapshot = (levelData) => ({
  base_stats: clone(levelData?.base_stats || {}),
  special_effects: clone(levelData?.special_effects || []),
  cost: levelData?.cost ? clone(levelData.cost) : null
})

const effectToDraft = (eff) => {
  const type = eff?.effect_type || ''
  const def = EFFECT_TYPE_DEFS[type]
  const params = []
  if (def) {
    def.params.forEach(p => {
      params.push({ key: p.key, label: p.label, format: p.format, optional: !!p.optional, fixed: true, value: toInputString(eff[p.key]) })
    })
  }
  Object.keys(eff || {}).forEach(k => {
    if (k === 'effect_type') return
    if (def && def.params.some(p => p.key === k)) return
    params.push({ key: k, label: k, format: inferFormat(eff[k]), optional: true, fixed: false, value: toInputString(eff[k]) })
  })
  return { type, isCustom: !def, params }
}

/** 建立一筆新的空白特殊效果草稿 */
export const newEffectDraft = (type) => {
  if (type && EFFECT_TYPE_DEFS[type]) return effectToDraft({ effect_type: type })
  return { type: type || '', isCustom: true, params: [] }
}

/** 等級資料 → 表單草稿（全部轉成字串，方便雙向綁定） */
export const levelToDraft = (levelData) => {
  const snap = getLevelSnapshot(levelData)
  return {
    base_stats: Object.keys(snap.base_stats).map(key => ({ key, value: toInputString(snap.base_stats[key]) })),
    special_effects: snap.special_effects.map(effectToDraft),
    cost: {
      enabled: !!snap.cost,
      mp: toInputString(snap.cost?.mp ?? 0),
      sp: toInputString(snap.cost?.sp ?? 0),
      other: (snap.cost?.other || []).map(o => ({ item: o.item || '', amount: toInputString(o.amount ?? 1) }))
    }
  }
}

/** 表單草稿 → 等級資料；回傳 { value, errors } */
export const draftToLevel = (draft) => {
  const errors = []
  const value = { base_stats: {}, special_effects: [], cost: null }

  // base_stats
  const seen = new Set()
  ;(draft?.base_stats || []).forEach(row => {
    const def = BASE_STAT_DEFS[row.key]
    if (!def) {
      errors.push(`未知的基礎數值欄位：${row.key}`)
      return
    }
    if (seen.has(row.key)) {
      errors.push(`基礎數值「${def.label}」重複`)
      return
    }
    seen.add(row.key)
    const r = parseStatInput(row.value, def.format)
    if (!r.ok) errors.push(`基礎數值「${def.label}」：${r.error}`)
    else if (!r.empty) value.base_stats[row.key] = r.value
  })

  // special_effects
  ;(draft?.special_effects || []).forEach((eff, idx) => {
    const type = String(eff.type || '').trim()
    const label = `特殊效果 #${idx + 1}`
    if (!type) {
      errors.push(`${label}：請填寫效果類型`)
      return
    }
    if (type.length > LIMITS.effectType) {
      errors.push(`${label}：類型名稱過長（上限 ${LIMITS.effectType} 字）`)
      return
    }
    const out = { effect_type: type }
    const keys = new Set()
    ;(eff.params || []).forEach(p => {
      const key = String(p.key || '').trim()
      if (!key) {
        if (String(p.value || '').trim() !== '') errors.push(`${label}：有參數未填寫名稱`)
        return
      }
      if (key === 'effect_type' || keys.has(key)) {
        errors.push(`${label}：參數「${key}」重複`)
        return
      }
      keys.add(key)
      const r = parseEffectParam(p.value, p.format === 'text' ? undefined : p.format)
      if (!r.ok) errors.push(`${label}「${p.label || key}」：${r.error}`)
      else if (r.empty) {
        if (p.fixed && !p.optional) errors.push(`${label}「${p.label || key}」：必填`)
      } else out[key] = r.value
    })
    value.special_effects.push(out)
  })

  // cost
  const c = draft?.cost
  if (c && c.enabled) {
    const cost = {}
    ;['mp', 'sp'].forEach(k => {
      const r = parseStatInput(c[k] === '' ? '0' : c[k], 'number')
      if (!r.ok || r.value < 0) errors.push(`${k.toUpperCase()} 消耗：請輸入 0 以上的數字`)
      else cost[k] = r.value
    })
    const other = []
    ;(c.other || []).forEach((o, idx) => {
      const item = String(o.item || '').trim()
      if (!item) {
        if (String(o.amount || '').trim() !== '') errors.push(`其他消耗 #${idx + 1}：請填寫道具名稱`)
        return
      }
      if (item.length > LIMITS.itemName) {
        errors.push(`其他消耗「${item}」：名稱過長`)
        return
      }
      const amount = String(o.amount ?? '').trim() === '' ? 1 : Number(o.amount)
      if (!Number.isInteger(amount) || amount <= 0) {
        errors.push(`其他消耗「${item}」：數量需為正整數`)
        return
      }
      other.push({ item, amount })
    })
    if (other.length > 0) cost.other = other
    value.cost = cost
  }

  return { value, errors }
}

/**
 * 「套用到其他等級」：把來源等級中「有變動的部分」複製到目標等級
 * - base_stats：只複製有變動（新增、修改、刪除）的欄位
 * - special_effects、cost：有變動就整組取代
 */
export const propagateLevelChanges = (sourceOriginal, sourceEdited, targetCurrent) => {
  const result = clone(targetCurrent)
  const ob = sourceOriginal.base_stats || {}
  const eb = sourceEdited.base_stats || {}
  const keys = new Set([...Object.keys(ob), ...Object.keys(eb)])
  keys.forEach(k => {
    if (isSame(ob[k], eb[k])) return
    if (eb[k] === undefined) delete result.base_stats[k]
    else result.base_stats[k] = clone(eb[k])
  })
  if (!isSame(sourceOriginal.special_effects, sourceEdited.special_effects)) {
    result.special_effects = clone(sourceEdited.special_effects)
  }
  if (!isSame(sourceOriginal.cost, sourceEdited.cost)) {
    result.cost = clone(sourceEdited.cost)
  }
  return result
}

// ─────────────────────────────────────────
// 建立／驗證提案
// ─────────────────────────────────────────

const findSkillInTrees = (trees, skillGroupId) => {
  for (let t = 0; t < (trees || []).length; t++) {
    const tree = trees[t]
    const s = (tree.skills || []).findIndex(sk => sk.skill_group_id === skillGroupId)
    if (s >= 0) return { treeIndex: t, skillIndex: s, tree, skill: tree.skills[s] }
  }
  return null
}

/**
 * 比較原始技能與編輯後的結果，產生提案物件（只包含有變動的部分）
 * @param {object} args
 * @param {object} args.tree           技能樹（需有 id、job、skill_tree）
 * @param {object} args.skill          原始技能群組
 * @param {string} args.description    編輯後的技能說明
 * @param {object} args.editedLevels   { [skill_level]: { base_stats, special_effects, cost } }
 */
export const buildProposal = ({ tree, skill, description, editedLevels, reason, author }) => {
  const changes = {}
  const before = {}

  if (description !== undefined && String(description).trim() !== String(skill.description || '').trim()) {
    changes.description = String(description).trim()
    before.description = skill.description || ''
  }

  const changedLevels = {}
  const beforeLevels = {}
  Object.keys(editedLevels || {}).forEach(lvKey => {
    const lvNum = Number(lvKey)
    const original = (skill.levels || []).find(l => l.skill_level === lvNum)
    if (!original) return
    const orig = getLevelSnapshot(original)
    const edited = editedLevels[lvKey]
    const lvChange = {}
    const lvBefore = {}
    EDITABLE_LEVEL_FIELDS.forEach(f => {
      if (!isSame(orig[f], edited[f])) {
        lvChange[f] = clone(edited[f] ?? null)
        lvBefore[f] = clone(orig[f])
      }
    })
    if (Object.keys(lvChange).length > 0) {
      changedLevels[lvNum] = lvChange
      beforeLevels[lvNum] = lvBefore
    }
  })
  if (Object.keys(changedLevels).length > 0) {
    changes.levels = changedLevels
    before.levels = beforeLevels
  }

  return {
    skillGroupId: skill.skill_group_id,
    skillName: skill.name,
    treeId: tree?.id || '',
    job: tree?.job || '',
    skillTree: tree?.skill_tree || '',
    levels: Object.keys(changedLevels).map(Number).sort((a, b) => a - b),
    changes,
    before,
    reason: String(reason || '').trim(),
    // 只記錄角色名稱；識別碼可用來登入他人帳號，任何地方都不儲存、不顯示
    authorCharId: author?.charId || '',
    status: 'pending',
    reviewNote: '',
    createdAt: Date.now(),
    reviewedAt: null
  }
}

const isValidEffect = (eff) => {
  if (!eff || typeof eff !== 'object' || Array.isArray(eff)) return false
  if (typeof eff.effect_type !== 'string' || !eff.effect_type.trim() || eff.effect_type.length > LIMITS.effectType) return false
  return Object.keys(eff).every(k => {
    if (k === 'effect_type') return true
    const v = eff[k]
    if (typeof v === 'number') return Number.isFinite(v)
    if (typeof v === 'string') return v.length <= LIMITS.textValue
    if (Array.isArray(v)) return v.every(x => typeof x === 'string' && x.length <= LIMITS.textValue)
    return false
  })
}

const isValidCost = (cost) => {
  if (cost === null) return true
  if (!cost || typeof cost !== 'object') return false
  const keysOk = Object.keys(cost).every(k => ['mp', 'sp', 'other'].includes(k))
  const numOk = ['mp', 'sp'].every(k => cost[k] === undefined || (typeof cost[k] === 'number' && cost[k] >= 0))
  const otherOk = cost.other === undefined || (Array.isArray(cost.other) && cost.other.every(o =>
    o && typeof o.item === 'string' && o.item.trim() && o.item.length <= LIMITS.itemName &&
    Number.isInteger(o.amount) && o.amount > 0 && Object.keys(o).every(k => ['item', 'amount'].includes(k))
  ))
  return keysOk && numOk && otherOk
}

/** 驗證提案內容；回傳錯誤訊息陣列（空陣列代表通過） */
export const validateProposal = (p) => {
  const errors = []
  if (!p || typeof p !== 'object') return ['提案格式錯誤']
  if (!p.skillGroupId) errors.push('缺少技能代碼')
  // 只有登入的使用者可以提案：提案人的角色名稱必填
  if (typeof p.authorCharId !== 'string' || !p.authorCharId.trim()) errors.push('請先登入再提出修正提案')
  else if (p.authorCharId.length > LIMITS.authorCharId) errors.push('角色名稱過長')
  if (!p.reason) errors.push('請填寫修正理由')
  else if (p.reason.length > LIMITS.reason) errors.push(`修正理由過長（上限 ${LIMITS.reason} 字）`)

  const changes = p.changes || {}
  const allowedTop = ['description', 'levels']
  if (Object.keys(changes).some(k => !allowedTop.includes(k))) errors.push('包含不允許修改的欄位')
  if (changes.description === undefined && !changes.levels) errors.push('沒有任何修改內容')
  if (changes.description !== undefined) {
    if (typeof changes.description !== 'string' || !changes.description.trim()) errors.push('技能說明不可為空白')
    else if (changes.description.length > LIMITS.description) errors.push(`技能說明過長（上限 ${LIMITS.description} 字）`)
  }
  Object.entries(changes.levels || {}).forEach(([lv, lvChange]) => {
    Object.keys(lvChange || {}).forEach(field => {
      if (!EDITABLE_LEVEL_FIELDS.includes(field)) errors.push(`Lv${lv}：不允許修改「${field}」`)
    })
    if (lvChange.base_stats !== undefined) {
      const bs = lvChange.base_stats
      if (!bs || typeof bs !== 'object' || Array.isArray(bs)) errors.push(`Lv${lv}：基礎數值格式錯誤`)
      else Object.entries(bs).forEach(([k, v]) => {
        const def = BASE_STAT_DEFS[k]
        if (!def) errors.push(`Lv${lv}：未知的基礎數值欄位 ${k}`)
        else if (def.format === 'percent' ? !(typeof v === 'string' && (PERCENT_RE.test(v) || NUMBER_RE.test(v))) : !(typeof v === 'number' && Number.isFinite(v))) {
          errors.push(`Lv${lv}：基礎數值「${def.label}」格式錯誤`)
        }
      })
    }
    if (lvChange.special_effects !== undefined) {
      if (!Array.isArray(lvChange.special_effects) || !lvChange.special_effects.every(isValidEffect)) {
        errors.push(`Lv${lv}：特殊效果格式錯誤`)
      }
    }
    if (lvChange.cost !== undefined && !isValidCost(lvChange.cost)) {
      errors.push(`Lv${lv}：技能消耗格式錯誤`)
    }
  })
  return errors
}

// ─────────────────────────────────────────
// 套用提案
// ─────────────────────────────────────────

/**
 * 將單一提案套用到技能樹（不修改傳入的資料，回傳新的陣列）
 * @returns {{ trees: object[], applied: boolean, warnings: string[] }}
 */
export const applyProposal = (trees, proposal) => {
  const warnings = []
  const found = findSkillInTrees(trees, proposal.skillGroupId)
  if (!found) return { trees, applied: false, warnings: [`找不到技能 ${proposal.skillGroupId}`] }

  const skill = clone(found.skill)
  const changes = proposal.changes || {}
  if (changes.description !== undefined) skill.description = changes.description

  Object.entries(changes.levels || {}).forEach(([lv, lvChange]) => {
    const level = skill.levels.find(l => l.skill_level === Number(lv))
    if (!level) {
      warnings.push(`技能 ${skill.name} 沒有 Lv${lv}`)
      return
    }
    EDITABLE_LEVEL_FIELDS.forEach(f => {
      if (lvChange[f] === undefined) return
      if (f === 'cost' && lvChange.cost === null) delete level.cost
      else level[f] = clone(lvChange[f])
    })
  })

  const newTrees = trees.slice()
  const newTree = { ...found.tree, skills: found.tree.skills.slice() }
  newTree.skills[found.skillIndex] = skill
  newTrees[found.treeIndex] = newTree
  return { trees: newTrees, applied: true, warnings }
}

/** 依審核時間先後套用所有「已採納」的提案 */
export const applyAcceptedProposals = (trees, proposals) => {
  const accepted = (proposals || [])
    .filter(p => p.status === 'accepted')
    .sort((a, b) => (a.reviewedAt || 0) - (b.reviewedAt || 0))
  let current = trees
  const warnings = []
  const appliedIds = []
  accepted.forEach(p => {
    const r = applyProposal(current, p)
    current = r.trees
    warnings.push(...r.warnings)
    if (r.applied) appliedIds.push(p.id)
  })
  return { trees: current, warnings, appliedIds }
}

/**
 * 檢查提案送出後，原始資料是否已經改變（例如之後有其他提案被採納，或重新上傳了技能資料）
 * 回傳不一致的項目說明；空陣列代表一致
 */
export const checkStale = (trees, proposal) => {
  const found = findSkillInTrees(trees, proposal.skillGroupId)
  if (!found) return ['找不到原技能']
  const issues = []
  const before = proposal.before || {}
  if (before.description !== undefined && (found.skill.description || '') !== before.description) {
    issues.push('技能說明')
  }
  Object.entries(before.levels || {}).forEach(([lv, lvBefore]) => {
    const level = found.skill.levels.find(l => l.skill_level === Number(lv))
    const snap = getLevelSnapshot(level)
    Object.keys(lvBefore).forEach(f => {
      if (!isSame(snap[f], lvBefore[f])) issues.push(`Lv${lv} ${FIELD_LABELS[f]}`)
    })
  })
  return issues
}

// ─────────────────────────────────────────
// 差異說明（審核畫面用）
// ─────────────────────────────────────────

export const FIELD_LABELS = {
  description: '技能說明',
  base_stats: '基礎數值',
  special_effects: '特殊效果',
  cost: '技能消耗'
}

const statLabel = (k) => BASE_STAT_DEFS[k]?.label || k
const fmt = (v) => (v === undefined ? '（無）' : Array.isArray(v) ? v.join('、') : String(v))
const effectsText = (list) => (list && list.length ? list.map(e => formatEffect(e).text).join('；') : '（無）')
const costText = (cost) => (cost ? formatCostRows(cost).map(r => `${r.label} ${r.value}`).join('、') : '（無）')

/**
 * 產生人類可讀的差異列表
 * @returns {Array<{ scope: string, label: string, before: string, after: string }>}
 */
export const describeChanges = (proposal) => {
  const rows = []
  const changes = proposal.changes || {}
  const before = proposal.before || {}
  if (changes.description !== undefined) {
    rows.push({ scope: '全等級', label: '技能說明', before: before.description || '（無）', after: changes.description })
  }
  Object.keys(changes.levels || {}).map(Number).sort((a, b) => a - b).forEach(lv => {
    const c = changes.levels[lv]
    const b = (before.levels || {})[lv] || {}
    const scope = `Lv${lv}`
    if (c.base_stats !== undefined) {
      const ob = b.base_stats || {}
      const nb = c.base_stats || {}
      new Set([...Object.keys(ob), ...Object.keys(nb)]).forEach(k => {
        if (isSame(ob[k], nb[k])) return
        rows.push({ scope, label: statLabel(k), before: fmt(ob[k]), after: fmt(nb[k]) })
      })
    }
    if (c.special_effects !== undefined) {
      rows.push({ scope, label: '特殊效果', before: effectsText(b.special_effects), after: effectsText(c.special_effects) })
    }
    if (c.cost !== undefined) {
      rows.push({ scope, label: '技能消耗', before: costText(b.cost), after: costText(c.cost) })
    }
  })
  return rows
}
