<template>
  <Teleport to="body">
    <transition name="proposal-fade">
      <div v-if="show && skill" class="proposal-overlay" @click.self="emit('close')">
        <div class="proposal-modal" role="dialog" aria-modal="true">
          <div class="proposal-header">
            <span class="proposal-title">📝 提案修正：{{ skill.name }}</span>
            <button class="proposal-close" @click="emit('close')" aria-label="關閉">✕</button>
          </div>

          <div class="proposal-body">
            <p class="proposal-hint">
              發現技能資料與遊戲內不符嗎？請直接修改下方數值並說明理由，送出後會由站長人工確認。
              <span class="local-badge">本地模擬：提案只存在這個瀏覽器</span>
            </p>

            <!-- 技能說明 -->
            <section class="p-section">
              <h4 class="p-section-title">技能說明 <span class="p-sub">（所有等級共用）</span></h4>
              <textarea v-model="description" class="p-textarea" rows="2" :maxlength="LIMITS.description" data-test="description"></textarea>
            </section>

            <!-- 等級選擇 -->
            <section class="p-section">
              <div class="level-bar">
                <label class="p-label">編輯等級</label>
                <select v-model.number="editingLevel" class="p-select" data-test="level-select">
                  <option v-for="lv in levelNumbers" :key="lv" :value="lv">
                    Lv {{ lv }}{{ modifiedLevels.has(lv) ? '　● 已修改' : '' }}
                  </option>
                </select>
                <button v-if="modifiedLevels.has(editingLevel)" class="p-btn-text" @click="resetLevel(editingLevel)">還原此等級</button>
              </div>
            </section>

            <template v-if="currentDraft">
              <!-- 基礎數值 -->
              <section class="p-section">
                <h4 class="p-section-title">基礎數值</h4>
                <div v-for="(row, idx) in currentDraft.base_stats" :key="row.key" class="p-row">
                  <span class="p-row-label">{{ statLabel(row.key) }}<small class="p-key">{{ row.key }}</small></span>
                  <input v-model="row.value" class="p-input" :placeholder="statPlaceholder(row.key)" :data-test="`stat-${row.key}`" />
                  <button class="p-btn-icon" title="移除此欄位" @click="currentDraft.base_stats.splice(idx, 1)">✕</button>
                </div>
                <div class="p-row">
                  <select v-model="newStatKey" class="p-select">
                    <option value="">＋ 新增基礎數值欄位…</option>
                    <option v-for="k in availableStatKeys" :key="k" :value="k">{{ statLabel(k) }}（{{ k }}）</option>
                  </select>
                  <button class="p-btn" :disabled="!newStatKey" @click="addStat">新增</button>
                </div>
              </section>

              <!-- 特殊效果 -->
              <section class="p-section">
                <h4 class="p-section-title">特殊效果</h4>
                <div v-if="currentDraft.special_effects.length === 0" class="p-empty">此等級沒有特殊效果</div>
                <div v-for="(eff, eIdx) in currentDraft.special_effects" :key="eIdx" class="effect-card">
                  <div class="p-row">
                    <span class="p-row-label">類型</span>
                    <select :value="eff.isCustom ? CUSTOM : eff.type" class="p-select" @change="onTypeChange(eff, $event.target.value)" :data-test="`effect-type-${eIdx}`">
                      <option v-for="t in effectTypeNames" :key="t" :value="t">{{ EFFECT_TYPE_DEFS[t].icon }} {{ t }}</option>
                      <option :value="CUSTOM">✨ 自訂類型…</option>
                    </select>
                    <button class="p-btn-icon" title="移除此效果" @click="currentDraft.special_effects.splice(eIdx, 1)">✕</button>
                  </div>
                  <div v-if="eff.isCustom" class="p-row">
                    <span class="p-row-label">自訂類型名稱</span>
                    <input v-model="eff.type" class="p-input" list="proposal-effect-types" :maxlength="LIMITS.effectType" placeholder="例如：錯亂" :data-test="`effect-custom-name-${eIdx}`" />
                  </div>
                  <div v-for="(p, pIdx) in eff.params" :key="pIdx" class="p-row">
                    <template v-if="p.fixed">
                      <span class="p-row-label">{{ p.label }}<small v-if="p.optional" class="p-key">選填</small></span>
                    </template>
                    <input v-else v-model="p.key" class="p-input p-input-key" placeholder="參數名稱" />
                    <input v-model="p.value" class="p-input" :placeholder="paramPlaceholder(p.format)" :data-test="`effect-${eIdx}-param-${pIdx}`" />
                    <button v-if="!p.fixed" class="p-btn-icon" title="移除參數" @click="eff.params.splice(pIdx, 1)">✕</button>
                  </div>
                  <button class="p-btn-text" @click="eff.params.push({ key: '', label: '', format: 'text', optional: true, fixed: false, value: '' })" :data-test="`effect-add-param-${eIdx}`">＋ 新增參數</button>
                </div>
                <button class="p-btn" @click="currentDraft.special_effects.push(newEffectDraft(effectTypeNames[0]))" data-test="add-effect">＋ 新增特殊效果</button>
              </section>

              <!-- 技能消耗 -->
              <section class="p-section">
                <h4 class="p-section-title">技能消耗</h4>
                <label class="p-check">
                  <input type="checkbox" v-model="currentDraft.cost.enabled" data-test="cost-enabled" /> 此技能有消耗
                </label>
                <template v-if="currentDraft.cost.enabled">
                  <div class="p-row">
                    <span class="p-row-label">MP</span>
                    <input v-model="currentDraft.cost.mp" class="p-input" inputmode="numeric" data-test="cost-mp" />
                  </div>
                  <div class="p-row">
                    <span class="p-row-label">SP</span>
                    <input v-model="currentDraft.cost.sp" class="p-input" inputmode="numeric" data-test="cost-sp" />
                  </div>
                  <div v-for="(o, oIdx) in currentDraft.cost.other" :key="oIdx" class="p-row">
                    <input v-model="o.item" class="p-input p-input-key" list="proposal-cost-items" placeholder="道具名稱，例如：符咒" :maxlength="LIMITS.itemName" :data-test="`cost-item-${oIdx}`" />
                    <input v-model="o.amount" class="p-input p-input-short" inputmode="numeric" placeholder="數量" :data-test="`cost-amount-${oIdx}`" />
                    <button class="p-btn-icon" title="移除" @click="currentDraft.cost.other.splice(oIdx, 1)">✕</button>
                  </div>
                  <button class="p-btn-text" @click="currentDraft.cost.other.push({ item: '', amount: '1' })" data-test="cost-add-other">＋ 新增道具消耗（符咒、箭矢等）</button>
                </template>
              </section>

              <!-- 套用到其他等級 -->
              <section v-if="levelNumbers.length > 1 && modifiedLevels.has(editingLevel)" class="p-section propagate-box">
                <span>將 Lv {{ editingLevel }} 的修改套用到</span>
                <select v-model.number="propagateFrom" class="p-select p-select-short">
                  <option v-for="lv in levelNumbers" :key="lv" :value="lv">Lv {{ lv }}</option>
                </select>
                <span>～</span>
                <select v-model.number="propagateTo" class="p-select p-select-short">
                  <option v-for="lv in levelNumbers" :key="lv" :value="lv">Lv {{ lv }}</option>
                </select>
                <button class="p-btn" @click="propagate" data-test="propagate">套用</button>
                <span v-if="propagateMsg" class="p-ok">{{ propagateMsg }}</span>
              </section>
            </template>

            <!-- 理由與佐證 -->
            <section class="p-section">
              <h4 class="p-section-title">修正理由 <span class="p-required">*</span></h4>
              <textarea v-model="reason" class="p-textarea" rows="3" :maxlength="LIMITS.reason" placeholder="例如：遊戲內 Lv5 冷卻時間顯示為 3 秒，網站寫 5 秒" data-test="reason"></textarea>
              <h4 class="p-section-title">佐證連結 <span class="p-sub">（選填，例如遊戲截圖網址）</span></h4>
              <input v-model="evidenceUrl" class="p-input p-input-full" placeholder="https://" :maxlength="LIMITS.evidenceUrl" data-test="evidence" />
            </section>

            <div v-if="errors.length" class="p-errors" data-test="errors">
              <div v-for="(e, i) in errors" :key="i">⚠️ {{ e }}</div>
            </div>

            <div class="p-footer">
              <span class="p-summary">{{ summaryText }}</span>
              <button class="p-btn-secondary" @click="emit('close')">取消</button>
              <button class="p-btn-primary" @click="submit" data-test="submit">送出提案</button>
            </div>
          </div>

          <datalist id="proposal-effect-types">
            <option v-for="t in effectTypeNames" :key="t" :value="t" />
          </datalist>
          <datalist id="proposal-cost-items">
            <option value="符咒" />
            <option value="箭矢" />
          </datalist>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { BASE_STAT_DEFS, EFFECT_TYPE_DEFS } from '@/utils/skillEffects.js'
