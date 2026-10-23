<template>
  <teleport to="body">
    <transition name="modal-fade">
      <div v-if="isVisible" class="tour-modal-backdrop" @click.self="closeTour">
        <div
          ref="panelRef"
          class="tour-modal-panel glass-card"
          :class="{ 'is-wide': isWideLayout }"
          :style="panelStyle"
          @transitionend.self="onPanelTransitionEnd"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-guide-title"
          tabindex="-1"
        >
          <!-- 頂部 Header -->
          <div class="modal-header">
            <div class="header-title-wrap">
              <span class="guide-tag">操作指引</span>
              <h3 id="tour-guide-title" class="guide-title">{{ currentGuide?.featureTitle || '功能操作導引' }}</h3>
            </div>
            <button type="button" class="btn-modal-close" @click="closeTour" title="關閉 (Esc)" aria-label="關閉操作導引">✕</button>
          </div>

          <!-- 主體內容區 (圖片預覽 + 標題 + 說明) -->
          <div class="modal-body" v-if="currentSlide">
            <!-- 示意圖片輪播：每換一步就重新從第一張開始；點圖片開啟放大檢視 -->
            <TourImageCarousel
              ref="carouselRef"
              :key="currentSlide.id || currentSlideIndex"
              :images="slideImages"
              :alt="currentSlide.title"
              @zoom="openZoom"
              @ratio="mediaRatio = $event"
            />

            <!-- 文字說明區 -->
            <div class="slide-content-area">
              <div class="step-indicator">
                <span class="step-badge">STEP {{ currentSlideIndex + 1 }} / {{ currentSlides.length }}</span>
                <h4 class="slide-step-title">{{ currentSlide.title }}</h4>
              </div>
              <p class="slide-desc">{{ currentSlide.description }}</p>
            </div>

            <!-- 分頁圓點 Dots -->
            <div class="slide-dots-indicator" v-if="currentSlides.length > 1">
              <button
                v-for="(_, idx) in currentSlides"
                :key="idx"
                type="button"
                class="dot-btn"
                :class="{ 'is-active': currentSlideIndex === idx }"
                @click="goToSlide(idx)"
                :title="`前往第 ${idx + 1} 步`"
                :aria-label="`前往第 ${idx + 1} 步`"
                :aria-current="currentSlideIndex === idx ? 'step' : undefined"
              ></button>
            </div>
          </div>

          <!-- 底部控制 Footer -->
          <div class="modal-footer">
            <label class="dismiss-checkbox-label">
              <input
                type="checkbox"
                :checked="dontShowAgain"
                @change="toggleDontShowAgain($event.target.checked)"
                class="tour-checkbox"
              />
              <span class="checkbox-text">不再主動顯示此功能導引</span>
            </label>

            <div class="footer-actions">
              <button
                v-if="currentSlideIndex > 0"
                type="button"
                class="btn-action-secondary"
                @click="prevSlide"
              >
                ◀ 上一步
              </button>
              <button
                ref="primaryBtnRef"
                type="button"
                class="btn-action-primary"
                @click="nextSlide"
              >
                {{ isLastSlide ? '完成導引' : '下一步 ▶' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- 放大檢視（放在導引視窗外層，避免被視窗的 transform / blur 影響定位） -->
    <transition name="modal-fade">
      <TourImageLightbox
        v-if="isVisible && zoomState"
        ref="lightboxRef"
        :images="zoomState.images"
        :start-index="zoomState.index"
        :title="zoomState.title"
        @close="closeZoom"
      />
    </transition>
  </teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useTour, getSlideImages, DEFAULT_MEDIA_RATIO, computeFitMediaHeight } from '@/composables/useTour'
import { useNotice } from '@/composables/useNotice'
import TourImageCarousel from '@/components/TourImageCarousel.vue'
import TourImageLightbox from '@/components/TourImageLightbox.vue'

const {
  isOpen,
  currentSlideIndex,
  currentGuide,
  currentSlides,
  currentSlide,
  dontShowAgain,
  toggleDontShowAgain,
  nextSlide,
  prevSlide,
  goToSlide,
  closeTour,
  cancelTour
} = useTour()

// 置頂公告彈窗開啟時先讓公告顯示，關閉後才接著顯示導引，避免兩個視窗疊在一起
const { showTopNoticePopup } = useNotice()
const isVisible = computed(() => isOpen.value && !showTopNoticePopup.value)

const isLastSlide = computed(() => currentSlideIndex.value === currentSlides.value.length - 1)

// 目前這一步的示意圖片（tooltips.json 的 images 陣列，順序即輪播順序）
const slideImages = computed(() => getSlideImages(currentSlide.value))

// 只要這份導引有任何一步放了圖片，就使用大版面（整份導引維持同一個寬度，換步驟時不會忽大忽小）
const isWideLayout = computed(() => currentSlides.value.some((slide) => getSlideImages(slide).length > 0))

// 圖片框寬高比：預設 2.1:1，第一張圖片載入後改用圖片本身的比例
const mediaRatio = ref(DEFAULT_MEDIA_RATIO)

// 圖片框高度上限（px）：說明文字較長或螢幕較矮時由 fitMediaToPanel 算出，null 代表維持 CSS 預設大小
const mediaFitHeight = ref(null)

const panelStyle = computed(() => {
  const style = { '--media-ratio': mediaRatio.value }
  if (mediaFitHeight.value) style['--media-fit-h'] = `${mediaFitHeight.value}px`
  return style
})

// --- 放大檢視 ---
const carouselRef = ref(null)
const lightboxRef = ref(null)
const zoomState = ref(null)
let focusBeforeZoom = null

const openZoom = (index) => {
  if (slideImages.value.length === 0) return
  focusBeforeZoom = document.activeElement
  zoomState.value = {
    images: [...slideImages.value],
    index,
    title: currentSlide.value?.title || ''
  }
}

// 關閉放大檢視：輪播同步到最後看的那一張，焦點回到原本的位置
const closeZoom = (lastIndex) => {
  if (!zoomState.value) return
  zoomState.value = null
  if (typeof lastIndex === 'number') carouselRef.value?.jumpTo?.(lastIndex)
  const target = focusBeforeZoom
  focusBeforeZoom = null
  nextTick(() => {
    if (target && typeof target.focus === 'function' && document.contains(target)) {
      target.focus({ preventScroll: true })
    } else {
      primaryBtnRef.value?.focus?.({ preventScroll: true })
    }
  })
}

// 導引關閉或換步驟時，一併收起放大檢視
watch([isVisible, currentSlideIndex], () => {
  zoomState.value = null
})

// 預先載入下一步的圖片，切換時不會出現空白閃爍
const preloadSlideImages = (slide) => {
  if (typeof Image === 'undefined') return
  for (const src of getSlideImages(slide)) {
    const img = new Image()
    img.src = src
  }
}
watch([isVisible, currentSlideIndex], ([visible, idx]) => {
  if (visible) preloadSlideImages(currentSlides.value[idx + 1])
})

// --- 鍵盤操作：Esc 關閉、← → 切換步驟（放大檢視開著時改為關閉放大檢視、切換圖片） ---
const handleKeydown = (e) => {
  if (!isVisible.value) return
  if (zoomState.value) {
    if (e.key === 'Escape') {
      lightboxRef.value?.close?.()
    } else if (e.key === 'ArrowRight') {
      lightboxRef.value?.go?.(1)
    } else if (e.key === 'ArrowLeft') {
      lightboxRef.value?.go?.(-1)
    } else {
      return
    }
    e.preventDefault()
    e.stopPropagation()
    return
  }
  if (e.key === 'Escape') {
    closeTour()
  } else if (e.key === 'ArrowRight') {
    if (!isLastSlide.value) nextSlide()
  } else if (e.key === 'ArrowLeft') {
    prevSlide()
  } else {
    return
  }
  // 導引開啟時由導引處理這些按鍵，不再傳給底下頁面（例如任務指南的 Esc 關窗）
  e.preventDefault()
  e.stopPropagation()
}

// --- 開啟時：鎖定背景捲動、聚焦按鈕；關閉時還原 ---
const panelRef = ref(null)
const primaryBtnRef = ref(null)
let lastFocusedElement = null
let prevBodyOverflow = ''
let listening = false

// --- 圖片框自動縮放：說明文字較長或螢幕較矮（例如 1366×768 筆電）時縮小圖片，讓整個導引不用捲動 ---
const fitMediaToPanel = () => {
  const panel = panelRef.value
  if (!panel || typeof window === 'undefined') return
  // 手機版（寬度 ≤ 600px）與很矮的橫向螢幕：圖片維持滿版寬度，改讓內容區捲動
  if (!isWideLayout.value || window.innerWidth <= 600 || window.innerHeight <= 520) {
    mediaFitHeight.value = null
    return
  }
  const body = panel.querySelector('.modal-body')
  const frame = panel.querySelector('.slide-media-container')
  if (!body || !frame) return
  const fit = computeFitMediaHeight({
    frameHeight: frame.offsetHeight,
    panelHeight: panel.offsetHeight,
    panelMaxHeight: parseFloat(window.getComputedStyle(panel).maxHeight),
    overflow: body.scrollHeight - body.clientHeight
  })
  if (fit !== null) mediaFitHeight.value = fit
}

// 視窗縮放、字型載入完成或說明文字換行改變時，下一個畫面重新計算
let fitFrameId = 0
const scheduleFit = () => {
  if (typeof window === 'undefined' || fitFrameId) return
  if (typeof window.requestAnimationFrame !== 'function') {
    fitMediaToPanel()
    return
  }
  fitFrameId = window.requestAnimationFrame(() => {
    fitFrameId = 0
    fitMediaToPanel()
  })
}

// 換步驟或縮放視窗時，導引視窗的寬度與最大高度會以動畫過渡（.glass-card 的 transition），動畫結束後再校正一次
const onPanelTransitionEnd = (e) => {
  if (e.propertyName === 'width' || e.propertyName === 'max-height') scheduleFit()
}

let contentResizeObserver = null
const observeContentArea = () => {
  contentResizeObserver?.disconnect()
  contentResizeObserver = null
  const area = panelRef.value?.querySelector('.slide-content-area')
  if (!area || typeof ResizeObserver === 'undefined') return
  contentResizeObserver = new ResizeObserver(scheduleFit)
  contentResizeObserver.observe(area)
}

// 開啟、換步驟、換說明文字或圖片比例改變（視窗寬度會跟著變）時，在畫面更新前重新計算
watch(
  [isVisible, currentSlideIndex, () => currentSlide.value?.description, mediaRatio],
  ([visible]) => {
    if (!visible) return
    nextTick(() => {
      // 等待期間導引已關閉（視窗還在淡出動畫中）就不再量測
      if (!isVisible.value) return
      fitMediaToPanel()
      observeContentArea()
    })
  }
)

const activate = () => {
  if (listening) return
  listening = true
  lastFocusedElement = document.activeElement
  prevBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', handleKeydown, true)
  window.addEventListener('resize', scheduleFit)
  nextTick(() => {
    ;(primaryBtnRef.value || panelRef.value)?.focus?.({ preventScroll: true })
  })
}

const deactivate = () => {
  if (!listening) return
  listening = false
  window.removeEventListener('keydown', handleKeydown, true)
  window.removeEventListener('resize', scheduleFit)
  contentResizeObserver?.disconnect()
  contentResizeObserver = null
  if (fitFrameId) {
    window.cancelAnimationFrame(fitFrameId)
    fitFrameId = 0
  }
  mediaFitHeight.value = null
  document.body.style.overflow = prevBodyOverflow
  const target = lastFocusedElement
  lastFocusedElement = null
  if (target && typeof target.focus === 'function' && document.contains(target)) {
    target.focus({ preventScroll: true })
  }
}

watch(isVisible, (visible) => {
  if (typeof document === 'undefined') return
  if (visible) activate()
  else deactivate()
}, { immediate: true })

// 切換頁面（含瀏覽器上一頁/下一頁）時關閉導引，避免上一頁的導引殘留在新頁面
const route = useRoute()
watch(() => route.path, () => {
  cancelTour()
})

onBeforeUnmount(() => {
  deactivate()
})
</script>

<style scoped>
.tour-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(5, 8, 16, 0.85);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  padding: 20px;
  box-sizing: border-box;
}

