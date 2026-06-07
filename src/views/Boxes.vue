<template>
  <div class="boxes-page">
    <div class="page-header">
      <h2 class="neon-text-box">🎁 禮盒查詢</h2>
      <p class="subtitle">探索各大禮盒的獲取途徑與內容物機率，好運就在下一擊</p>
    </div>

    <!-- 搜尋與過濾列 -->
    <div class="filter-bar glass-card">
      <div class="search-input-wrapper">
        <span class="search-icon">🔍</span>
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="搜尋禮盒名稱..." 
          class="search-input"
        />
        <button v-if="searchQuery" @click="searchQuery = ''" class="clear-btn">✕</button>
      </div>
      <div class="quick-tags">
        <span 
          v-for="tag in ['全部', '青銅', '白銀', '黃金', '特惠']" 
          :key="tag"
          class="tag-badge"
          :class="{ 'active-tag': activeTag === tag }"
          @click="selectTag(tag)"
        >
          {{ tag }}
        </span>
      </div>
    </div>

    <!-- 主區塊：與 Share 頁面一致的版面 -->
    <div class="boxes-layout">
      <!-- 左側：禮盒列表 -->
      <div class="boxes-list-panel">
        <div 
          v-for="box in filteredBoxes" 
          :key="box.id" 
          class="box-card glass-card"
          :class="{ 'active-box-card': selectedBox && selectedBox.id === box.id }"
          @click="selectBox(box)"
        >
          <div class="box-card-details">
            <h3 class="box-card-title">{{ box.name }}</h3>
            <p class="box-card-source">來源: {{ box.sourceType }}</p>
          </div>
        </div>
      </div>

      <!-- 右側：禮盒詳細內容 -->
      <div class="box-detail-panel glass-card neon-border-box" v-if="selectedBox">
        <div class="detail-header">
          <div class="detail-main-info">
            <h2 class="detail-box-name neon-text-box">{{ selectedBox.name }}</h2>
            <p class="obtain-source">📂 獲取途徑：<strong>{{ selectedBox.obtain }}</strong></p>
          </div>
        </div>

        <hr class="divider" />

        <!-- 內容物 -->
        <div class="detail-section">
          <h3 class="section-title">🎒 內容物預覽</h3>
          <ul class="stats-list">
            <li v-for="(item, idx) in selectedBox.items" :key="idx" class="stat-li">
              <span class="stat-bullet">{{ getItemIcon(item.rarity) }}</span>
              <span class="stat-text" :class="item.rarity + '-text'">
                {{ item.name }} 
                <span class="rate-val" v-if="item.rate">({{ item.rate }})</span>
              </span>
            </li>
          </ul>
        </div>

        <!-- 注意事項 -->
        <div class="detail-section">
          <div class="warnings-box">
            <h4>⚠️ 注意事項</h4>
            <p>{{ selectedBox.warning }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 手機版抽屜 (iPhone 17 彈窗顯示詳細資訊) -->
    <div class="mobile-drawer-overlay" v-if="showMobileDetail" @click="closeMobileDetail">
      <div class="mobile-drawer glass-card neon-border-box" @click.stop>
        <button class="close-btn" @click="closeMobileDetail">✕</button>
        <div class="drawer-content" v-if="selectedBox">
          <div class="detail-header" style="flex-direction: column; align-items: center; text-align: center;">
            <h2 class="detail-box-name neon-text-box">{{ selectedBox.name }}</h2>
            <p class="obtain-source">獲取途徑: <strong>{{ selectedBox.obtain }}</strong></p>
          </div>

          <div class="detail-section" style="margin-top: 20px;">
            <h3 class="section-title">🎒 內容物預覽</h3>
            <ul class="stats-list">
              <li v-for="(item, idx) in selectedBox.items" :key="idx" class="stat-li">
                <span class="stat-bullet">{{ getItemIcon(item.rarity) }}</span>
                <span class="stat-text" :class="item.rarity + '-text'">
                  {{ item.name }} <span class="rate-val" v-if="item.rate">({{ item.rate }})</span>
                </span>
              </li>
            </ul>
          </div>

          <div class="warnings-box" style="margin-top: 20px;">
            <h4>⚠️ 注意事項</h4>
            <p>{{ selectedBox.warning }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const searchQuery = ref('')
const activeTag = ref('全部')
const showMobileDetail = ref(false)

import boxesData from '@/assets/data/boxes.json'

const boxes = ref(boxesData)
const boxesMap = new Map(boxesData.map(b => [b.id, b]))

const selectedBox = ref(boxes.value[0])

watch(
  () => route.params.id,
  (newId) => {
    if (newId) {
      const found = boxesMap.get(newId)
      if (found) {
        selectedBox.value = found
        if (window.innerWidth <= 900) {
          showMobileDetail.value = true
        }
      }
    }
  },
  { immediate: true }
)

watch(
  () => route.query.search,
  (newSearch) => {
    if (newSearch) {
      searchQuery.value = newSearch
      const found = boxes.value.find(b => b.name.includes(newSearch))
      if (found) {
        selectedBox.value = found
      }
    }
  },
  { immediate: true }
)

const filteredBoxes = computed(() => {
  return boxes.value.filter(box => {
    const matchesSearch = box.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    if (activeTag.value === '全部') return matchesSearch
    
    if (activeTag.value === '青銅') return matchesSearch && box.name.includes('青銅')
    if (activeTag.value === '白銀') return matchesSearch && box.name.includes('白銀')
    if (activeTag.value === '黃金') return matchesSearch && box.name.includes('黃金')
    return matchesSearch
  })
})

const selectTag = (tag) => {
  activeTag.value = tag
  setTimeout(() => {
    if (filteredBoxes.value.length > 0) {
      const stillVisible = filteredBoxes.value.some(b => b.id === selectedBox.value.id)
      if (!stillVisible) {
        selectedBox.value = filteredBoxes.value[0]
      }
    } else {
      selectedBox.value = null
    }
  }, 0)
}

const selectBox = (box) => {
  selectedBox.value = box
  if (window.innerWidth <= 900) {
    showMobileDetail.value = true
  }
}

const closeMobileDetail = () => {
  showMobileDetail.value = false
}

const getItemIcon = (rarity) => {
  switch (rarity) {
    case 'legendary': return '👑'
    case 'epic': return '🔮'
    case 'rare': return '🔷'
    case 'uncommon': return '🟢'
    default: return '⚪'
  }
}
</script>

<style scoped>
.boxes-page {
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.page-header {
  margin-bottom: 25px;
}

.page-header h2 {
  font-size: 2rem;
  font-weight: 800;
  margin-bottom: 8px;
}

.subtitle {
  color: var(--text-muted);
}

/* 篩選列 */
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding: 15px 25px;
  margin-bottom: 30px;
}

.search-input-wrapper {
  position: relative;
  flex: 1;
  max-width: 400px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}

.search-input {
  width: 100%;
  padding: 10px 40px 10px 38px;
  background: rgba(8, 9, 13, 0.6);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  color: #fff;
  font-size: 0.9rem;
  outline: none;
  transition: all 0.3s ease;
}

.search-input:focus {
  border-color: var(--color-box);
  box-shadow: 0 0 10px rgba(200, 0, 255, 0.2);
}

.clear-btn {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
}

.quick-tags {
  display: flex;
  gap: 10px;
}

.tag-badge {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  transition: all 0.25s ease;
  color: var(--text-muted);
}

.tag-badge:hover, .tag-badge.active-tag {
  color: #fff;
  background: rgba(200, 0, 255, 0.1);
  border-color: var(--color-box);
  box-shadow: 0 0 8px rgba(200, 0, 255, 0.2);
}

/* 佈局 */
.boxes-layout {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 30px;
  align-items: start;
}

/* 左側：禮盒列表 */
.boxes-list-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.box-card {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 16px;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  border-left: 4px solid transparent;
}

.box-card:hover {
  border-left: 4px solid rgba(200, 0, 255, 0.4);
}

.box-card.active-box-card {
  border-color: var(--color-box);
  background: var(--bg-card-hover);
  box-shadow: 0 0 15px rgba(200, 0, 255, 0.15);
}

.box-card-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.box-card-title {
  font-size: 1rem;
  font-weight: 700;
}

.box-card-source {
  font-size: 0.85rem;
  color: var(--text-muted);
}

/* 右側詳細 */
.box-detail-panel {
  padding: 30px;
  min-height: 500px;
}

.detail-header {
  display: flex;
  align-items: center;
}

.detail-main-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-box-name {
  font-size: 1.8rem;
  font-weight: 900;
}

.obtain-source {
  font-size: 0.95rem;
  color: var(--text-muted);
}

.divider {
  border: 0;
  height: 1px;
  background: linear-gradient(90deg, rgba(255,255,255,0.1), transparent);
  margin: 20px 0;
}

.detail-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 12px;
  border-left: 3px solid var(--color-box);
  padding-left: 8px;
}

/* 條列式內容物 */
.stats-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-li {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255,255,255,0.02);
  padding: 8px 14px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.03);
}

