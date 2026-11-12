<!--
  技能修正提案：審核面板底部工具列（僅開發模式）
  這個元件只會在 import.meta.env.DEV 時被動態載入，正式建置不會包含任何程式碼或文字。
-->
<template>
  <!-- 只有本地模擬（VITE_PROPOSAL_STORE=local）才有清除功能；其他情況不顯示任何內容 -->
  <div v-if="canClear" class="review-footer">
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
const canClear = computed(() => typeof props.store.clear === 'function')

const clearAll = async () => {
  if (!confirmingClear.value) {
    confirmingClear.value = true
    return
  }
  await props.store.clear()
  confirmingClear.value = false
  emit('changed')
}
</script>

<style scoped>
.review-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  flex-wrap: wrap;
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
</style>