.tour-modal-panel {
  width: 620px;
  max-width: 95vw;
  max-height: 90vh;
  max-height: 90dvh;
  background: rgba(15, 23, 36, 0.98);
  border: 1px solid rgba(0, 229, 255, 0.35);
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.9), 0 0 30px rgba(0, 229, 255, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  outline: none;
  animation: modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

/*
 * 大版面（導引有放圖片時）：
 * 圖片框高度上限 = 螢幕可用高度扣掉標題、說明文字與按鈕列（約 340px），
 * 視窗寬度再依圖片比例收合，讓圖片盡量放大、左右不留多餘空白；
 * 螢幕較矮時視窗至少保留 720px 寬，說明文字才不會被擠成很多行。
 * 說明文字仍放不下時，圖片框會再自動縮小（--media-fit-h，由 fitMediaToPanel 計算）
 */
.tour-modal-panel.is-wide {
  --media-max-h: max(160px, calc(92vh - 340px));
  width: min(1180px, 94vw, max(720px, calc(var(--media-max-h) * var(--media-ratio, 2.1) + 48px)));
  max-width: 94vw;
  max-height: 92vh;
}

@supports (height: 1dvh) {
  .tour-modal-panel.is-wide {
    --media-max-h: max(160px, calc(92dvh - 340px));
    max-height: 92dvh;
  }
}

/* 大版面收緊上下留白，把空間留給圖片 */
.tour-modal-panel.is-wide .modal-header {
  padding: 12px 24px;
}

.tour-modal-panel.is-wide .modal-body {
  padding: 16px 24px;
  gap: 12px;
}

.tour-modal-panel.is-wide .modal-footer {
  padding: 12px 24px;
}

.tour-modal-panel.is-wide .slide-content-area {
  gap: 6px;
}

.tour-modal-panel.is-wide .slide-dots-indicator {
  padding-top: 2px;
}

.tour-modal-panel.is-wide .slide-step-title {
  font-size: 1.15rem;
}

.tour-modal-panel.is-wide .slide-desc {
  font-size: 0.97rem;
}

/* 螢幕很矮（例如手機橫放）時不再用高度去限制視窗寬度，改讓內容區捲動 */
@media (max-height: 520px) {
  .tour-modal-panel.is-wide {
    width: min(1180px, 94vw);
  }
}

@keyframes modalPop {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.header-title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.guide-tag {
  font-size: 0.72rem;
  font-weight: 800;
  color: #00e5ff;
  background: rgba(0, 229, 255, 0.12);
  border: 1px solid rgba(0, 229, 255, 0.3);
  padding: 2px 8px;
  border-radius: 6px;
  letter-spacing: 0.5px;
  white-space: nowrap;
  flex-shrink: 0;
}

.guide-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: #fff;
  text-shadow: 0 0 10px rgba(0, 229, 255, 0.3);
}

.btn-modal-close {
  background: transparent;
  border: none;
  color: #8b949e;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  line-height: 1;
  transition: all 0.15s;
  flex-shrink: 0;
}

.btn-modal-close:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  /* 讓內容過長時由這一區捲動，Header 與 Footer 永遠可見 */
  flex: 1 1 auto;
  min-height: 0;
}

