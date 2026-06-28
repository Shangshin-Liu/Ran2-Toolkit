<template>
  <div class="simulator-page">
    <!-- 背景特效 -->
    <div class="bg-grid"></div>
    <div class="bg-radial"></div>

    <div class="simulator-container glass-card">
      <!-- 左側：可互動配點面板 -->
      <div class="control-panel">
        <div class="panel-header">
          <h2 class="neon-text-defender">🛡️ 配點模擬</h2>
          <p class="subtitle font-small">亂2萬事通 - 屬性點數配置模擬體驗版</p>
        </div>

        <!-- 點數資訊 -->
        <div class="points-summary">
          <span class="points-label">剩餘點數</span>
          <span class="points-value" :class="{ 'points-zero': remainingPoints === 0 }">
            {{ remainingPoints }}
          </span>
        </div>

        <!-- 屬性列表 -->
        <div class="attributes-list">
          <div v-for="attr in attributes" :key="attr.key" class="attr-row">
            <div class="attr-info">
              <span class="attr-name">{{ attr.name }}</span>
              <span class="attr-desc font-small">{{ attr.desc }}</span>
            </div>
            
            <div class="attr-control">
              <button 
                class="btn-control btn-minus" 
                :disabled="attr.value === attr.base"
                @click="changePoints(attr, -1)"
              >
                -
              </button>
              <div class="attr-value-container">
                <span class="attr-value" :class="{ 'value-changed': attr.value > attr.base }">
                  {{ attr.value }}
                </span>
                <span v-if="attr.value > attr.base" class="bonus-text">
                  (+{{ attr.value - attr.base }})
                </span>
              </div>
              <button 
                class="btn-control btn-plus" 
                :disabled="remainingPoints === 0"
                @click="changePoints(attr, 1)"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <!-- 功能按鈕 -->
        <div class="panel-actions">
          <button 
            class="btn-reset" 
            :disabled="remainingPoints === 99"
            @click="resetPoints"
          >
            🔄 重置配點
          </button>
        </div>

        <!-- 溫馨提示 -->
        <div class="sci-fi-footer border-defender">
          <span class="info-icon">💡</span>
          <p class="info-text font-small">
            「配點模擬」功能仍在設計與開發中。正式版將與您的角色資料庫連動，並整合轉職限制、技能需求條件與戰力加成計算，敬請期待！
          </p>
        </div>
      </div>

      <!-- 右側：角色立繪展示 -->
      <div class="character-preview">
        <div class="char-light-beam"></div>
        <img 
          src="/assets/char-defender.webp" 
          alt="Defender" 
          class="char-illustration animate-float"
        />
        <div class="char-title-tag">
          <span class="tag-title">DEFENDER</span>
          <span class="tag-sub">配點模擬代言人</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const basePoints = 99

// 屬性資料定義
const attributes = ref([
  { key: 'str', name: '力量 (STR)', desc: '提升近戰物理攻擊力與防禦力', base: 10, value: 10 },
  { key: 'dex', name: '敏捷 (DEX)', desc: '提升遠程物理攻擊力、閃避率與命中率', base: 10, value: 10 },
  { key: 'int', name: '精神 (INT)', desc: '提升魔法攻擊力、魔法防禦力與 MP 上限', base: 10, value: 10 },
  { key: 'vit', name: '體質 (VIT)', desc: '提升最大生命值 (HP) 與減傷屬性', base: 10, value: 10 },
  { key: 'spi', name: '氣力 (SPI)', desc: '提升暴擊傷害與技能冷卻縮減效率', base: 10, value: 10 }
])

// 計算剩餘點數
const remainingPoints = computed(() => {
  const allocated = attributes.value.reduce((sum, attr) => sum + (attr.value - attr.base), 0)
  return basePoints - allocated
})

// 變更屬性點
const changePoints = (attr, delta) => {
  if (delta > 0 && remainingPoints.value > 0) {
    attr.value += 1
  } else if (delta < 0 && attr.value > attr.base) {
    attr.value -= 1
  }
}

// 重置配點
const resetPoints = () => {
  attributes.value.forEach(attr => {
    attr.value = attr.base
  })
}
</script>

<style scoped>
.simulator-page {
  position: relative;
  min-height: 85vh;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 20px;
  overflow: hidden;
  box-sizing: border-box;
}

/* 科技背景 */
.bg-grid {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(rgba(255, 119, 0, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 119, 0, 0.02) 1px, transparent 1px);
  background-size: 40px 40px;
  background-position: center;
  z-index: -2;
  pointer-events: none;
}

.bg-radial {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 50%, rgba(255, 119, 0, 0.05) 0%, rgba(0, 0, 0, 0) 70%);
  z-index: -1;
  pointer-events: none;
}

/* 主容器 */
.simulator-container {
  display: flex;
  width: 950px;
  max-width: 100%;
  min-height: 550px;
  border-radius: 20px;
  border: 1px solid rgba(255, 119, 0, 0.15);
  box-shadow: 0 0 30px rgba(255, 119, 0, 0.05), inset 0 0 20px rgba(0, 0, 0, 0.6);
  background: rgba(10, 14, 23, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  overflow: hidden;
}

/* 左側控制面板 */
.control-panel {
  flex: 1.2;
  padding: 35px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.panel-header {
  margin-bottom: 20px;
}

.neon-text-defender {
  color: var(--color-defender);
  text-shadow: 0 0 10px rgba(255, 119, 0, 0.5);
  font-family: 'Microsoft JhengHei', '微軟正黑體', sans-serif;
  font-size: 1.8rem;
  font-weight: 800;
  margin-bottom: 5px;
}

.subtitle {
  color: var(--text-muted);
}

/* 點數摘要區 */
.points-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 119, 0, 0.03);
  border: 1px solid rgba(255, 119, 0, 0.1);
  border-radius: 10px;
  padding: 12px 20px;
  margin-bottom: 25px;
}