import {
  LIMITS,
  levelToDraft,
  draftToLevel,
  getLevelSnapshot,
  newEffectDraft,
  propagateLevelChanges,
  buildProposal,
  isSame,
  EDITABLE_LEVEL_FIELDS
} from '@/utils/skillProposal.js'
import { getProposalStore } from '@/services/skillProposalService.js'

const props = defineProps({
  show: { type: Boolean, default: false },
  skill: { type: Object, default: null },
  tree: { type: Object, default: null },
  initialLevel: { type: Number, default: 1 },
  author: { type: Object, default: null },
  store: { type: Object, default: null }
})
const emit = defineEmits(['close', 'submitted'])

const CUSTOM = '__custom__'
const effectTypeNames = Object.keys(EFFECT_TYPE_DEFS)

const description = ref('')
const editingLevel = ref(1)
const drafts = reactive({})
const reason = ref('')
const evidenceUrl = ref('')
const errors = ref([])
const newStatKey = ref('')
const propagateFrom = ref(1)
const propagateTo = ref(1)
const propagateMsg = ref('')

const levelNumbers = computed(() => (props.skill?.levels || []).map(l => l.skill_level))
const findLevel = (lv) => (props.skill?.levels || []).find(l => l.skill_level === lv)

const ensureDraft = (lv) => {
  if (!drafts[lv] && findLevel(lv)) drafts[lv] = levelToDraft(findLevel(lv))
  return drafts[lv]
}

