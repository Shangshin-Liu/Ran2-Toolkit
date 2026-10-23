<template>
  <div
    class="tour-lightbox"
    role="dialog"
    aria-modal="true"
    aria-label="放大檢視示意圖片"
  >
    <!-- 頂部：步驟標題、張數、關閉 -->
    <div class="lightbox-topbar">
      <div class="lightbox-info">
        <span class="lightbox-title">{{ title }}</span>
        <span v-if="count > 1" class="lightbox-counter" aria-live="polite">{{ index + 1 }} / {{ count }}</span>
      </div>
      <button
        ref="closeBtnRef"
        type="button"
        class="lightbox-close"
        aria-label="關閉放大檢視"
        title="關閉 (Esc)"
        @click="close"
      >
        ✕
      </button>
    </div>

    <!-- 圖片區：全圖模式置中顯示；放大模式可捲動／拖曳查看 -->
    <div
      ref="stageRef"
      class="lightbox-stage"
      :class="{ 'is-zoomed': zoomed, 'is-panning': panning }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
      @click="onStageClick"
    >
      <div class="lightbox-canvas">
        <img
          v-if="currentSrc && !failed.has(currentSrc)"
          :key="currentSrc"
          ref="imgRef"
          :src="currentSrc"
          :alt="count > 1 ? `${title}（第 ${index + 1} 張）` : title"
          class="lightbox-image"
          :class="{ 'can-zoom': canZoom && !zoomed, 'is-zoomed': zoomed }"
          :style="zoomed && zoomWidth ? { width: `${zoomWidth}px` } : null"
          draggable="false"
          @load="measure"
          @error="failed.add(currentSrc)"
        />
        <div v-else class="lightbox-error">圖片載入失敗</div>
      </div>
    </div>

    <template v-if="count > 1">
      <button type="button" class="lightbox-arrow is-prev" aria-label="上一張圖片" title="上一張 (←)" @click="go(-1)">‹</button>
      <button type="button" class="lightbox-arrow is-next" aria-label="下一張圖片" title="下一張 (→)" @click="go(1)">›</button>
    </template>

    <div class="lightbox-hint">{{ hintText }}</div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { getZoomWidth, canZoomFurther } from '@/composables/useTour'

const props = defineProps({
  images: { type: Array, default: () => [] },
  startIndex: { type: Number, default: 0 },
  title: { type: String, default: '' }
})

// close：關閉放大檢視，參數為最後看的圖片索引（讓輪播同步到同一張）
const emit = defineEmits(['close'])

const count = computed(() => props.images.length)
const normalizeIndex = (i) => (count.value > 0 ? ((i % count.value) + count.value) % count.value : 0)
const index = ref(normalizeIndex(props.startIndex))
const currentSrc = computed(() => props.images[index.value] || '')

const failed = reactive(new Set())
const zoomed = ref(false)
const panning = ref(false)
const fitWidth = ref(0)
const naturalWidth = ref(0)
const naturalHeight = ref(0)

const stageRef = ref(null)
const imgRef = ref(null)
const closeBtnRef = ref(null)

const zoomWidth = computed(() => getZoomWidth(naturalWidth.value, fitWidth.value))
const canZoom = computed(() => canZoomFurther(naturalWidth.value, fitWidth.value))

const hintText = computed(() => {
  if (zoomed.value) return '點圖片縮回全圖，可拖曳或捲動查看細節'
  if (canZoom.value) return count.value > 1 ? '點圖片放大查看細節，左右滑動切換圖片' : '點圖片放大查看細節'
  return count.value > 1 ? '左右滑動或點兩側箭頭切換圖片' : ''
})

// 記錄「全圖模式」下的顯示寬度與原始尺寸，用來判斷能不能再放大
const measure = () => {
  const img = imgRef.value
  if (!img || zoomed.value) return
  naturalWidth.value = img.naturalWidth || 0
  naturalHeight.value = img.naturalHeight || 0
  fitWidth.value = img.getBoundingClientRect?.().width || 0
}

