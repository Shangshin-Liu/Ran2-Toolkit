<template>
  <div class="parties-page">
    <div class="page-header">
      <h2 class="neon-text-warrior">⚔️ 練功團佈告欄</h2>
      <p class="subtitle">大老帶路、隊友招募！加入練功團，組隊升級效率加倍</p>
    </div>

    <!-- 頂部操作欄：篩選與發起招募 -->
    <div class="action-bar glass-card">
      <div class="filter-controls">
        <label class="select-label">選擇伺服器:</label>
        <select v-model="selectedServer" class="server-select">
          <option value="全部">全部伺服器</option>
          <option value="玄武第一">玄武第一</option>
          <option value="朱雀第二">朱雀第二</option>
          <option value="青龍創世">青龍創世</option>
        </select>
      </div>
      
      <button class="create-party-btn neon-border-warrior" @click="showCreateModal = true">
        ➕ 我要發起招募
      </button>
    </div>

    <!-- 練功團卡片列表 -->
    <div class="parties-grid">
      <div 
        v-for="party in filteredParties" 
        :key="party.id" 
        class="party-card glass-card"
        :class="{ 'subscribed-card': party.subscribed }"
      >
        <!-- 伺服器與狀態 -->
        <div class="party-meta">
          <span class="server-badge">{{ party.server }}</span>
          <span class="status-badge" :class="{ 'recruiting': !party.subscribed }">
            {{ party.subscribed ? '已訂閱通知' : '募集中' }}
          </span>
        </div>

        <h3 class="party-title">{{ party.title }}</h3>
        
        <div class="party-info-list">
          <div class="info-item">
            <span class="info-icon">👤</span>
            <span class="info-text">發起人 ID: <strong class="neon-text-warrior">{{ party.leaderId }}</strong></span>
          </div>
          <div class="info-item">
            <span class="info-icon">📍</span>
            <span class="info-text">練功地點: <strong>{{ party.location }}</strong></span>
          </div>
          <div class="info-item">
            <span class="info-icon">🕒</span>
            <span class="info-text">起訖時間: {{ party.timeRange }}</span>
          </div>
        </div>

        <div class="party-requirements">
          <h4 class="req-title">跟團要求：</h4>
          <ul class="req-list">
            <li v-for="(req, idx) in party.requirements" :key="idx">{{ req }}</li>
          </ul>
        </div>

        <!-- 互動按鈕：預約通知 -->
        <div class="party-actions">
          <button 
            class="subscribe-btn"
            :class="{ 'subscribed': party.subscribed }"
            @click="toggleSubscribe(party)"
          >
            <span class="bell-icon">{{ party.subscribed ? '🔔' : '🔕' }}</span>
            {{ party.subscribed ? '已預約成功' : '訂閱此團通知' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 發起招募 Modal -->
    <div class="modal-overlay" v-if="showCreateModal" @click="showCreateModal = false">
      <div class="modal-content glass-card neon-border-warrior" @click.stop>
        <h3 class="modal-title neon-text-warrior">⚔️ 發起練功招募</h3>
        
        <div class="form-group">
          <label>招募標題</label>
          <input type="text" v-model="newParty.title" placeholder="例如: 廢棄停車場速刷隊" />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>玩家 ID</label>
            <input type="text" v-model="newParty.leaderId" placeholder="例如: 亂世狂刀" />
          </div>
          <div class="form-group">
            <label>伺服器</label>
            <select v-model="newParty.server">
              <option value="玄武第一">玄武第一</option>
              <option value="朱雀第二">朱雀第二</option>
              <option value="青龍創世">青龍創世</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>練功地點</label>
            <input type="text" v-model="newParty.location" placeholder="例如: 綜合校區停車場" />
          </div>
          <div class="form-group">
            <label>起訖時間</label>
            <input type="text" v-model="newParty.timeRange" placeholder="例如: 20:00 - 22:00" />
          </div>
        </div>

        <div class="form-group">
          <label>跟團要求 (每行一條)</label>
          <textarea v-model="newParty.reqText" rows="3" placeholder="Lv.25+&#10;聽指揮不掛機&#10;自備加倍卷"></textarea>
        </div>

        <div class="modal-buttons">
          <button class="modal-btn cancel" @click="showCreateModal = false">取消</button>
          <button class="modal-btn confirm neon-border-warrior" @click="createParty">發布招募</button>
        </div>
      </div>
    </div>

    <!-- Toast 訊息通知 -->
    <transition name="toast">
      <div class="toast-message glass-card neon-border-warrior" v-if="toastMsg">
        <span class="toast-icon">🔔</span>
        <span class="toast-text">{{ toastMsg }}</span>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const selectedServer = ref('全部')
const showCreateModal = ref(false)
const toastMsg = ref('')

const parties = ref([
  {
    id: 'party-1',
    title: '迴廊C趴團',
    leaderId: '幻海奇緣',
    server: '新東京',
    location: '失落異界迴廊',
    timeRange: '2026/01/15 13:00 ~ 2026/01/15 16:00 (共計3小時)',
    requirements: [
      '等級1~200',
      '無戰力限制'
    ],
    subscribed: false
  },
  {
    id: 'party-2',
    title: '超3速衝團',
    leaderId: '破壞之王',
    server: '新東京',
    location: '超自然研究中心3F',
    timeRange: '2026/03/25 22:00 ~ 2026/03/26 02:00 (共計4小時)',
    requirements: [
      '等級150以上',
      '戰力需大於1115'
    ],
    subscribed: false
  }
])

const newParty = ref({
  title: '',
  leaderId: '',
  server: '玄武第一',
  location: '',
  timeRange: '',
  reqText: ''
})

const filteredParties = computed(() => {
  if (selectedServer.value === '全部') {
    return parties.value
  }
  return parties.value.filter(p => p.server === selectedServer.value)
})

const toggleSubscribe = (party) => {
  party.subscribed = !party.subscribed
  if (party.subscribed) {
    showToast(`訂閱「${party.title}」通知成功！開團前將通知您。`)
  } else {
    showToast(`已取消「${party.title}」的訂閱通知。`)
  }
}

const showToast = (msg) => {
  toastMsg.value = msg
  setTimeout(() => {
    toastMsg.value = ''
  }, 3000)
}

const createParty = () => {
  if (!newParty.value.title || !newParty.value.leaderId || !newParty.value.location) {
    showToast('請填寫所有必要招募資訊！')
    return
  }

  const reqs = newParty.value.reqText
    ? newParty.value.reqText.split('\n').filter(r => r.trim() !== '')
    : ['無特殊要求']

  parties.value.unshift({
    id: `party-${Date.now()}`,
    title: newParty.value.title,
    leaderId: newParty.value.leaderId,
    server: newParty.value.server,
    location: newParty.value.location,
    timeRange: newParty.value.timeRange || '即刻開團',
    requirements: reqs,
    subscribed: false
  })

  // 重置表單
  newParty.value = {
    title: '',
    leaderId: '',
    server: '玄武第一',
    location: '',
    timeRange: '',
    reqText: ''
  }

  showCreateModal.value = false
  showToast('招募發布成功！')
}
</script>

<style scoped>
.parties-page {
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

.server-select {
  background: rgba(8, 9, 13, 0.6);
  border: 1px solid rgba(255,255,255,0.1);
  color: #fff;
  padding: 8px 16px;
  border-radius: 6px;
  outline: none;
  font-weight: 700;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
}

.create-party-btn {
  background: rgba(255, 0, 85, 0.1);
  color: #fff;
  border: 1px solid var(--color-warrior);
  padding: 8px 20px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  transition: all 0.3s;
}

.create-party-btn:hover {
  background: var(--color-warrior);
  color: #000;
  box-shadow: var(--glow-warrior);
  transform: translateY(-2px);
}

/* 練功團卡片網格 */
.parties-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 24px;
}

.party-card {
  border-top: 3px solid rgba(255, 255, 255, 0.1);
  padding: 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 380px;
  transition: all 0.35s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.party-card:hover {
  border-top-color: var(--color-warrior);
  box-shadow: 0 5px 20px rgba(255, 0, 85, 0.1);
}

.party-card.subscribed-card {
  border-color: var(--color-warrior);
  box-shadow: var(--glow-warrior);
  background: rgba(255, 0, 85, 0.03);
}

.party-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.server-badge {
  background: rgba(255, 255, 255, 0.08);
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
}

.status-badge {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-muted);
}

.status-badge.recruiting {
  background: rgba(255, 0, 85, 0.15);
  color: var(--color-warrior);
}

.party-title {
  font-size: 1.25rem;
  font-weight: 800;
  margin-bottom: 18px;
  line-height: 1.4;
}

.party-info-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.info-icon {
  font-size: 1.1rem;
}

.party-requirements {
  background: rgba(255,255,255,0.02);
  padding: 12px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.03);
  margin-bottom: 20px;
}

.req-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 6px;
}

