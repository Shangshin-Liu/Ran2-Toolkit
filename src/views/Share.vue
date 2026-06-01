<template>
  <div class="share-page">
    <div class="page-header">
      <h2 class="neon-text-qigong">💎 好物分享區</h2>
      <p class="subtitle">大老退坑或溢出神兵利器免費贈與，助廣大萌新早日成材</p>
    </div>

    <!-- 操作列：篩選與發布好物 -->
    <div class="action-bar glass-card">
      <div class="filter-controls">
        <label class="select-label">道具類型:</label>
        <select v-model="selectedType" class="type-select">
          <option value="全部">全部道具</option>
          <option value="武器">武器</option>
          <option value="防具">防具</option>
          <option value="飾品">飾品</option>
        </select>
      </div>
      
      <button class="create-share-btn neon-border-qigong" @click="showShareModal = true">
        🎁 分享我的寶物
      </button>
    </div>

    <div class="share-layout">
      <!-- 左側：好物列表 -->
      <div class="items-list-panel">
        <div 
          v-for="item in filteredItems" 
          :key="item.id" 
          class="item-card glass-card"
          :class="{ 'active-item': selectedItem.id === item.id }"
          @click="selectItem(item)"
        >
          <div class="item-card-img-wrapper">
            <img :src="item.image" :alt="item.name" class="item-card-img" />
          </div>
          <div class="item-card-details">
            <h3 class="item-card-name">{{ item.name }}</h3>
            <p class="item-card-level">要求: Lv.{{ item.levelReq }}</p>
            <p class="item-card-giver">分享者: {{ item.giverId }}</p>
          </div>
        </div>
      </div>

      <!-- 右側：道具詳細資訊 -->
      <div class="item-detail-panel glass-card neon-border-qigong" v-if="selectedItem">
        <div class="detail-header">
          <div class="detail-image-box">
            <img :src="selectedItem.image" :alt="selectedItem.name" class="detail-item-img" />
          </div>
          <div class="detail-main-info">
            <h2 class="detail-item-name neon-text-qigong">{{ selectedItem.name }}</h2>
            <div class="detail-badge-row">
              <span class="detail-badge-item">等級要求: Lv.{{ selectedItem.levelReq }}</span>
              <span class="detail-badge-item">屬性要求: {{ selectedItem.statReq }}</span>
            </div>
            <p class="giver-info">🎁 寶物提供者: <strong class="neon-text-qigong">{{ selectedItem.giverId }}</strong></p>
          </div>
        </div>

        <hr class="divider" />

        <!-- 道具屬性數值 -->
        <div class="detail-section">
          <h3 class="section-title">📊 道具素質屬性</h3>
          <ul class="stats-list">
            <li v-for="(stat, idx) in selectedItem.stats" :key="idx" class="stat-li">
              <span class="stat-bullet">✨</span>
              <span class="stat-text">{{ stat }}</span>
            </li>
          </ul>
        </div>

        <!-- 備註說明 -->
        <div class="detail-section">
          <h3 class="section-title">📝 大老寄語</h3>
          <p class="giver-notes">「{{ selectedItem.notes }}」</p>
        </div>

        <!-- 申請按鈕 -->
        <div class="detail-actions">
          <button class="apply-item-btn" @click="applyForItem">
            我要申請道具
          </button>
        </div>
      </div>
    </div>

    <!-- 申請成功 Modal -->
    <div class="modal-overlay" v-if="showSuccessModal" @click="showSuccessModal = false">
      <div class="modal-content glass-card neon-border-qigong text-center" @click.stop>
        <div class="success-icon">🎉</div>
        <h3 class="modal-title neon-text-qigong">申請成功！</h3>
        <p class="success-desc">
          您已成功提交對【{{ selectedItem.name }}】的申請！<br />
          系統已通知分享者 <strong>{{ selectedItem.giverId }}</strong>，若通過審核，將會透過遊戲內郵箱寄送給您。
        </p>
        <button class="modal-close-btn neon-border-qigong" @click="showSuccessModal = false">
          確認
        </button>
      </div>
    </div>

    <!-- 分享寶物 Modal -->
    <div class="modal-overlay" v-if="showShareModal" @click="showShareModal = false">
      <div class="modal-content glass-card neon-border-qigong" @click.stop>
        <h3 class="modal-title neon-text-qigong">🎁 分享我的寶物</h3>
        
        <div class="form-group">
          <label>道具名稱</label>
          <input type="text" v-model="newItem.name" placeholder="例如: +7 冰晶長劍" />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>分享者 ID</label>
            <input type="text" v-model="newItem.giverId" placeholder="您的遊戲ID" />
          </div>
          <div class="form-group">
            <label>道具類型</label>
            <select v-model="newItem.type">
              <option value="武器">武器</option>
              <option value="防具">防具</option>
              <option value="飾品">飾品</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>等級要求</label>
            <input type="number" v-model="newItem.levelReq" placeholder="例如: 50" />
          </div>
          <div class="form-group">
            <label>屬性要求</label>
            <input type="text" v-model="newItem.statReq" placeholder="例如: 力量 150" />
          </div>
        </div>

        <div class="form-group">
          <label>道具素質 (每行一條)</label>
          <textarea v-model="newItem.statsText" rows="3" placeholder="物理攻擊力 +120&#10;攻擊速度 +10%&#10;暴擊率 +5%"></textarea>
        </div>

        <div class="form-group">
          <label>寄語 / 備註</label>
          <input type="text" v-model="newItem.notes" placeholder="寫點給萌新的話吧..." />
        </div>

        <div class="modal-buttons">
          <button class="modal-btn cancel" @click="showShareModal = false">取消</button>
          <button class="modal-btn confirm neon-border-qigong" @click="shareItem">發布分享</button>
        </div>
      </div>
    </div>

    <!-- 手機版抽屜 (iPhone 17 彈窗顯示詳細資訊) -->
    <div class="mobile-drawer-overlay" v-if="showMobileDetail" @click="closeMobileDetail">
      <div class="mobile-drawer glass-card neon-border-qigong" @click.stop>
        <button class="close-btn" @click="closeMobileDetail">✕</button>
        <div class="drawer-content" v-if="selectedItem">
          <div class="detail-header" style="flex-direction: column; align-items: center; text-align: center;">
            <div class="detail-image-box" style="margin-right: 0; margin-bottom: 15px;">
              <img :src="selectedItem.image" :alt="selectedItem.name" class="detail-item-img" />
            </div>
            <h2 class="detail-item-name neon-text-qigong">{{ selectedItem.name }}</h2>
            <p class="giver-info">分享者: <strong>{{ selectedItem.giverId }}</strong></p>
          </div>

          <div class="detail-badge-row" style="justify-content: center;">
            <span class="detail-badge-item">等級: {{ selectedItem.levelReq }}</span>
            <span class="detail-badge-item">屬性: {{ selectedItem.statReq }}</span>
          </div>

          <div class="detail-section">
            <h3 class="section-title">📊 道具屬性</h3>
            <ul class="stats-list">
              <li v-for="(stat, idx) in selectedItem.stats" :key="idx" class="stat-li">
                <span class="stat-text">{{ stat }}</span>
              </li>
            </ul>
          </div>

          <div class="detail-section">
            <h3 class="section-title">📝 大老寄語</h3>
            <p class="giver-notes">「{{ selectedItem.notes }}」</p>
          </div>

          <button class="apply-item-btn" @click="applyForItem">
            我要申請道具
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const selectedType = ref('全部')
const showSuccessModal = ref(false)
const showShareModal = ref(false)
const showMobileDetail = ref(false)