const currentDraft = computed(() => drafts[editingLevel.value] || null)

const init = () => {
  Object.keys(drafts).forEach(k => delete drafts[k])
  description.value = props.skill?.description || ''
  const lvs = levelNumbers.value
  editingLevel.value = lvs.includes(props.initialLevel) ? props.initialLevel : (lvs[0] || 1)
  ensureDraft(editingLevel.value)
  propagateFrom.value = editingLevel.value
  propagateTo.value = lvs[lvs.length - 1] || 1
  reason.value = ''
  evidenceUrl.value = ''
  errors.value = []
  newStatKey.value = ''
  propagateMsg.value = ''
}

watch(() => [props.show, props.skill?.skill_group_id], ([show]) => { if (show) init() }, { immediate: true })
watch(editingLevel, (lv) => {
  ensureDraft(lv)
  newStatKey.value = ''
  propagateMsg.value = ''
})

const isDraftModified = (lv) => {
  const d = drafts[lv]
  if (!d) return false
  const { value, errors: errs } = draftToLevel(d)
  if (errs.length) return true
  const orig = getLevelSnapshot(findLevel(lv))
  return EDITABLE_LEVEL_FIELDS.some(f => !isSame(orig[f], value[f]))
}

const modifiedLevels = computed(() => new Set(levelNumbers.value.filter(isDraftModified)))

const descriptionChanged = computed(() => description.value.trim() !== String(props.skill?.description || '').trim())

const summaryText = computed(() => {
  const parts = []
  if (descriptionChanged.value) parts.push('技能說明')
  if (modifiedLevels.value.size) parts.push(`${modifiedLevels.value.size} 個等級`)
  return parts.length ? `已修改：${parts.join('、')}` : '尚未修改任何內容'
})

const resetLevel = (lv) => {
  if (findLevel(lv)) drafts[lv] = levelToDraft(findLevel(lv))
}

