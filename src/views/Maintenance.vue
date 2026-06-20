<template>
  <div class="maintenance-container" :class="'theme-' + featureKey">
    <!-- 背景網格與徑向光暈 -->
    <div class="bg-grid"></div>
    <div class="bg-radial"></div>

    <div class="maintenance-card glass-card animate-glow">
      <!-- 頂部科幻警告圖示 -->
      <div class="warning-icon-wrapper">
        <div class="warning-icon-glow"></div>
        <div class="warning-icon">⚠️</div>
      </div>

      <!-- 標題與副標題 -->
      <h1 class="maintenance-title theme-text">{{ maintenanceInfo.title }}</h1>
      <p class="maintenance-subtitle">SYSTEM UNDER MAINTENANCE</p>

      <!-- 裝飾用科幻線條 -->
      <div class="sci-fi-divider">
        <div class="line"></div>
        <div class="dot"></div>
        <div class="line"></div>
      </div>

      <!-- 維護公告訊息 -->
      <div class="message-box">
        <p class="message-text">{{ maintenanceInfo.message }}</p>
      </div>

      <!-- 底部操作區 -->
      <div class="actions-area">
        <!-- 若不是首頁維護，提供返回首頁按鈕 -->
        <template v-if="featureKey !== 'home'">
          <router-link to="/" class="btn-back-home">
            返回首頁
          </router-link>
        </template>
        
        <!-- 若是首頁維護，顯示伺服器重連進度條 -->
        <template v-else>
          <div class="loading-container">
            <span class="loading-text">正在與玄嚴/聖門/鳳凰伺服器重新連線...</span>
            <div class="progress-bar-container">
              <div class="progress-bar-fill"></div>
            </div>
            <div class="status-indicator">
              <span class="blink-dot"></span> 偵測伺服器狀態中 (RETRYING...)
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { maintenanceConfig } from '@/config/maintenance.js'

const route = useRoute()

// 取得當前是哪個功能在維護
const featureKey = computed(() => {
  const feature = route.query.feature
  return maintenanceConfig[feature] ? feature : 'home'
})

// 取得維護詳細資料
const maintenanceInfo = computed(() => {
  return maintenanceConfig[featureKey.value] || maintenanceConfig.home
})
</script>

<style scoped>
/* 全域佈局與主題變數定義 */
.maintenance-container {
  min-height: 80vh;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  z-index: 1;
  font-family: 'Microsoft JhengHei', '微軟正黑體', sans-serif;
  color: #fff;
  padding: 20px;

  /* 預設配色（適用於首頁維護：以亮白、深灰與低調暗紅為主，確保顯示明確但偏深色系） */
  --theme-color: #ffffff;
  --theme-glow: rgba(255, 255, 255, 0.3);
  --theme-bg-glow: rgba(255, 0, 85, 0.05); /* 首頁維護底色依然帶有微弱暗紅 */
  --theme-text-color: #ffffff;
}

/* 各主題專屬配色，與 App.vue 功能主題對應 */
.theme-home {
  --theme-color: #ffffff;
  --theme-glow: rgba(255, 255, 255, 0.2);
  --theme-bg-glow: rgba(255, 255, 255, 0.02);
  --theme-text-color: #ffffff;
}

/* 任務指南 (tasks) -> 藍色/青色 (snipper) */
.theme-tasks {
  --theme-color: #00e5ff;
  --theme-glow: rgba(0, 229, 255, 0.4);
  --theme-bg-glow: rgba(0, 229, 255, 0.08);
  --theme-text-color: #00e5ff;
}

/* 禮盒查詢 (boxes) -> 紫色 (box) */
.theme-boxes {
  --theme-color: #c800ff;
  --theme-glow: rgba(200, 0, 255, 0.4);
  --theme-bg-glow: rgba(200, 0, 255, 0.08);
  --theme-text-color: #c800ff;
}

/* 練功團 (parties) -> 粉紅/紅色 (warrior) */
.theme-parties {
  --theme-color: #ff0055;
  --theme-glow: rgba(255, 0, 85, 0.4);
  --theme-bg-glow: rgba(255, 0, 85, 0.08);
  --theme-text-color: #ff0055;
}

/* 好物分享 (share) -> 綠色 (qigong) */
.theme-share {
  --theme-color: #00ff66;
  --theme-glow: rgba(0, 255, 102, 0.4);
  --theme-bg-glow: rgba(0, 255, 102, 0.08);
  --theme-text-color: #00ff66;
}

/* 科技背景 */
.bg-grid {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
  background-size: 35px 35px;
  background-position: center;
  z-index: -2;
  pointer-events: none;
}