const items = ref([
  {
    id: 'item-1',
    name: '雷神弓‧天誅',
    type: '武器',
    image: '/assets/share/asset1.jpg',
    levelReq: 195,
    statReq: '無',
    giverId: '幻海奇緣',
    stats: [
      '狀態異常: 麻痺(35%機率)',
      '3回+0.8%'
    ],
    notes: '大老退坑免費贈送'
  },
  {
    id: 'item-2',
    name: '強化角弓(冰正)[+7]',
    type: '武器',
    image: '/assets/share/asset2.jpg',
    levelReq: 0,
    statReq: '敏捷 406',
    giverId: '破壞之王',
    stats: [
      '隨機+4.04%',
      'SP回+0.3%'
    ],
    notes: '過渡好用'
  },
  {
    id: 'item-3',
    name: 'B級磐石氣功手套(正)[+12]',
    type: '武器',
    image: '/assets/share/asset3.jpg',
    levelReq: 190,
    statReq: '無',
    giverId: '土豪123',
    stats: [
      '隨機+16.93%',
      'HP回0.04'
    ],
    notes: '打怪必備'
  }
])

// 修正：如果第三張圖沒有成功複製，我們統一對應到 asset3.jpg
items.value[2].image = '/assets/share/asset3.jpg'

const selectedItem = ref(items.value[0])

