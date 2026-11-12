<!--
  技能修正提案：站長審核操作（僅開發模式）
  這個元件只會在 import.meta.env.DEV 時被動態載入，正式建置不會包含任何程式碼或文字。
-->
<template>
  <div class="dev-review">
    <div v-if="proposal.status === 'pending' && stale.length" class="card-stale">
      ⚠️ 提案送出後，原始資料已變動：{{ stale.join('、') }}。差異表中的「修改前」是提案當時的值。
    </div>
    <div class="card-actions">
      <input v-model="note" class="note-input" placeholder="備註（選填，會顯示給提案人）" />
      <template v-if="proposal.status === 'pending'">
        <button class="act act-accept" @click="review('accepted')" :data-test="`accept-${proposal.id}`">採納</button>
        <button class="act act-reject" @click="review('withdrawn')" :data-test="`admin-withdraw-${proposal.id}`">撤回</button>
      </template>
      <button v-else class="act" @click="review('pending')" :data-test="`reopen-${proposal.id}`">改回待審核</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { checkStale } from '@/utils/skillProposal.js'

const props = defineProps({
  proposal: { type: Object, required: true },
  currentTrees: { type: Array, default: () => [] },
  store: { type: Object, required: true }
})
const emit = defineEmits(['changed'])

const note = ref('')
const stale = computed(() => checkStale(props.currentTrees, props.proposal))

const review = (status) => {
  props.store.review(props.proposal.id, status, note.value)
  note.value = ''
  emit('changed')
}
</script>

<style scoped>
.card-stale {
  margin-top: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  background: rgba(255, 200, 0, 0.08);
  color: #ffcc00;
}
.card-actions {
  display: flex;
  gap: 6px;
  margin-top: 10px;
  flex-wrap: wrap;
  align-items: center;
}
.note-input {
  flex: 1;
  min-width: 180px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  color: #fff;
  padding: 5px 8px;
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
.act-accept {
  border-color: rgba(0, 255, 128, 0.5);
  color: #00ff80;
}
.act-reject {
  border-color: rgba(255, 80, 80, 0.5);
  color: #ff6666;
}
</style>