const zoomIn = async (clientX, clientY) => {
  const img = imgRef.value
  const stage = stageRef.value
  if (!img || !stage || !canZoom.value) return
  // 以點擊位置為中心放大
  const rect = img.getBoundingClientRect()
  const fx = rect.width ? (clientX - rect.left) / rect.width : 0.5
  const fy = rect.height ? (clientY - rect.top) / rect.height : 0.5
  zoomed.value = true
  await nextTick()
  const width = zoomWidth.value
  const height = naturalWidth.value ? (width * naturalHeight.value) / naturalWidth.value : 0
  stage.scrollLeft = Math.max(0, fx * width - stage.clientWidth / 2)
  stage.scrollTop = Math.max(0, fy * height - stage.clientHeight / 2)
}

const zoomOut = () => {
  zoomed.value = false
  if (stageRef.value) {
    stageRef.value.scrollLeft = 0
    stageRef.value.scrollTop = 0
  }
}

const go = (delta) => {
  if (count.value <= 1) return
  zoomOut()
  index.value = normalizeIndex(index.value + delta)
}

const close = () => {
  emit('close', index.value)
}

// --- 點擊與手勢 ---
let pointerId = null
let startX = 0
let startY = 0
let startScrollLeft = 0
let startScrollTop = 0
let tracking = false
let suppressClick = false

const onPointerDown = (e) => {
  // 觸控滑動後瀏覽器不會再送出 click，所以每次按下時重設，避免吃掉下一次點擊
  suppressClick = false
  if (e.pointerType === 'mouse' && e.button !== 0) return
  if (e.target?.closest?.('button')) return
  tracking = true
  panning.value = false
  pointerId = e.pointerId
  startX = e.clientX
  startY = e.clientY
  startScrollLeft = stageRef.value?.scrollLeft || 0
  startScrollTop = stageRef.value?.scrollTop || 0
}

const onPointerMove = (e) => {
  if (!tracking || e.pointerId !== pointerId) return
  // 放大模式下用滑鼠拖曳捲動（觸控交給瀏覽器原生捲動）
  if (zoomed.value && e.pointerType === 'mouse') {
    const dx = e.clientX - startX
    const dy = e.clientY - startY
    if (!panning.value && Math.abs(dx) < 4 && Math.abs(dy) < 4) return
    if (!panning.value) {
      panning.value = true
      try {
        stageRef.value?.setPointerCapture?.(e.pointerId)
      } catch {
        // 不支援時略過
      }
    }
    stageRef.value.scrollLeft = startScrollLeft - dx
    stageRef.value.scrollTop = startScrollTop - dy
  }
}

const onPointerUp = (e) => {
  if (!tracking || e.pointerId !== pointerId) return
  tracking = false
  if (panning.value) {
    panning.value = false
    suppressClick = true
    try {
      stageRef.value?.releasePointerCapture?.(e.pointerId)
    } catch {
      // 同上
    }
    return
  }
  // 全圖模式：左右滑動切換圖片
  if (!zoomed.value) {
    const dx = e.clientX - startX
    const dy = e.clientY - startY
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      suppressClick = true
      go(dx < 0 ? 1 : -1)
    }
  }
}

const onPointerCancel = () => {
  tracking = false
  panning.value = false
}

const onStageClick = (e) => {
  if (suppressClick) {
    suppressClick = false
    return
  }
  const onImage = e.target === imgRef.value
  if (zoomed.value) {
    // 放大模式：點任何地方都縮回全圖
    zoomOut()
  } else if (onImage) {
    zoomIn(e.clientX, e.clientY)
  } else {
    // 全圖模式點圖片以外的地方：關閉
    close()
  }
}

// 換圖時重新量測；視窗大小改變時（全圖模式）重新計算
watch(index, () => {
  naturalWidth.value = 0
  fitWidth.value = 0
})

