<template>
  <teleport to="body">
    <transition name="modal-fade">
      <div v-if="isOpen" class="tour-modal-backdrop" @click="closeTour">
        <div class="tour-modal-panel glass-card" @click.stop>
          <!-- 頂部 Header -->
          <div class="modal-header">
            <div class="header-title-wrap">
              <span class="guide-tag">操作指引</span>
              <h3 class="guide-title">{{ currentGuide?.featureTitle || '功能操作導引' }}</h3>
            </div>
            <button class="btn-modal-close" @click="closeTour" title="關閉">✕</button>
          </div>

          <!-- 主體內容區 (標題 + 說明 + 圖片預覽) -->
          <div class="modal-body" v-if="currentSlide">
            <!-- 幻燈片主圖區 -->
            <div class="slide-media-container">
              <img 
                v-if="currentSlide.image" 
                :src="currentSlide.image" 
                :alt="currentSlide.title" 
                class="slide-image"
                @error="handleImageError"
              />
              <!-- 當尚無圖片時的優雅佔位區 -->
              <div v-else class="slide-image-placeholder">
                <div class="placeholder-icon">🖼️</div>
                <div class="placeholder-text">示意圖片準備中</div>
                <div class="placeholder-subtext">{{ currentSlide.image || '尚未配置圖檔' }}</div>
              </div>
            </div>

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
                class="dot-btn"
                :class="{ 'is-active': currentSlideIndex === idx }"
                @click="goToSlide(idx)"
                :title="`前往第 ${idx + 1} 步`"
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
                class="btn-action-secondary" 
                @click="prevSlide"
              >
                ◀ 上一步
              </button>
              <button 
                class="btn-action-primary" 
                @click="nextSlide"
              >
                {{ currentSlideIndex === currentSlides.length - 1 ? '完成導引' : '下一步 ▶' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { useTour } from '@/composables/useTour';

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
  closeTour 
} = useTour();

const handleImageError = (e) => {
  // 若找不到圖片，優雅切換為隱藏圖片並顯示佔位提示
  e.target.style.display = 'none';
};
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
  background: rgba(15, 23, 36, 0.98);
  border: 1px solid rgba(0, 229, 255, 0.35);
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.9), 0 0 30px rgba(0, 229, 255, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
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
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.header-title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
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
}

/* 投影片主圖區 */
.slide-media-container {
  width: 100%;
  height: 240px;
  border-radius: 10px;
  overflow: hidden;
  background: rgba(8, 12, 20, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

.slide-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background-color: #0b1019;
}

.slide-image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #8b949e;
  padding: 20px;
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
}

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
  line-height: 1.6;
  color: #cbd5e1;
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
  padding: 14px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(10, 15, 24, 0.6);
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
}

.btn-action-secondary:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
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