/* 示意圖片輪播的樣式在 TourImageCarousel.vue */

/* 文字說明區 */
.slide-content-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.step-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
}

.step-badge {
  font-size: 0.75rem;
  font-weight: 800;
  color: #34d399;
  background: rgba(52, 211, 153, 0.12);
  border: 1px solid rgba(52, 211, 153, 0.3);
  padding: 2px 8px;
  border-radius: 6px;
  white-space: nowrap;
  flex-shrink: 0;
}

.slide-step-title {
  margin: 0;
  font-size: 1.08rem;
  font-weight: 800;
  color: #fff;
}

.slide-desc {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.7;
  color: #cbd5e1;
  /* 支援 tooltips.json 說明文字中的 \n 換行 */
  white-space: pre-line;
}

/* 點點指示器 */
.slide-dots-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding-top: 6px;
}

.dot-btn {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  cursor: pointer;
  padding: 0;
  transition: all 0.2s;
}

.dot-btn.is-active {
  width: 22px;
  border-radius: 4px;
  background: #00e5ff;
  box-shadow: 0 0 8px rgba(0, 229, 255, 0.6);
}

/* 底部操作區 */
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(10, 15, 24, 0.6);
  flex-shrink: 0;
}

.dismiss-checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.tour-checkbox {
  cursor: pointer;
  accent-color: #00e5ff;
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

.checkbox-text {
  font-size: 0.8rem;
  color: #8b949e;
  transition: color 0.15s;
}

.dismiss-checkbox-label:hover .checkbox-text {
  color: #e2e8f0;
}

.footer-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.btn-action-primary {
  background: linear-gradient(135deg, #00e5ff, #00b4d8);
  color: #050b14;
  border: none;
  border-radius: 8px;
  padding: 7px 18px;
  font-weight: 800;
  font-size: 0.88rem;
  cursor: pointer;
  box-shadow: 0 0 12px rgba(0, 229, 255, 0.3);
  transition: all 0.15s;
  white-space: nowrap;
}

.btn-action-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 0 18px rgba(0, 229, 255, 0.5);
}

.btn-action-secondary {
  background: rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 7px 14px;
  font-size: 0.88rem;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.btn-action-secondary:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.btn-action-primary:focus-visible,
.btn-action-secondary:focus-visible,
.btn-modal-close:focus-visible,
.dot-btn:focus-visible {
  outline: 2px solid #00e5ff;
  outline-offset: 2px;
}

/* 手機版：縮小留白，Footer 改為上下排列、按鈕加大方便點擊 */
@media (max-width: 600px) {
  .tour-modal-backdrop {
    padding: 12px;
  }

  .tour-modal-panel,
  .tour-modal-panel.is-wide {
    width: 100%;
    max-width: 100%;
    max-height: 94vh;
    max-height: 94dvh;
  }

  .tour-modal-panel.is-wide .modal-header {
    padding: 12px 14px;
  }

  .tour-modal-panel.is-wide .modal-body {
    padding: 14px;
  }

  .tour-modal-panel.is-wide .modal-footer {
    padding: 12px 14px;
  }

  .tour-modal-panel.is-wide .slide-step-title {
    font-size: 1rem;
  }

  .tour-modal-panel.is-wide .slide-desc {
    font-size: 0.92rem;
  }

  .modal-header {
    padding: 12px 14px;
  }

  .guide-title {
    font-size: 1rem;
  }

  .modal-body {
    padding: 14px;
    gap: 12px;
  }

  .slide-step-title {
    font-size: 1rem;
  }

  .modal-footer {
    flex-direction: column-reverse;
    align-items: stretch;
    gap: 10px;
    padding: 12px 14px;
  }

  .footer-actions {
    width: 100%;
  }

  .footer-actions button {
    flex: 1;
    padding: 10px 14px;
  }

  .dismiss-checkbox-label {
    justify-content: center;
  }
}

/* Modal Fade Transition */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