// 基礎數值
const statLabel = (k) => BASE_STAT_DEFS[k]?.label || k
const statPlaceholder = (k) => {
  const f = BASE_STAT_DEFS[k]?.format
  if (f === 'percent') return '例如 -50%'
  if (f === 'seconds') return '秒數，例如 1.5'
  return '數字（留空代表移除）'
}
const availableStatKeys = computed(() => {
  const used = new Set((currentDraft.value?.base_stats || []).map(r => r.key))
  return Object.keys(BASE_STAT_DEFS).filter(k => !used.has(k))
})
const addStat = () => {
  if (!newStatKey.value || !currentDraft.value) return
  currentDraft.value.base_stats.push({ key: newStatKey.value, value: '' })
  newStatKey.value = ''
}

// 特殊效果
const paramPlaceholder = (format) => {
  if (format === 'ratio') return '小數，例如 0.2 代表 20%'
  if (format === 'percent') return '例如 -20%'
  if (format === 'list') return '以「、」分隔，例如 冰凍、錯亂'
  if (format === 'number') return '數字'
  return '數值或文字'
}
const onTypeChange = (eff, val) => {
  const oldValues = Object.fromEntries(eff.params.map(p => [p.key, p.value]))
  if (val === CUSTOM) {
    const oldType = eff.isCustom ? eff.type : ''
    eff.isCustom = true
    eff.type = oldType
    eff.params = eff.params.map(p => ({ ...p, fixed: false, optional: true, label: p.key, format: 'text' }))
    return
  }
  const fresh = newEffectDraft(val)
  fresh.params.forEach(p => { if (oldValues[p.key] !== undefined) p.value = oldValues[p.key] })
  eff.type = fresh.type
  eff.isCustom = false
  eff.params = fresh.params
}

// 套用到其他等級
const propagate = () => {
  propagateMsg.value = ''
  const src = editingLevel.value
  const srcParsed = draftToLevel(drafts[src])
  if (srcParsed.errors.length) {
    errors.value = srcParsed.errors.map(e => `Lv${src}：${e}`)
    return
  }
  const from = Math.min(propagateFrom.value, propagateTo.value)
  const to = Math.max(propagateFrom.value, propagateTo.value)
  const srcOrig = getLevelSnapshot(findLevel(src))
  const errs = []
  let count = 0
  levelNumbers.value.forEach(lv => {
    if (lv === src || lv < from || lv > to) return
    const target = drafts[lv] ? draftToLevel(drafts[lv]) : { value: getLevelSnapshot(findLevel(lv)), errors: [] }
    if (target.errors.length) {
      errs.push(`Lv${lv} 目前有錯誤，未套用`)
      return
    }
    drafts[lv] = levelToDraft(propagateLevelChanges(srcOrig, srcParsed.value, target.value))
    count++
  })
  errors.value = errs
  propagateMsg.value = count ? `已套用到 ${count} 個等級` : ''
}

// 送出
const submit = () => {
  const errs = []
  const editedLevels = {}
  Object.keys(drafts).forEach(lvKey => {
    const lv = Number(lvKey)
    const { value, errors: e } = draftToLevel(drafts[lvKey])
    if (e.length) errs.push(...e.map(x => `Lv${lv}：${x}`))
    else editedLevels[lv] = value
  })
  if (!reason.value.trim()) errs.push('請填寫修正理由')
  if (errs.length) {
    errors.value = errs
    return
  }
  const proposal = buildProposal({
    tree: props.tree,
    skill: props.skill,
    description: description.value,
    editedLevels,
    reason: reason.value,
    evidenceUrl: evidenceUrl.value,
    author: props.author
  })
  try {
    const saved = (props.store || getProposalStore()).submit(proposal)
    errors.value = []
    emit('submitted', saved)
  } catch (err) {
    errors.value = err.validationErrors || [err.message]
  }
}
</script>

