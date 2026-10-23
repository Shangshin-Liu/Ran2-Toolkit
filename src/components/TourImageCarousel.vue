<template>
  <div
    ref="viewportRef"
    class="slide-media-container"
    :class="{ 'is-carousel': isLoop, 'is-dragging': dragging, 'has-image': count > 0 }"
    role="region"
    aria-roledescription="carousel"
    :aria-label="isLoop ? `示意圖片，共 ${count} 張，可左右滑動切換，點圖片放大檢視` : '示意圖片，點圖片放大檢視'"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="endDrag"
    @pointercancel="endDrag"
    @click="onViewportClick"
  >
    <!-- 尚未配置任何圖片 -->
    <div v-if="count === 0" class="slide-image-placeholder">
      <div class="placeholder-icon">🖼️</div>
      <div class="placeholder-text">示意圖片準備中</div>
      <div v-if="isDev" class="placeholder-subtext">尚未配置圖檔</div>
    </div>

    <template v-else>
      <!-- 圖片軌道：多張時頭尾各多放一張複製圖，讓最後一張往後滑能無縫回到第一張 -->
      <div
        class="carousel-track"
        :class="{ 'is-animating': animating && !dragging }"
        :style="trackStyle"
        @transitionend="onTransitionEnd"
      >
        <div
          v-for="(item, i) in trackItems"
          :key="item.key"
          class="carousel-slide"
          :aria-hidden="item.clone || i !== pos ? 'true' : undefined"
        >
          <img
            v-if="!failed.has(item.src)"
            :src="item.src"
            :alt="isLoop ? `${alt}（第 ${item.index + 1} 張）` : alt"
            class="slide-image"
            draggable="false"
            @load="onImageLoad(item, $event)"
            @error="markFailed(item.src)"
          />
          <!-- 圖片載入失敗時只影響這一張 -->
          <div v-else class="slide-image-placeholder">
            <div class="placeholder-icon">🖼️</div>
            <div class="placeholder-text">示意圖片準備中</div>
            <div v-if="isDev" class="placeholder-subtext">{{ item.src }}</div>
          </div>
        </div>
      </div>

      <!-- 放大檢視按鈕（也提示玩家可以點圖片放大） -->
      <button
        v-if="!currentFailed"
        type="button"
        class="carousel-zoom-btn"
        aria-label="放大檢視圖片"
        title="放大檢視"
        @click="requestZoom"
      >
        <svg class="zoom-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" />
          <line x1="11" y1="8" x2="11" y2="14" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
        <span>放大</span>
      </button>

      <template v-if="isLoop">
        <button type="button" class="carousel-arrow is-prev" aria-label="上一張圖片" title="上一張" @click="go(-1)">‹</button>
        <button type="button" class="carousel-arrow is-next" aria-label="下一張圖片" title="下一張" @click="go(1)">›</button>

        <div class="carousel-dots">
          <button
            v-for="(_, i) in images"
            :key="i"
            type="button"
            class="carousel-dot"
            :class="{ 'is-active': i === currentIndex }"
            :aria-label="`第 ${i + 1} 張圖片`"
            :aria-current="i === currentIndex ? 'true' : undefined"
            @click="goToIndex(i)"
          ></button>
        </div>

        <span class="sr-only" aria-live="polite">第 {{ currentIndex + 1 }} 張，共 {{ count }} 張</span>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onBeforeUnmount } from 'vue'
import { clampMediaRatio } from '@/composables/useTour'

const props = defineProps({
  // 圖片路徑陣列：陣列順序就是顯示順序
  images: { type: Array, default: () => [] },
  alt: { type: String, default: '' }
})

// zoom：點圖片或「放大」按鈕，要求放大檢視目前這張（參數為圖片索引）
// ratio：第一張圖片載入後回報它的寬高比，讓導覽視窗配合圖片比例
const emit = defineEmits(['zoom', 'ratio'])

const isDev = import.meta.env.DEV
const TRANSITION_MS = 320
// 滑動距離超過圖片寬度的 18%（至少 40px），或快速甩動，就切換圖片
const SWIPE_RATIO = 0.18
const SWIPE_MIN_PX = 40
// 按下到放開移動不超過這個距離，視為「點一下」
const TAP_SLOP_PX = 6

const count = computed(() => props.images.length)
const isLoop = computed(() => count.value > 1)

const trackItems = computed(() => {
  const imgs = props.images
  const items = imgs.map((src, i) => ({ src, key: `img-${i}`, index: i, clone: false }))
  if (!isLoop.value) return items
  return [
    { src: imgs[imgs.length - 1], key: 'clone-last', index: imgs.length - 1, clone: true },
    ...items,
    { src: imgs[0], key: 'clone-first', index: 0, clone: true }
  ]
})