const filteredItems = computed(() => {
  if (selectedType.value === '全部') {
    return items.value
  }
  return items.value.filter(item => item.type === selectedType.value)
})

const selectItem = (item) => {
  selectedItem.value = item
  if (window.innerWidth <= 900) {
    showMobileDetail.value = true
  }
}

const closeMobileDetail = () => {
  showMobileDetail.value = false
}

const applyForItem = () => {
  showSuccessModal.value = true
  showMobileDetail.value = false
}

const newItem = ref({
  name: '',
  giverId: '',
  type: '武器',
  levelReq: '',
  statReq: '',
  statsText: '',
  notes: ''
})

const shareItem = () => {
  if (!newItem.value.name || !newItem.value.giverId || !newItem.value.levelReq) {
    alert('請填寫完整道具名稱、分享者及等級要求！')
    return
  }

  const statArr = newItem.value.statsText
    ? newItem.value.statsText.split('\n').filter(s => s.trim() !== '')
    : ['基礎數值無額外屬性']

  // 隨機分配一張預存的圖片作為展示
  const randomImageNum = Math.floor(Math.random() * 3) + 1
  const randomImage = `/assets/share/asset${randomImageNum}.jpg`

  items.value.unshift({
    id: `item-${Date.now()}`,
    name: newItem.value.name,
    type: newItem.value.type,
    image: randomImage,
    levelReq: parseInt(newItem.value.levelReq),
    statReq: newItem.value.statReq || '無屬性要求',
    giverId: newItem.value.giverId,
    stats: statArr,
    notes: newItem.value.notes || '大老很懶，什麼都沒留下。'
  })

  // 重置
  newItem.value = {
    name: '',
    giverId: '',
    type: '武器',
    levelReq: '',
    statReq: '',
    statsText: '',
    notes: ''
  }

  showShareModal.value = false
  selectedItem.value = items.value[0]
}
</script>

<style scoped>
.share-page {
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

/* 操作列 */
.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 25px;
  margin-bottom: 30px;
}

.filter-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.select-label {
  font-size: 0.9rem;
  color: var(--text-muted);
  font-weight: 700;
}

.type-select {
  background: rgba(8, 9, 13, 0.6);
  border: 1px solid rgba(255,255,255,0.1);
  color: #fff;
  padding: 8px 16px;
  border-radius: 6px;
  outline: none;
  font-weight: 700;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
}

.create-share-btn {
  background: rgba(0, 255, 102, 0.1);
  color: #fff;
  border: 1px solid var(--color-qigong);
  padding: 8px 20px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  transition: all 0.3s;
}

.create-share-btn:hover {
  background: var(--color-qigong);
  color: #000;
  box-shadow: var(--glow-qigong);
  transform: translateY(-2px);
}

/* 佈局 */
.share-layout {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 30px;
  align-items: start;
}

.items-list-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.item-card {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 16px;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  border-left: 4px solid transparent;
}

.item-card:hover {
  border-left: 4px solid rgba(0, 255, 102, 0.4);
}

.item-card.active-item {
  border-color: var(--color-qigong);
  background: var(--bg-card-hover);
  box-shadow: 0 0 15px rgba(0, 255, 102, 0.15);
}

.item-card-img-wrapper {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.1);
  background: #000;
}

.item-card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-card-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-card-name {
  font-size: 1rem;
  font-weight: 700;
}

.item-card-level {
  font-size: 0.8rem;
  color: var(--color-qigong);
  font-weight: 700;
}

.item-card-giver {
  font-size: 0.85rem;
  color: var(--text-muted);
}

/* 右側詳細 */
.item-detail-panel {
  padding: 30px;
  min-height: 500px;
}

.detail-header {
  display: flex;
  align-items: center;
}

