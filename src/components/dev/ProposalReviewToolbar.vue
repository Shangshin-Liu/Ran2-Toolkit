<!--
  技能修正提案：審核面板底部工具列（僅開發模式）
  這個元件只會在 import.meta.env.DEV 時被動態載入，正式建置不會包含任何程式碼或文字。
-->
<template>
  <div class="review-footer">
    <span class="footer-hint">採納後會立即疊加到本頁的技能資料（不會修改快取與線上資料）。</span>
    <button class="act" @click="exportAccepted" :disabled="accepted.length === 0">匯出已採納 JSON</button>
    <button class="act act-reject" @click="clearAll" data-test="clear-all">
      {{ confirmingClear ? '再按一次確認清除' : '清除所有模擬提案' }}
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  proposals: { type: Array, default: () => [] },
  store: { type: Object, required: true }
})
const emit = defineEmits(['changed'])

const confirmingClear = ref(false)
const accepted = computed(() => props.proposals.filter(p => p.status === 'accepted'))

const exportAccepted = () => {
  const blob = new Blob([JSON.stringify(accepted.value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `skill_proposals_accepted_${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const clearAll = () => {
  if (!confirmingClear.value) {
    confirmingClear.value = true
    return
  }
  props.store.clear()
  confirmingClear.value = false
  emit('changed')
}
</script>

<style scoped>
.review-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  flex-wrap: wrap;
}
.footer-hint {
  margin-right: auto;
  color: #888;
  font-size: 0.78rem;
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
.act:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.act-reject {
  border-color: rgba(255, 80, 80, 0.5);
  color: #ff6666;
}
</style>