.req-list {
  list-style-type: none;
  padding-left: 0;
}

.req-list li {
  font-size: 0.8rem;
  color: var(--text-muted);
  position: relative;
  padding-left: 12px;
  line-height: 1.5;
}

.req-list li::before {
  content: '•';
  color: var(--color-warrior);
  position: absolute;
  left: 0;
}

/* 互動訂閱按鈕 */
.subscribe-btn {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #fff;
  font-weight: 700;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  transition: all 0.3s;
}

.subscribe-btn:hover {
  background: rgba(255, 0, 85, 0.1);
  border-color: var(--color-warrior);
  box-shadow: 0 0 10px rgba(255, 0, 85, 0.2);
}

.subscribe-btn.subscribed {
  background: var(--color-warrior);
  color: #000;
  border-color: var(--color-warrior);
  box-shadow: var(--glow-warrior);
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

@keyframes scaleUp {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.modal-title {
  font-size: 1.4rem;
  font-weight: 800;
  margin-bottom: 20px;
  text-align: center;
}

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
  border-color: var(--color-warrior);
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
  background: rgba(255, 0, 85, 0.2);
  border: 1px solid var(--color-warrior);
  color: #fff;
}

.modal-btn.confirm:hover {
  background: var(--color-warrior);
  color: #000;
  box-shadow: var(--glow-warrior);
}

/* Toast Message */
.toast-message {
  position: fixed;
  bottom: 40px;
  right: 40px;
  padding: 16px 24px;
  z-index: 2000;
  background: rgba(8, 9, 13, 0.95);
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: var(--glow-warrior);
}

.toast-icon {
  font-size: 1.4rem;
}

.toast-text {
  font-weight: 700;
  font-size: 0.95rem;
}

.toast-enter-active, .toast-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.toast-enter-from, .toast-leave-to {
  transform: translateY(30px);
  opacity: 0;
}

/* 響應式手機版 */
@media (max-width: 768px) {
  .action-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
    padding: 15px;
  }
  .parties-grid {
    grid-template-columns: 1fr;
  }
  .toast-message {
    left: 20px;
    right: 20px;
    bottom: 20px;
    justify-content: center;
  }
}
</style>
