<template>
  <Teleport to="body">
    <transition name="ctx-fade">
      <div v-if="show && context" class="ctx-overlay" @click.self="emit('close')">
        <div class="ctx-modal" role="dialog" aria-modal="true">
          <div class="ctx-header">
            <div>
              <div class="ctx-title">🌳 技能脈絡：{{ context.centerNode.name }}</div>
              <div class="ctx-counts">
                前置 {{ context.totalPrereqCount }} 個 · 延伸 {{ context.totalFollowUpCount }} 個
              </div>
            </div>
            <div class="ctx-header-actions">
              <button
                v-if="centerId !== skillGroupId && originName"
                class="ctx-btn ctx-btn-accent"
                @click="centerId = skillGroupId"
                data-test="ctx-back"
              >
                回到「{{ originName }}」
              </button>
              <button class="ctx-close" @click="emit('close')" aria-label="關閉">✕</button>
            </div>
          </div>

          <div class="ctx-body">
            <!-- 前置各層（由最源頭排到直接前置） -->
            <template v-for="layer in context.upLayers" :key="`up-${layer.distance}`">
              <div class="ctx-generation">
                <div class="ctx-generation-label">{{ layer.title }}</div>
                <div class="ctx-nodes">
                  <button
                    v-for="node in layer.nodes"
                    :key="node.id"
                    class="ctx-node"
                    :class="`status-${node.status}`"
                    @click="centerId = node.id"
                    :data-test="`ctx-node-${node.id}`"
                  >
                    <img v-if="node.icon" :src="getIconUrl(node.icon)" class="ctx-node-icon" alt="" />
                    <span v-else class="ctx-node-icon ctx-node-icon-empty">❓</span>
                    <span class="ctx-node-info">
                      <span class="ctx-node-name">{{ node.name }}</span>
                      <span class="ctx-node-req">{{ node.requirementText }}</span>
                    </span>
                    <span class="ctx-status" :class="`tag-${node.status}`">{{ node.statusLabel }}</span>
                  </button>
                </div>
              </div>
              <div class="ctx-arrow" aria-hidden="true">↓</div>
            </template>

            <!-- 中心技能 -->
            <div class="ctx-generation is-center">
              <div class="ctx-generation-label">目前檢視的技能</div>
              <div class="ctx-nodes is-single">
                <div class="ctx-node is-center-node" :class="`status-${context.centerNode.status}`" data-test="ctx-center">
                  <img v-if="context.centerNode.icon" :src="getIconUrl(context.centerNode.icon)" class="ctx-node-icon" alt="" />
                  <span v-else class="ctx-node-icon ctx-node-icon-empty">❓</span>
                  <span class="ctx-node-info">
                    <span class="ctx-node-name">{{ context.centerNode.name }}</span>
                    <span class="ctx-node-req">{{ context.centerNode.requirementText }}</span>
                  </span>
                  <span class="ctx-status" :class="`tag-${context.centerNode.status}`">{{ context.centerNode.statusLabel }}</span>
                </div>
              </div>
            </div>

            <p v-if="context.isIsolated" class="ctx-isolated">這個技能沒有前置或延伸技能。</p>

            <!-- 延伸各層 -->
            <template v-for="layer in context.downLayers" :key="`down-${layer.distance}`">
              <div class="ctx-arrow" aria-hidden="true">↓</div>
              <div class="ctx-generation">
                <div class="ctx-generation-label">{{ layer.title }}</div>
                <div class="ctx-nodes">
                  <button
                    v-for="node in layer.nodes"
                    :key="node.id"
                    class="ctx-node"
                    :class="`status-${node.status}`"
                    @click="centerId = node.id"
                    :data-test="`ctx-node-${node.id}`"
                  >
                    <img v-if="node.icon" :src="getIconUrl(node.icon)" class="ctx-node-icon" alt="" />
                    <span v-else class="ctx-node-icon ctx-node-icon-empty">❓</span>
                    <span class="ctx-node-info">
                      <span class="ctx-node-name">{{ node.name }}</span>
                      <span class="ctx-node-req">{{ node.requirementText }}</span>
                    </span>
                    <span class="ctx-status" :class="`tag-${node.status}`">{{ node.statusLabel }}</span>
                  </button>
                </div>
              </div>
            </template>
          </div>

          <div class="ctx-footer">點任一技能可改以該技能為中心查看；狀態依目前的配點計算。</div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { buildSkillContext } from '@/utils/skillContext.js'
import { useScrollLock } from '@/composables/useScrollLock.js'