// pos：目前在軌道上的位置；多張時 0 與 count + 1 是頭尾的複製圖
const pos = ref(isLoop.value ? 1 : 0)
const animating = ref(false)
const dragging = ref(false)
const dragOffset = ref(0)
const failed = reactive(new Set())
const viewportRef = ref(null)
let safetyTimer = null

const currentIndex = computed(() => {
  if (!isLoop.value) return 0
  return (pos.value - 1 + count.value) % count.value
})

const currentFailed = computed(() => failed.has(props.images[currentIndex.value]))

const trackStyle = computed(() => ({
  transform: `translate3d(calc(${-pos.value * 100}% + ${dragOffset.value}px), 0, 0)`
}))

const markFailed = (src) => {
  if (src) failed.add(src)
}

const onImageLoad = (item, e) => {
  // 只用真正的第一張（不是複製圖）決定圖片框比例
  if (item.key !== 'img-0') return
  const ratio = clampMediaRatio(e?.target?.naturalWidth, e?.target?.naturalHeight)
  if (ratio) emit('ratio', ratio)
}

const requestZoom = () => {
  if (count.value === 0 || currentFailed.value) return
  emit('zoom', currentIndex.value)
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

const finishAnimation = () => {
  clearTimeout(safetyTimer)
  safetyTimer = null
  if (!animating.value) return
  animating.value = false
  // 停在複製圖上時，不帶動畫地跳回對應的真正圖片（畫面一樣，所以看不出跳動）
  if (pos.value === 0) pos.value = count.value
  else if (pos.value === count.value + 1) pos.value = 1
}

const startAnimation = () => {
  animating.value = true
  clearTimeout(safetyTimer)
  // 保險機制：若 transitionend 沒觸發（例如分頁在背景），時間到也會收尾
  safetyTimer = setTimeout(finishAnimation, TRANSITION_MS + 200)
}

const onTransitionEnd = (e) => {
  if (e && e.target !== e.currentTarget) return
  finishAnimation()
}

// delta = 1 下一張、-1 上一張；最後一張的下一張是第一張，第一張的上一張是最後一張
const go = (delta) => {
  if (!isLoop.value || animating.value) return
  if (prefersReducedMotion()) {
    pos.value = ((currentIndex.value + delta + count.value) % count.value) + 1
    return
  }
  pos.value += delta
  startAnimation()
}

const goToIndex = (idx) => {
  if (!isLoop.value || animating.value || idx === currentIndex.value) return
  pos.value = idx + 1
  if (!prefersReducedMotion()) startAnimation()
}

// 不帶動畫直接切到指定的圖片（關閉放大檢視時，同步到最後看的那張）
const jumpTo = (idx) => {
  if (!isLoop.value || typeof idx !== 'number' || Number.isNaN(idx)) return
  clearTimeout(safetyTimer)
  animating.value = false
  dragging.value = false
  dragOffset.value = 0
  pos.value = (((idx % count.value) + count.value) % count.value) + 1
}

// --- 滑動手勢（觸控與滑鼠共用 Pointer Events）與點圖片放大 ---
let tracking = false
let pointerId = null
let startX = 0
let startY = 0
let startTime = 0
// 這次按下後有移動過（拖曳或捲動）：接著送來的 click 不算「點圖片」
let suppressClick = false

const onPointerDown = (e) => {
  // 觸控滑動後瀏覽器不會再送出 click，所以每次按下時重設
  suppressClick = false
  if (count.value === 0) return
  if (e.pointerType === 'mouse' && e.button !== 0) return
  // 點箭頭、圓點或放大按鈕時交給按鈕自己處理
  if (e.target?.closest?.('button')) return
  tracking = true
  pointerId = e.pointerId
  startX = e.clientX
  startY = e.clientY
  startTime = now()
}

/*
 * 點圖片開啟放大檢視：用 click 而不是 pointerup 觸發，
 * 否則手機點一下時，瀏覽器在放開後補送的 click 會落在剛打開的放大檢視上，把它立刻關掉
 */
const onViewportClick = (e) => {
  if (e?.target?.closest?.('button')) return
  if (suppressClick) {
    suppressClick = false
    return
  }
  requestZoom()
}

const onPointerMove = (e) => {
  if (!tracking || e.pointerId !== pointerId) return
  const dx = e.clientX - startX
  const dy = e.clientY - startY
  if (!dragging.value) {
    if (Math.abs(dx) < TAP_SLOP_PX && Math.abs(dy) < TAP_SLOP_PX) return
    suppressClick = true
    // 只有一張、動畫中或上下移動比較多（捲動內容）：不當作切換圖片的滑動
    if (!isLoop.value || animating.value || Math.abs(dy) > Math.abs(dx)) {
      tracking = false
      return
    }
    dragging.value = true
    try {
      viewportRef.value?.setPointerCapture?.(e.pointerId)
    } catch {
      // 部分瀏覽器不支援時略過
    }
  }
  dragOffset.value = dx
}

const endDrag = (e) => {
  if (!tracking || (e && e.pointerId !== pointerId)) return
  tracking = false
  if (!dragging.value) return
  try {
    viewportRef.value?.releasePointerCapture?.(pointerId)
  } catch {
    // 同上
  }

  const dx = dragOffset.value
  const width = viewportRef.value?.clientWidth || 0
  const elapsed = Math.max(1, now() - startTime)
  const isFlick = Math.abs(dx) > 24 && Math.abs(dx) / elapsed > 0.5
  const passed = Math.abs(dx) > Math.max(SWIPE_MIN_PX, width * SWIPE_RATIO) || isFlick

  dragging.value = false
  dragOffset.value = 0
  if (passed) {
    // 手指往左滑 → 看右邊的下一張；往右滑 → 看上一張
    go(dx < 0 ? 1 : -1)
  } else if (dx !== 0 && !prefersReducedMotion()) {
    // 距離不夠：彈回原本那張
    startAnimation()
  }
}

// 圖片清單變更時回到第一張
watch(count, () => {
  clearTimeout(safetyTimer)
  animating.value = false
  dragging.value = false
  dragOffset.value = 0
  pos.value = isLoop.value ? 1 : 0
})

onBeforeUnmount(() => {
  clearTimeout(safetyTimer)
})

defineExpose({ jumpTo, currentIndex })
</script>

<style scoped>
/*
 * 投影片主圖區：寬高比跟著圖片（由導覽視窗以 --media-ratio 提供），
 * 高度不超過 --media-max-h（依螢幕高度計算）與 --media-fit-h（說明文字較長時由導覽視窗算出），
 * 寬度不超過視窗內容寬度
 */
.slide-media-container {
  position: relative;
  width: min(100%, calc(min(var(--media-fit-h, 100vh), var(--media-max-h, 42vh)) * var(--media-ratio, 2.4)));
  max-width: 100%;
  aspect-ratio: var(--media-ratio, 2.4);
  margin-inline: auto;
  flex-shrink: 0;
  border-radius: 10px;
  overflow: hidden;
  background: rgba(8, 12, 20, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  /* 允許上下捲動，左右滑動交給輪播處理 */
  touch-action: pan-y;
  user-select: none;
  -webkit-user-select: none;
}

.slide-media-container.has-image {
  cursor: zoom-in;
}

.slide-media-container.is-dragging {
  cursor: grabbing;
}

.carousel-track {
  display: flex;
  width: 100%;
  height: 100%;
  will-change: transform;
}

.carousel-track.is-animating {
  transition: transform 0.32s cubic-bezier(0.22, 0.61, 0.36, 1);
}

.carousel-slide {
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.slide-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background-color: #0b1019;
  pointer-events: none;
  -webkit-user-drag: none;
}

.slide-image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #8b949e;
  padding: 20px;
  text-align: center;
}

.placeholder-icon {
  font-size: 2.5rem;
  opacity: 0.6;
}

.placeholder-text {
  font-size: 0.95rem;
  font-weight: 700;
  color: #c9d1d9;
}

.placeholder-subtext {
  font-size: 0.78rem;
  opacity: 0.5;
  font-family: monospace;
  word-break: break-all;
}

/* 右上角「放大」按鈕 */
.carousel-zoom-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(5, 8, 16, 0.65);
  color: #e2e8f0;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.4;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}

.carousel-zoom-btn:hover {
  border-color: #00e5ff;
  color: #00e5ff;
  background: rgba(5, 8, 16, 0.85);
}

.zoom-icon {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.4;
  stroke-linecap: round;
}

/* 左右箭頭 */
.carousel-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(5, 8, 16, 0.6);
  color: #e2e8f0;
  font-size: 1.35rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 0 2px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}

.carousel-arrow:hover {
  border-color: #00e5ff;
  color: #00e5ff;
  background: rgba(5, 8, 16, 0.8);
}

.carousel-arrow.is-prev {
  left: 8px;
}

.carousel-arrow.is-next {
  right: 8px;
}

/* 圖片位置圓點 */
.carousel-dots {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 9px;
  border-radius: 999px;
  background: rgba(5, 8, 16, 0.6);
}

.carousel-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  border: none;
  padding: 0;
  background: rgba(255, 255, 255, 0.45);
  cursor: pointer;
  transition: all 0.2s;
}

.carousel-dot.is-active {
  width: 16px;
  border-radius: 3px;
  background: #00e5ff;
}

.carousel-arrow:focus-visible,
.carousel-dot:focus-visible,
.carousel-zoom-btn:focus-visible {
  outline: 2px solid #00e5ff;
  outline-offset: 2px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 600px) {
  .carousel-arrow {
    width: 28px;
    height: 28px;
    font-size: 1.15rem;
  }

  .carousel-zoom-btn {
    top: 6px;
    right: 6px;
    padding: 3px 8px 3px 6px;
    font-size: 0.72rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .carousel-track.is-animating {
    transition: none;
  }
}
</style>