<style scoped>
.proposal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 10000;
  display: flex;
  justify-content: center;
  align-items: center;
}
.proposal-modal {
  background: rgba(12, 16, 26, 0.98);
  border: 1.5px solid rgba(255, 119, 0, 0.3);
  border-radius: 12px;
  box-shadow: 0 0 40px rgba(255, 119, 0, 0.15), 0 20px 60px rgba(0, 0, 0, 0.8);
  width: 680px;
  max-width: 94vw;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #e8e8ee;
}
.proposal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid rgba(255, 119, 0, 0.15);
}
.proposal-title {
  font-weight: 700;
  color: var(--color-defender, #ff7700);
}
.proposal-close {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: #aaa;
  cursor: pointer;
}
.proposal-body {
  padding: 16px 20px;
  overflow-y: auto;
  font-size: 0.85rem;
}
.proposal-hint {
  color: #aaa;
  line-height: 1.5;
  margin: 0 0 12px;
}
.local-badge {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 8px;
  border-radius: 4px;
  background: rgba(255, 200, 0, 0.12);
  border: 1px solid rgba(255, 200, 0, 0.35);
  color: #ffcc00;
  font-size: 0.75rem;
}
.p-section {
  margin-bottom: 16px;
}
.p-section-title {
  margin: 0 0 8px;
  font-size: 0.85rem;
  color: var(--color-defender, #ff7700);
}
.p-sub,
.p-key {
  color: #888;
  font-weight: normal;
  font-size: 0.75rem;
  margin-left: 4px;
}
.p-required {
  color: #ff5555;
}
.p-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}
.p-row-label {
  min-width: 130px;
  color: #ccc;
}
.p-input,
.p-select,
.p-textarea {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  color: #fff;
  padding: 6px 8px;
  font-size: 0.85rem;
  outline: none;
}
.p-input:focus,
.p-select:focus,
.p-textarea:focus {
  border-color: var(--color-defender, #ff7700);
}
.p-select option {
  background: #12161f;
}
.p-input {
  flex: 1;
  min-width: 120px;
}
.p-input-key {
  flex: 0 1 160px;
}
.p-input-short {
  flex: 0 1 80px;
  min-width: 60px;
}
.p-input-full,
.p-textarea {
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
}
.p-select-short {
  width: auto;
}
.level-bar {
  display: flex;
  align-items: center;
  gap: 10px;
}
.p-label {
  color: #ccc;
}
.effect-card {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.02);
}
.p-empty {
  color: #777;
  margin-bottom: 8px;
}
.p-check {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  color: #ccc;
}
.propagate-box {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 10px;
  border-radius: 8px;
  background: rgba(0, 255, 128, 0.05);
  border: 1px dashed rgba(0, 255, 128, 0.3);
}
.p-ok {
  color: #00ff80;
}
.p-btn,
.p-btn-primary,
.p-btn-secondary {
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.82rem;
}
.p-btn {
  background: rgba(255, 119, 0, 0.1);
  border: 1px solid rgba(255, 119, 0, 0.5);
  color: var(--color-defender, #ff7700);
}
.p-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.p-btn-primary {
  background: var(--color-defender, #ff7700);
  border: 1px solid var(--color-defender, #ff7700);
  color: #000;
}
.p-btn-secondary {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #aaa;
}
.p-btn-text {
  background: none;
  border: none;
  color: #6cf;
  cursor: pointer;
  padding: 2px 0;
  font-size: 0.8rem;
}
.p-btn-icon {
  background: none;
  border: 1px solid rgba(255, 80, 80, 0.3);
  color: #ff6666;
  border-radius: 4px;
  width: 26px;
  height: 26px;
  cursor: pointer;
  flex-shrink: 0;
}
.p-errors {
  background: rgba(255, 60, 60, 0.08);
  border: 1px solid rgba(255, 60, 60, 0.35);
  color: #ff8888;
  border-radius: 6px;
  padding: 8px 12px;
  margin-bottom: 12px;
  line-height: 1.6;
}
.p-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 12px;
}
.p-summary {
  margin-right: auto;
  color: #888;
  font-size: 0.78rem;
}
.proposal-fade-enter-active,
.proposal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.proposal-fade-enter-from,
.proposal-fade-leave-to {
  opacity: 0;
}
@media (max-width: 480px) {
  .p-row-label {
    min-width: 100%;
  }
}
</style>