.detail-image-box {
  width: 120px;
  height: 120px;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid rgba(255,255,255,0.15);
  background: #000;
  margin-right: 24px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.5);
}

.detail-item-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.detail-main-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-item-name {
  font-size: 1.8rem;
  font-weight: 900;
}

.detail-badge-row {
  display: flex;
  gap: 10px;
}

.detail-badge-item {
  font-size: 0.75rem;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  color: var(--text-muted);
  padding: 4px 10px;
  border-radius: 4px;
  font-weight: 700;
}

.giver-info {
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
  border-left: 3px solid var(--color-qigong);
  padding-left: 8px;
}

/* 屬性清單 */
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
  color: var(--color-qigong);
  font-size: 0.9rem;
}

.stat-text {
  font-size: 0.9rem;
  font-weight: 600;
}

.giver-notes {
  font-style: italic;
  font-size: 0.9rem;
  color: var(--text-muted);
  background: rgba(0, 255, 102, 0.02);
  padding: 12px 18px;
  border-radius: 6px;
  border-left: 3px solid rgba(0, 255, 102, 0.2);
}

/* 申請按鈕 */
.detail-actions {
  margin-top: 30px;
}

.apply-item-btn {
  width: 100%;
  background: linear-gradient(135deg, rgba(0, 255, 102, 0.2) 0%, rgba(0, 255, 102, 0.05) 100%);
  border: 1px solid var(--color-qigong);
  color: #fff;
  font-weight: 800;
  font-size: 1.1rem;
  letter-spacing: 2px;
  padding: 14px;
  border-radius: 8px;
  box-shadow: var(--glow-qigong);
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  transition: all 0.3s ease;
}

.apply-item-btn:hover {
  background: var(--color-qigong);
  color: #000;
  box-shadow: 0 0 25px rgba(0, 255, 102, 0.6);
  transform: translateY(-2px);
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.85);
  backdrop-filter: blur(5px);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  width: 500px;
  max-width: 90%;
  padding: 30px;
  background: #0d0f17;
  animation: scaleUp 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.text-center {
  text-align: center;
}

.success-icon {
  font-size: 3.5rem;
  margin-bottom: 16px;
}

.success-desc {
  font-size: 0.95rem;
  color: var(--text-muted);
  line-height: 1.6;
  margin-bottom: 24px;
}

.modal-close-btn {
  background: rgba(0, 255, 102, 0.1);
  border: 1px solid var(--color-qigong);
  color: #fff;
  padding: 10px 30px;
  border-radius: 6px;
  font-weight: 700;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  transition: all 0.25s;
}

.modal-close-btn:hover {
  background: var(--color-qigong);
  color: #000;
  box-shadow: var(--glow-qigong);
}

/* 表單 */
.form-group {
  margin-bottom: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-muted);
}

.form-group input, .form-group select, .form-group textarea {
  background: rgba(8, 9, 13, 0.8);
  border: 1px solid rgba(255,255,255,0.1);
  padding: 10px 14px;
  border-radius: 6px;
  color: #fff;
  outline: none;
  font-size: 0.9rem;
}

.form-group input:focus, .form-group select:focus, .form-group textarea:focus {
  border-color: var(--color-qigong);
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 14px;
  margin-top: 24px;
}

.modal-btn {
  padding: 10px 24px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  transition: all 0.25s;
}

.modal-btn.cancel {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.1);
  color: var(--text-muted);
}

.modal-btn.cancel:hover {
  color: #fff;
  background: rgba(255,255,255,0.05);
}

.modal-btn.confirm {
  background: rgba(0, 255, 102, 0.2);
  border: 1px solid var(--color-qigong);
  color: #fff;
}

.modal-btn.confirm:hover {
  background: var(--color-qigong);
  color: #000;
  box-shadow: var(--glow-qigong);
}

/* 響應式手機版 */
@media (max-width: 900px) {
  .share-layout {
    grid-template-columns: 1fr;
  }

  .item-detail-panel {
    display: none; /* 手機版隱藏右邊面板，使用 drawer */
  }

  .action-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
    padding: 15px;
  }

  /* 手機版抽屜樣式 */
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
    border-top: 2px solid var(--color-qigong);
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
    gap: 20px;
  }
}
</style>