const props = defineProps({
  show: { type: Boolean, default: false },
  tree: { type: Object, default: null },
  // 開啟時的技能（脈絡的起點）
  skillGroupId: { type: String, default: '' },
  getLevel: { type: Function, default: () => 0 },
  getIconUrl: { type: Function, default: (f) => f }
})
const emit = defineEmits(['close'])

const centerId = ref('')

watch(() => [props.show, props.skillGroupId], ([show]) => {
  if (show) centerId.value = props.skillGroupId
}, { immediate: true })

const context = computed(() => {
  if (!props.show || !props.tree || !centerId.value) return null
  return buildSkillContext(props.tree, centerId.value, props.getLevel)
})

useScrollLock(() => props.show && !!context.value)

const originName = computed(() => {
  const s = (props.tree?.skills || []).find(x => x.skill_group_id === props.skillGroupId)
  return s ? s.name : ''
})
</script>

<style scoped>
.ctx-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px;
  box-sizing: border-box;
}
.ctx-modal {
  background: rgba(12, 16, 26, 0.98);
  border: 1.5px solid rgba(0, 255, 128, 0.3);
  border-radius: 12px;
  box-shadow: 0 0 40px rgba(0, 255, 128, 0.1), 0 20px 60px rgba(0, 0, 0, 0.8);
  width: 860px;
  max-width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #e8e8ee;
}
.ctx-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 10px;
  padding: 14px 20px;
  border-bottom: 1px solid rgba(0, 255, 128, 0.15);
}
.ctx-title {
  font-weight: 700;
  font-size: 1rem;
  color: #00ff80;
}
.ctx-counts {
  margin-top: 4px;
  font-size: 0.8rem;
  color: #999;
}
.ctx-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ctx-btn {
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.ctx-btn-accent {
  background: rgba(255, 119, 0, 0.1);
  border: 1px solid rgba(255, 119, 0, 0.5);
  color: var(--color-defender, #ff7700);
}
.ctx-close {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: #aaa;
  cursor: pointer;
  flex-shrink: 0;
}
.ctx-body {
  padding: 16px 20px;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.ctx-generation {
  width: 100%;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 10px 12px;
}
.ctx-generation.is-center {
  border-color: rgba(255, 119, 0, 0.5);
  background: rgba(255, 119, 0, 0.05);
}
.ctx-generation-label {
  text-align: center;
  font-size: 0.78rem;
  font-weight: 600;
  color: #00ff80;
  margin-bottom: 8px;
}
.ctx-generation.is-center .ctx-generation-label {
  color: var(--color-defender, #ff7700);
}
.ctx-nodes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 8px;
}
.ctx-nodes.is-single {
  max-width: 380px;
  margin: 0 auto;
}
.ctx-node {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: inherit;
  font-family: inherit;
  text-align: left;
  min-width: 0;
}
button.ctx-node {
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}
button.ctx-node:hover {
  border-color: #00ff80;
  background: rgba(0, 255, 128, 0.06);
}
.ctx-node.is-center-node {
  border: 2px solid var(--color-defender, #ff7700);
  box-shadow: 0 0 12px rgba(255, 119, 0, 0.2);
}
.ctx-node.status-locked {
  opacity: 0.75;
}
.ctx-node-icon {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.5);
  object-fit: contain;
  flex-shrink: 0;
}
.ctx-node-icon-empty {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.ctx-node-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}
.ctx-node-name {
  font-size: 0.88rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ctx-node-req {
  font-size: 0.74rem;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ctx-status {
  flex-shrink: 0;
  padding: 1px 7px;
  border-radius: 4px;
  font-size: 0.72rem;
  white-space: nowrap;
  border: 1px solid rgba(255, 255, 255, 0.2);
}
.tag-learned {
  color: #00ff80;
  border-color: rgba(0, 255, 128, 0.4);
  background: rgba(0, 255, 128, 0.08);
}
.tag-available {
  color: #66ccff;
  border-color: rgba(100, 200, 255, 0.4);
  background: rgba(100, 200, 255, 0.08);
}
.tag-locked {
  color: #ff6666;
  border-color: rgba(255, 80, 80, 0.4);
  background: rgba(255, 80, 80, 0.08);
}
.ctx-arrow {
  color: rgba(255, 255, 255, 0.3);
  font-size: 1.1rem;
  font-weight: bold;
  line-height: 1;
  padding: 6px 0;
}
.ctx-isolated {
  margin: 14px 0 0;
  color: #888;
  font-size: 0.85rem;
}
.ctx-footer {
  padding: 10px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  color: #888;
  font-size: 0.76rem;
}
.ctx-fade-enter-active,
.ctx-fade-leave-active {
  transition: opacity 0.2s ease;
}
.ctx-fade-enter-from,
.ctx-fade-leave-to {
  opacity: 0;
}
</style>