.stat-bullet {
  font-size: 1.2rem;
}

.stat-text {
  font-size: 0.95rem;
  font-weight: 600;
}

.rate-val {
  font-weight: 700;
  margin-left: 4px;
  opacity: 0.8;
}

/* 品質文字顏色 */
.common-text { color: #f0f3f8; }
.uncommon-text { color: #00ff66; }
.rare-text { color: #00e5ff; }
.epic-text { color: #bd00ff; }
.legendary-text { color: #ff9900; }

/* 注意事項 */
.warnings-box {
  background: rgba(200, 0, 255, 0.03);
  border: 1px solid rgba(200, 0, 255, 0.1);
  padding: 16px;
  border-radius: 8px;
}

.warnings-box h4 {
  color: var(--color-box);
  margin-bottom: 6px;
}

.warnings-box p {
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.5;
}

/* 手機版抽屜 */
.mobile-drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.8);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: flex-end;
}

.mobile-drawer {
  width: 100%;
  max-height: 85vh;
  border-radius: 20px 20px 0 0;
  background: #0d0f17;
  border-top: 2px solid var(--color-box);
  padding: 20px;
  overflow-y: auto;
  position: relative;
  animation: slideUp 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.close-btn {
  position: absolute;
  top: 15px;
  right: 15px;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 1.5rem;
  cursor: pointer;
}

.drawer-content {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
}

/* 響應式：手機版 */
@media (max-width: 900px) {
  .boxes-layout {
    grid-template-columns: 1fr;
  }

  .box-detail-panel {
    display: none;
  }

  .filter-bar {
    flex-direction: column;
    align-items: flex-start;
    padding: 15px;
  }

  .search-input-wrapper {
    max-width: 100%;
  }

  .quick-tags {
    width: 100%;
    overflow-x: auto;
    padding-bottom: 5px;
  }
}
</style>