.points-label {
  font-size: 0.95rem;
  color: var(--text-main);
  letter-spacing: 1px;
}

.points-value {
  font-size: 1.6rem;
  font-weight: bold;
  color: var(--color-defender);
  text-shadow: 0 0 10px rgba(255, 119, 0, 0.3);
  transition: all 0.3s ease;
}

.points-zero {
  color: var(--text-muted);
  text-shadow: none;
}

/* 屬性列表 */
.attributes-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 25px;
}

.attr-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 15px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.03);
  transition: border-color 0.3s ease;
}

.attr-row:hover {
  border-color: rgba(255, 119, 0, 0.2);
}

.attr-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-width: 55%;
}

.attr-name {
  color: var(--text-main);
  font-weight: 600;
  font-size: 0.95rem;
}

.attr-desc {
  color: var(--text-muted);
  font-size: 0.8rem;
}

.attr-control {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 加點按鈕 */
.btn-control {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid rgba(255, 119, 0, 0.3);
  background: rgba(255, 119, 0, 0.05);
  color: var(--color-defender);
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  justify-content: center;
  align-items: center;
}

.btn-control:hover:not(:disabled) {
  background: var(--color-defender);
  color: #fff;
  box-shadow: 0 0 10px rgba(255, 119, 0, 0.4);
}

.btn-control:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  border-color: rgba(255, 255, 255, 0.1);
  color: var(--text-muted);
}

/* 屬性數值展示 */
.attr-value-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 70px;
}

.attr-value {
  font-size: 1.2rem;
  font-weight: bold;
  color: var(--text-main);
  transition: color 0.3s ease;
}

.value-changed {
  color: var(--color-defender);
  text-shadow: 0 0 8px rgba(255, 119, 0, 0.4);
}

.bonus-text {
  font-size: 0.72rem;
  color: var(--color-defender);
  margin-top: 1px;
}

/* 功能操作按鈕 */
.panel-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
}

.btn-reset {
  padding: 8px 16px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.88rem;
}

.btn-reset:hover:not(:disabled) {
  background: rgba(255, 119, 0, 0.1);
  border-color: var(--color-defender);
  color: var(--color-defender);
}

.btn-reset:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 底部科幻裝飾提示區 */
.sci-fi-footer {
  display: flex;
  gap: 10px;
  background: rgba(255, 119, 0, 0.02);
  border: 1px solid rgba(255, 119, 0, 0.1);
  border-radius: 8px;
  padding: 12px 15px;
}

.border-defender {
  border-left: 3px solid var(--color-defender);
}

.info-icon {
  font-size: 1.1rem;
}

.info-text {
  color: var(--text-muted);
  line-height: 1.4;
  margin: 0;
}

/* 右側角色立繪展示區 */
.character-preview {
  flex: 0.8;
  position: relative;
  background: linear-gradient(135deg, rgba(255, 119, 0, 0.08) 0%, rgba(0, 0, 0, 0) 100%);
  display: flex;
  justify-content: center;
  align-items: flex-end;
  overflow: hidden;
  border-left: 1px solid rgba(255, 119, 0, 0.1);
}

.char-light-beam {
  position: absolute;
  bottom: 0;
  width: 150px;
  height: 250px;
  background: radial-gradient(ellipse at bottom, rgba(255, 119, 0, 0.15) 0%, rgba(255, 119, 0, 0) 70%);
  z-index: 1;
}

.char-illustration {
  width: 110%;
  height: 90%;
  object-fit: contain;
  object-position: bottom center;
  z-index: 2;
  pointer-events: none;
  filter: drop-shadow(0 0 15px rgba(255, 119, 0, 0.25));
}

.char-title-tag {
  position: absolute;
  top: 25px;
  right: 25px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  z-index: 3;
}

.tag-title {
  font-family: 'Outfit', sans-serif;
  font-size: 1.6rem;
  font-weight: 900;
  color: var(--color-defender);
  text-shadow: 0 0 8px rgba(255, 119, 0, 0.4);
  letter-spacing: 2px;
}

.tag-sub {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 2px;
  background: rgba(0, 0, 0, 0.5);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid rgba(255, 119, 0, 0.1);
}

/* 動態浮動效果 */
@keyframes float {
  0% { transform: translateY(0px) scale(1); }
  50% { transform: translateY(-8px) scale(1.01); }
  100% { transform: translateY(0px) scale(1); }
}

.animate-float {
  animation: float 5s ease-in-out infinite;
}

/* 響應式排版 */
@media (max-width: 900px) {
  .simulator-container {
    flex-direction: column;
    min-height: auto;
  }
  
  .character-preview {
    height: 350px;
    border-left: none;
    border-top: 1px solid rgba(255, 119, 0, 0.1);
  }
  
  .char-illustration {
    height: 100%;
    width: auto;
  }
}
</style>