const onResize = () => measure()

onMounted(() => {
  window.addEventListener('resize', onResize)
  nextTick(() => closeBtnRef.value?.focus?.({ preventScroll: true }))
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
})

defineExpose({ go, close, index })
</script>

<style scoped>
.tour-lightbox {
  position: fixed;
  inset: 0;
  z-index: 100000;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  background: rgba(3, 5, 10, 0.95);
  color: #e2e8f0;
}

.lightbox-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px max(16px, env(safe-area-inset-right, 0px)) 10px max(16px, env(safe-area-inset-left, 0px));
  padding-top: max(10px, env(safe-area-inset-top, 0px));
}

.lightbox-info {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.lightbox-title {
  font-weight: 800;
  font-size: 1rem;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lightbox-counter {
  flex-shrink: 0;
  font-size: 0.8rem;
  font-weight: 800;
  color: #00e5ff;
  background: rgba(0, 229, 255, 0.12);
  border: 1px solid rgba(0, 229, 255, 0.3);
  padding: 1px 8px;
  border-radius: 999px;
  font-variant-numeric: tabular-nums;
}

.lightbox-close {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
  font-size: 1.1rem;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}

.lightbox-close:hover {
  border-color: #00e5ff;
  color: #00e5ff;
}

/* 圖片區 */
.lightbox-stage {
  position: relative;
  min-height: 0;
  overflow: hidden;
  /* 全圖模式：左右滑動切換圖片，保留上下捲動與雙指縮放 */
  touch-action: pan-y pinch-zoom;
  user-select: none;
  -webkit-user-select: none;
}

.lightbox-stage.is-zoomed {
  overflow: auto;
  touch-action: auto;
  cursor: grab;
  overscroll-behavior: contain;
}

.lightbox-stage.is-panning {
  cursor: grabbing;
}

.lightbox-canvas {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 60px;
  box-sizing: border-box;
}

.lightbox-stage.is-zoomed .lightbox-canvas {
  width: max-content;
  height: auto;
  min-width: 100%;
  min-height: 100%;
  padding: 0;
}

.lightbox-image {
  display: block;
  max-width: 100%;
  max-height: 100%;
  min-width: 0;
  min-height: 0;
  object-fit: contain;
  border-radius: 6px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
  -webkit-user-drag: none;
}

.lightbox-image.can-zoom {
  cursor: zoom-in;
}

.lightbox-image.is-zoomed {
  max-width: none;
  max-height: none;
  height: auto;
  border-radius: 0;
  cursor: zoom-out;
}

.lightbox-stage.is-panning .lightbox-image {
  cursor: grabbing;
}

.lightbox-error {
  color: #8b949e;
  font-weight: 700;
}

/* 左右箭頭 */
.lightbox-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(5, 8, 16, 0.7);
  color: #e2e8f0;
  font-size: 1.7rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 0 3px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.lightbox-arrow:hover {
  border-color: #00e5ff;
  color: #00e5ff;
}

.lightbox-arrow.is-prev {
  left: max(10px, env(safe-area-inset-left, 0px));
}

.lightbox-arrow.is-next {
  right: max(10px, env(safe-area-inset-right, 0px));
}

.lightbox-hint {
  min-height: 1.2em;
  padding: 8px 16px;
  padding-bottom: max(10px, env(safe-area-inset-bottom, 0px));
  text-align: center;
  font-size: 0.82rem;
  color: #8b949e;
}

.lightbox-close:focus-visible,
.lightbox-arrow:focus-visible {
  outline: 2px solid #00e5ff;
  outline-offset: 2px;
}

@media (max-width: 600px) {
  .lightbox-canvas {
    padding: 4px 8px;
  }

  .lightbox-arrow {
    width: 36px;
    height: 36px;
    font-size: 1.4rem;
    top: auto;
    bottom: 44px;
    transform: none;
  }
}
</style>
