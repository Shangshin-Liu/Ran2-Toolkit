<template>
  <Teleport to="body">
    <transition name="proposal-fade">
      <div v-if="show" class="review-overlay" @click.self="emit('close')">
        <div class="review-modal" role="dialog" aria-modal="true">
          <div class="review-header">
            <span class="review-title">{{ panelTitle }}</span>
            <span class="local-badge">本地模擬</span>
            <button class="review-close" @click="emit('close')" aria-label="關閉">✕</button>
          </div>

          <div class="review-tabs">
            <button
              v-for="(label, key) in tabs"
              :key="key"
              class="review-tab"
              :class="{ active: activeTab === key }"
              @click="activeTab = key"
              :data-test="`tab-${key}`"
            >
              {{ label }}（{{ countOf(key) }}）
            </button>
            <label class="mine-only">
              <input type="checkbox" v-model="mineOnly" data-test="mine-only" /> 只看我的提案
            </label>
          </div>

          <div class="review-body">
            <div v-if="filtered.length === 0" class="review-empty">目前沒有提案</div>

            <div
              v-for="p in filtered"
              :key="p.id"
              class="review-item"
              :class="{ expanded: expandedId === p.id }"
              :data-test="`proposal-${p.id}`"
            >
              <!-- 摘要列：預設只顯示技能名稱、技能部門、提案人 -->
              <button class="item-summary" @click="toggle(p.id)" :data-test="`toggle-${p.id}`">
                <span class="sum-arrow">{{ expandedId === p.id ? '▾' : '▸' }}</span>
                <span class="sum-skill">{{ p.skillName }}</span>
                <span class="sum-dept">{{ deptOf(p) }}</span>
                <span class="sum-author">
                  {{ p.authorCharId || '匿名' }}
                  <span v-if="store.isMine(p.id)" class="mine-tag">我</span>
                </span>
                <span class="sum-time" :title="formatTime(p.createdAt)">{{ formatShortTime(p.createdAt) }}</span>
                <span class="status-pill" :class="`status-${p.status}`">{{ PROPOSAL_STATUS[p.status] || p.status }}</span>
              </button>

              <!-- 展開後的詳細內容 -->
              <div v-if="expandedId === p.id" class="item-detail">
                <div class="card-meta">
                  送出時間：{{ formatTime(p.createdAt) }}
                  <template v-if="p.reviewedAt">・處理時間：{{ formatTime(p.reviewedAt) }}</template>
                </div>

                <div class="card-reason"><span class="card-label">理由</span>{{ p.reason }}</div>
                <div v-if="p.evidenceUrl" class="card-reason">
                  <span class="card-label">佐證</span>
                  <a :href="p.evidenceUrl" target="_blank" rel="noopener noreferrer">{{ p.evidenceUrl }}</a>
                </div>

                <table class="diff-table">
                  <thead>
                    <tr><th>等級</th><th>欄位</th><th>修改前</th><th>修改後</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, i) in describeChanges(p)" :key="i">
                      <td class="nowrap">{{ row.scope }}</td>
                      <td class="nowrap">{{ row.label }}</td>
                      <td class="diff-before">{{ row.before }}</td>
                      <td class="diff-after">{{ row.after }}</td>
                    </tr>
                  </tbody>
                </table>

                <div v-if="p.reviewNote && p.status !== 'pending'" class="card-reason">
                  <span class="card-label">備註</span>{{ p.reviewNote }}
                </div>

                <!-- 站長審核（僅開發模式動態載入，正式建置不包含） -->
                <component
                  :is="ReviewActions"
                  v-if="canReview && ReviewActions"
                  :proposal="p"
                  :current-trees="currentTrees"
                  :store="store"
                  @changed="onChanged"
                />

                <!-- 一般使用者：撤回自己的提案 -->
                <div v-else-if="p.status === 'pending' && store.isMine(p.id)" class="card-actions">
                  <button class="act act-reject" @click="withdrawMine(p)" :data-test="`withdraw-${p.id}`">
                    {{ confirmingWithdraw === p.id ? '再按一次確認撤回' : '撤回我的提案' }}
                  </button>
                </div>

                <div v-if="actionError" class="card-error">⚠️ {{ actionError }}</div>
              </div>
            </div>
          </div>

          <component
            :is="ReviewToolbar"
            v-if="canReview && ReviewToolbar"
            :proposals="proposals"
            :store="store"
            @changed="onChanged"
          />
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, defineAsyncComponent } from 'vue'
import { PROPOSAL_STATUS, describeChanges } from '@/utils/skillProposal.js'
import { getProposalStore } from '@/services/skillProposalService.js'

