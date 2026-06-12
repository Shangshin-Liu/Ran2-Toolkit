<template>
  <div class="site-loading-overlay" :class="[themeClass, { 'fullscreen': fullscreen }]">
    <div class="loading-content">
      <!-- 跳動波浪文字 Bouncing Wave Text -->
      <div class="bouncing-text">
        <span 
          v-for="(char, index) in message" 
          :key="index"
          :style="{ animationDelay: `${index * 0.1}s` }"
        >
          {{ char }}
        </span>
      </div>
      <!-- 霓虹光圈旋轉 -->
      <div class="neon-ring"></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  message: {
    type: String,
    default: '拉拉拉~~~'
  },
  theme: {
    type: String,
    default: 'qigong' // 'qigong' | 'warrior' | 'box'
  },
  fullscreen: {
    type: Boolean,
    default: false
  }
})

const themeClass = computed(() => `theme-${props.theme}`)
</script>

<style scoped>
.site-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(8, 9, 13, 0.95);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  border-radius: 8px;
  min-height: 250px;
}

.site-loading-overlay.fullscreen {
  position: fixed;
  z-index: 9999;
  border-radius: 0;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  position: relative;
}

/* 跳動文字 */
.bouncing-text {
  display: flex;
  gap: 2px;
  font-size: 1.8rem;
  font-weight: 900;
  letter-spacing: 2px;
}

.bouncing-text span {
  display: inline-block;
  animation: bounce 1.2s infinite ease-in-out;
}

/* 主題色定義 */
.theme-qigong .bouncing-text span {
  color: #00ff66;
  text-shadow: 0 0 10px rgba(0, 255, 102, 0.8), 0 0 20px rgba(0, 255, 102, 0.4);
}

.theme-warrior .bouncing-text span {
  color: #ff0055;
  text-shadow: 0 0 10px rgba(255, 0, 85, 0.8), 0 0 20px rgba(255, 0, 85, 0.4);
}

.theme-box .bouncing-text span {
  color: #c800ff;
  text-shadow: 0 0 10px rgba(200, 0, 255, 0.8), 0 0 20px rgba(200, 0, 255, 0.4);
}

/* 霓虹光圈 */
.neon-ring {
  width: 60px;
  height: 60px;
  border: 3px solid transparent;
  border-radius: 50%;
  animation: spin 1.5s linear infinite;
}

.theme-qigong .neon-ring {
  border-top: 3px solid #00ff66;
  box-shadow: 0 0 15px rgba(0, 255, 102, 0.3);
}

.theme-warrior .neon-ring {
  border-top: 3px solid #ff0055;
  box-shadow: 0 0 15px rgba(255, 0, 85, 0.3);
}

.theme-box .neon-ring {
  border-top: 3px solid #c800ff;
  box-shadow: 0 0 15px rgba(200, 0, 255, 0.3);
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-15px);
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