.bg-radial {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, var(--theme-bg-glow) 0%, transparent 70%);
  z-index: -1;
  pointer-events: none;
}

/* 磨砂玻璃卡片 */
.maintenance-card {
  width: 100%;
  max-width: 580px;
  background: rgba(10, 12, 18, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 45px 30px;
  text-align: center;
  box-shadow: 
    0 15px 50px rgba(0, 0, 0, 0.85), 
    0 0 30px var(--theme-glow);
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: border-color 0.4s ease, box-shadow 0.4s ease;
}

/* 發光呼吸燈 */
@keyframes card-glow {
  0%, 100% {
    box-shadow: 0 15px 50px rgba(0, 0, 0, 0.85), 0 0 25px var(--theme-glow);
  }
  50% {
    box-shadow: 0 15px 50px rgba(0, 0, 0, 0.85), 0 0 45px var(--theme-glow);
  }
}

.animate-glow {
  animation: card-glow 4s infinite ease-in-out;
}

/* 警告 Icon */
.warning-icon-wrapper {
  position: relative;
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.warning-icon {
  font-size: 3.2rem;
  z-index: 2;
  animation: icon-float 3s infinite ease-in-out;
}

.warning-icon-glow {
  position: absolute;
  width: 65px;
  height: 65px;
  border-radius: 50%;
  background: var(--theme-glow);
  filter: blur(15px);
  z-index: 1;
  animation: icon-pulse 1.8s infinite ease-in-out;
  transition: background 0.4s ease;
}

@keyframes icon-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes icon-pulse {
  0%, 100% { transform: scale(0.9); opacity: 0.4; }
  50% { transform: scale(1.25); opacity: 0.85; }
}

/* 標題設定 */
.maintenance-title {
  font-size: 1.9rem;
  font-weight: 800;
  margin-bottom: 6px;
  letter-spacing: 1px;
}

.theme-text {
  color: var(--theme-text-color);
  text-shadow: 0 0 10px var(--theme-glow), 0 0 20px rgba(0,0,0,0.5);
  transition: color 0.4s ease, text-shadow 0.4s ease;
}

.maintenance-subtitle {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 3px;
  color: rgba(255, 255, 255, 0.25);
  margin-bottom: 25px;
}

/* 科幻風格分隔線 */
.sci-fi-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin-bottom: 35px;
}

.sci-fi-divider .line {
  height: 1px;
  width: 90px;
  background: linear-gradient(90deg, transparent, var(--theme-color), transparent);
  transition: background 0.4s ease;
  opacity: 0.6;
}

.sci-fi-divider .dot {
  width: 6px;
  height: 6px;
  background: var(--theme-color);
  border-radius: 50%;
  box-shadow: 0 0 8px var(--theme-glow);
  transition: background 0.4s ease, box-shadow 0.4s ease;
}

/* 公告文字 */
.message-box {
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  padding: 26px 20px;
  margin-bottom: 35px;
  box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.7);
}

.message-text {
  font-size: 1.05rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.85);
  margin: 0;
}

/* 按鈕樣式 */
.btn-back-home {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid var(--theme-color);
  color: var(--theme-color);
  padding: 12px 32px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  text-shadow: 0 0 5px var(--theme-glow);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

.btn-back-home:hover {
  background: var(--theme-color);
  color: #0a0c12;
  text-shadow: none;
  box-shadow: 0 0 22px var(--theme-glow);
  transform: translateY(-2px);
}

/* 進度條樣式 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.loading-text {
  font-size: 0.88rem;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 12px;
}

.progress-bar-container {
  width: 100%;
  max-width: 320px;
  height: 6px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 15px;
}

.progress-bar-fill {
  height: 100%;
  width: 45%;
  background: linear-gradient(90deg, #ff0055, #ff5500);
  border-radius: 3px;
  box-shadow: 0 0 10px #ff0055;
  animation: progress-slide 2.2s infinite ease-in-out;
}

@keyframes progress-slide {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(250%); }
}

.status-indicator {
  font-size: 0.82rem;
  color: #ff0055;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}

.blink-dot {
  width: 8px;
  height: 8px;
  background: #ff0055;
  border-radius: 50%;
  box-shadow: 0 0 8px #ff0055;
  animation: blink 1.2s infinite ease-in-out;
}

@keyframes blink {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 1; }
}

/* 手機版適應 */
@media (max-width: 480px) {
  .maintenance-card {
    padding: 35px 20px;
  }
  .maintenance-title {
    font-size: 1.45rem;
  }
  .message-text {
    font-size: 0.95rem;
  }
}
</style>