// 審核相關元件與文字只在開發模式載入；正式建置時 import.meta.env.DEV 為 false，
// 這兩個動態 import 會被移除，打包檔中不會出現審核功能的程式碼
const ReviewActions = import.meta.env.DEV
  ? defineAsyncComponent(() => import('./dev/ProposalReviewActions.vue'))
  : null
const ReviewToolbar = import.meta.env.DEV
  ? defineAsyncComponent(() => import('./dev/ProposalReviewToolbar.vue'))
  : null
const REVIEW_TITLE = import.meta.env.DEV ? '🛠️ 技能修正提案審核' : ''

const props = defineProps({
  show: { type: Boolean, default: false },
  // 是否顯示審核功能（採納、站長撤回）；正式建置一律為 false
  canReview: { type: Boolean, default: false },
  // 目前生效中的技能樹（原始資料＋已採納提案），用來檢查待審提案是否過期
  currentTrees: { type: Array, default: () => [] },
  store: { type: Object, default: null }
})
const emit = defineEmits(['close', 'changed'])

const panelTitle = computed(() => (props.canReview && REVIEW_TITLE ? REVIEW_TITLE : '📋 技能修正提案'))

const store = computed(() => props.store || getProposalStore()).value
const proposals = ref([])
const activeTab = ref('pending')
const mineOnly = ref(false)
const expandedId = ref(null)
const confirmingWithdraw = ref(null)
const actionError = ref('')

const tabs = { pending: '待審核', accepted: '已採納', withdrawn: '已撤回', all: '全部' }

const reload = () => {
  proposals.value = store.list()
}
watch(() => props.show, (v) => {
  if (v) {
    reload()
    confirmingWithdraw.value = null
    actionError.value = ''
  }
}, { immediate: true })

const visible = computed(() => (mineOnly.value ? proposals.value.filter(p => store.isMine(p.id)) : proposals.value))
const countOf = (key) => (key === 'all' ? visible.value.length : visible.value.filter(p => p.status === key).length)
const filtered = computed(() => (activeTab.value === 'all' ? visible.value : visible.value.filter(p => p.status === activeTab.value)))

const toggle = (id) => {
  expandedId.value = expandedId.value === id ? null : id
  confirmingWithdraw.value = null
  actionError.value = ''
}

const deptOf = (p) => [p.job, p.skillTree].filter(Boolean).join('・') || '—'
const formatTime = (ts) => (ts ? new Date(ts).toLocaleString('zh-TW', { hour12: false }) : '')
const pad = (n) => String(n).padStart(2, '0')
const formatShortTime = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const onChanged = () => {
  reload()
  emit('changed')
}

const withdrawMine = (p) => {
  if (confirmingWithdraw.value !== p.id) {
    confirmingWithdraw.value = p.id
    return
  }
  try {
    store.withdraw(p.id)
    confirmingWithdraw.value = null
    actionError.value = ''
    reload()
    emit('changed')
  } catch (err) {
    actionError.value = err.message
  }
}

</script>

<style scoped>
.review-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 10000;
  display: flex;
  justify-content: center;
  align-items: center;
}
.review-modal {
  background: rgba(12, 16, 26, 0.98);
  border: 1.5px solid rgba(255, 200, 0, 0.35);
  border-radius: 12px;
  width: 860px;
  max-width: 96vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #e8e8ee;
  font-size: 0.85rem;
}
.review-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.review-title {
  font-weight: 700;
  color: #ffcc00;
}
.local-badge {
  padding: 1px 8px;
  border-radius: 4px;
  background: rgba(255, 200, 0, 0.12);
  border: 1px solid rgba(255, 200, 0, 0.35);
  color: #ffcc00;
  font-size: 0.75rem;
}
.review-close {
  margin-left: auto;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: #aaa;
  cursor: pointer;
}
.review-tabs {
  display: flex;
  gap: 6px;
  padding: 10px 20px;
  flex-wrap: wrap;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.review-tab {
  padding: 4px 12px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: transparent;
  color: #aaa;
  cursor: pointer;
  font-size: 0.8rem;
}
.review-tab.active {
  border-color: #ffcc00;
  color: #ffcc00;
  background: rgba(255, 200, 0, 0.08);
}
.mine-only {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4px;
  color: #aaa;
  font-size: 0.8rem;
}
.review-body {
  padding: 10px 20px 14px;
  overflow-y: auto;
  flex: 1;
}
.review-empty {
  text-align: center;
  color: #777;
  padding: 40px 0;
}
.review-item {
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}
.review-item.expanded {
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  border-bottom-color: transparent;
  margin: 4px 0;
}
.item-summary {
  width: 100%;
  display: grid;
  grid-template-columns: 16px minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr) auto auto;
  gap: 10px;
  align-items: center;
  padding: 10px 8px;
  background: none;
  border: none;
  color: inherit;
  text-align: left;
  cursor: pointer;
  font-size: 0.85rem;
}
.item-summary:hover {
  background: rgba(255, 255, 255, 0.03);
}
.sum-arrow {
  color: #888;
}
.sum-skill {
  color: var(--color-defender, #ff7700);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sum-dept,
.sum-author {
  color: #bbb;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sum-time {
  color: #888;
  font-size: 0.78rem;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.mine-tag {
  margin-left: 4px;
  padding: 0 5px;
  border-radius: 3px;
  background: rgba(100, 200, 255, 0.15);
  color: #6cf;
  font-size: 0.72rem;
}
.status-pill {
  padding: 1px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  white-space: nowrap;
}
.status-pending { color: #6cf; border-color: rgba(100, 200, 255, 0.4); }
.status-accepted { color: #00ff80; border-color: rgba(0, 255, 128, 0.4); }
.status-withdrawn { color: #999; border-color: rgba(160, 160, 160, 0.4); }
.item-detail {
  padding: 0 12px 12px 34px;
}
.card-meta {
  color: #888;
  font-size: 0.78rem;
}
.card-reason {
  margin-top: 6px;
  line-height: 1.5;
  word-break: break-all;
}
.card-reason a {
  color: #6cf;
}
.card-label {
  display: inline-block;
  min-width: 48px;
  color: #888;
}
.card-error {
  margin-top: 6px;
  color: #ff8888;
}
.diff-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
  font-size: 0.8rem;
}
.diff-table th,
.diff-table td {
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 4px 8px;
  text-align: left;
  vertical-align: top;
}
.diff-table th {
  color: #888;
  font-weight: normal;
}
.nowrap {
  white-space: nowrap;
}
.diff-before {
  color: #ff8888;
}
.diff-after {
  color: #66ffaa;
}
.card-actions {
  display: flex;
  gap: 6px;
  margin-top: 10px;
  flex-wrap: wrap;
  align-items: center;
}
.act {
  padding: 5px 12px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.04);
  color: #ccc;
  cursor: pointer;
  font-size: 0.8rem;
}
.act-reject {
  border-color: rgba(255, 80, 80, 0.5);
  color: #ff6666;
}
.proposal-fade-enter-active,
.proposal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.proposal-fade-enter-from,
.proposal-fade-leave-to {
  opacity: 0;
}
@media (max-width: 600px) {
  /* 手機：第一行「技能名稱＋狀態」，第二行「部門・提案人」 */
  .item-summary {
    display: flex;
    flex-wrap: wrap;
    row-gap: 2px;
  }
  .sum-skill {
    flex: 1 1 0;
  }
  .status-pill {
    order: 2;
  }
  .sum-time {
    order: 2;
  }
  .sum-dept {
    order: 3;
    flex: 1 1 100%;
    padding-left: 26px;
    font-size: 0.78rem;
  }
  .sum-author {
    order: 4;
    flex: 1 1 100%;
    padding-left: 26px;
    font-size: 0.78rem;
  }
  .item-detail {
    padding-left: 12px;
  }
}
</style>
