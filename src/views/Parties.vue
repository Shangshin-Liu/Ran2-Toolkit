<template>
  <div class="parties-page">
    <div class="page-header">
      <h2 class="neon-text-warrior">⚔️ 練功團佈告欄</h2>
      <p class="subtitle">大老帶路、隊友招募！加入練功團，組隊升級效率加倍</p>
    </div>

    <!-- 頂部操作欄：篩選與發起招募 -->
    <div class="action-bar glass-card">
      <button class="mobile-filter-toggle" @click="isMobileFiltersExpanded = !isMobileFiltersExpanded">
        {{ isMobileFiltersExpanded ? '收起篩選' : '🔍 展開篩選' }}
      </button>

      <div class="filter-controls" :class="{ 'expanded': isMobileFiltersExpanded }">
        <label class="select-label">選擇伺服器:</label>
        <select v-model="selectedServer" class="server-select">
          <option value="全部">全部伺服器</option>
          <option v-for="s in SERVERS" :key="s" :value="s">{{ s }}</option>
        </select>

        <label class="select-label">練功地點:</label>
        <select v-model="selectedLocation" class="server-select">
          <option value="全部">全部地點</option>
          <option v-for="loc in LOCATIONS" :key="loc" :value="loc">{{ loc }}</option>
        </select>
        <div class="search-box">
          <input type="text" v-model="searchQuery" @keyup.enter="executeSearch" class="search-input" placeholder="模糊搜尋(標題/發起人/地點)" />
          <button class="search-btn" @click="executeSearch" title="搜尋">🔍</button>
        </div>
      </div>
      
      <div class="action-buttons" style="display: flex; gap: 12px;">
        <button 
          class="global-subscribe-btn"
          :class="{ 'active': globalSubscribed }"
          @click="toggleGlobalSubscribe"
        >
          {{ globalSubscribed ? '🔕 取消全站通知' : '🔔 接收全站通知' }}
        </button>
        
        <button class="create-party-btn neon-border-warrior" @click="openCreateModal">
          ➕ 發起招募
        </button>
      </div>
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
          <div class="meta-left">
            <span class="server-badge">{{ party.server }}</span>
            <span class="status-badge" :class="getStatusClass(party.status)">
              {{ party.status }}
            </span>
          </div>
          <button class="edit-icon-btn" @click="attemptEdit(party)" title="修改/關閉招募">⚙️</button>
        </div>

        <h3 class="party-title">{{ party.title }}</h3>
        
        <div class="party-info-list">
          <div class="info-item">
            <span class="info-icon">👤</span>
            <span class="info-text">發起人 ID: <strong class="neon-text-warrior">{{ party.leaderId }}</strong></span>
          </div>
          <div class="info-item">
            <span class="info-icon">📍</span>
            <span class="info-text">練功地點: <strong>{{ party.location === '其他' ? party.customLocation : party.location }}</strong></span>
          </div>
          <div class="info-item">
            <span class="info-icon">🕒</span>
            <span class="info-text">開始時間: <strong>{{ formatTime(party.startTime) }}</strong></span>
          </div>
          <div class="info-item">
            <span class="info-icon">⏳</span>
            <span class="info-text">預期結束時間: <strong>{{ formatTime(party.endTime) }}</strong></span>
          </div>
          <div class="info-item">
            <span class="info-icon">⏱️</span>
            <span class="info-text">預期總時數: <strong>{{ getDuration(party.startTime, party.endTime) }}</strong> 小時</span>
          </div>
          <div class="info-item">
            <span class="info-icon">🙋</span>
            <span class="info-text">期望參加人數: <strong>{{ party.expectedCount }}</strong> 人</span>
          </div>
          <div class="info-item" v-if="party.status === '已結束' || party.status === '已關閉'">
            <span class="info-icon">📝</span>
            <span class="info-text">結束原因: <strong>{{ party.closeReason || '無' }}</strong></span>
          </div>
        </div>

        <div class="party-requirements">
          <h4 class="req-title">跟團要求：</h4>
          <ul class="req-list">
            <li v-for="(req, idx) in party.requirements" :key="idx">{{ req }}</li>
          </ul>
        </div>

        <!-- 互動按鈕：預約通知 -->
        <div class="party-actions" v-if="party.status === '招募中'">
          <button 
            class="subscribe-btn"
            :class="{ 'subscribed': party.subscribed }"
            @click="toggleSubscribe(party)"
          >
            <span class="bell-icon">{{ party.subscribed ? '🔕' : '🔔' }}</span>
            {{ party.subscribed ? '我這次先pass好了' : '我想參加這團' }}
          </button>
        </div>
        <div class="party-actions disabled-actions" v-else>
          <button class="subscribe-btn disabled" disabled>
            {{ party.status }}
          </button>
        </div>
      </div>
    </div>

    <!-- 發起招募 / 修改 Modal -->
    <div class="modal-overlay" v-if="showCreateModal" @click="closeModal">
      <div class="modal-content glass-card neon-border-warrior" @click.stop>
        <h3 class="modal-title neon-text-warrior">⚔️ {{ isEditMode ? '修改/關閉 招募' : '發起練功招募' }}</h3>
        
        <div class="form-group">
          <label>招募標題</label>
          <input type="text" v-model="formData.title" placeholder="例如: 廢棄停車場速刷隊" />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>發起人 ID</label>
            <input type="text" v-model="formData.leaderId" placeholder="例如: 亂世狂刀" :disabled="isEditMode" />
          </div>
          <div class="form-group">
            <label>伺服器</label>
            <select v-model="formData.server" :disabled="isEditMode">
              <option v-for="s in SERVERS" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>練功地點</label>
            <select v-model="formData.location">
              <option v-for="loc in LOCATIONS" :key="loc" :value="loc">{{ loc }}</option>
            </select>
          </div>
          <div class="form-group" v-if="formData.location === '其他'">
            <label>自訂練功地點 (最多50字)</label>
            <input type="text" v-model="formData.customLocation" maxlength="50" placeholder="請輸入地點名稱" />
          </div>
        </div>

        <div class="form-group">
          <label>開始時間</label>
          <input type="datetime-local" v-model="formData.startTimeStr" @click="$event.target.showPicker && $event.target.showPicker()" />
        </div>
        
        <div class="form-group">
          <label>預計結束時間</label>
          <input type="datetime-local" v-model="formData.endTimeStr" @click="$event.target.showPicker && $event.target.showPicker()" />
        </div>

        <div class="form-group">
          <label>防呆密碼 (純數字，修改/刪除時需使用)</label>
          <input type="text" pattern="[0-9]*" v-model="formData.password" placeholder="例如: 1234" :disabled="isEditMode" />
        </div>

        <div class="form-group">
          <label>跟團要求 (每行一條)</label>
          <textarea v-model="formData.reqText" rows="3" placeholder="Lv.25+&#10;聽指揮不掛機&#10;自備加倍卷"></textarea>
        </div>

        <!-- 編輯模式專屬欄位 -->
        <template v-if="isEditMode">
          <div class="form-row">
            <div class="form-group">
              <label>招募狀態</label>
              <select v-model="formData.status">
                <option v-for="st in STATUSES" :key="st" :value="st">{{ st }}</option>
              </select>
            </div>
            <div class="form-group" v-if="formData.status === '已關閉' || formData.status === '已結束'">
              <label>結束/關閉原因</label>
              <input type="text" v-model="formData.closeReason" placeholder="輸入原因..." />
            </div>
          </div>
        </template>

        <div class="modal-buttons" style="justify-content: space-between;">
          <div>
            <button v-if="isEditMode" class="modal-btn delete-btn" @click="deleteParty(formData.id)">🗑️ 刪除</button>
          </div>
          <div style="display: flex; gap: 14px;">
            <button class="modal-btn cancel" @click="closeModal">取消</button>
            <button class="modal-btn confirm neon-border-warrior" @click="saveParty">{{ isEditMode ? '儲存修改' : '發布招募' }}</button>
          </div>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'

const LOCATIONS = [
  '失落異界迴廊',
  '超自然研究中心3F', '超自然研究中心4F', '超自然研究中心5F', '超自然研究中心6F',
  '101大樓1F', '101大樓2F', '101大樓3F', '101大樓4F', '101大樓5F',
  '其他'
]

const SERVERS = ['新東京', '新大阪']
const STATUSES = ['招募中', '進行中', '已結束', '已關閉']

const selectedServer = ref('全部')
const selectedLocation = ref('全部')
const searchQuery = ref('')
const activeSearchQuery = ref('')

const globalSubscribed = ref(false)
const isMobileFiltersExpanded = ref(false)

const toggleGlobalSubscribe = () => {
  globalSubscribed.value = !globalSubscribed.value
  if (globalSubscribed.value) {
    showToast('已開啟「接收全站招募通知」！有新團發起將主動通知您。')
  } else {
    showToast('已關閉全站招募通知。')
  }
}

const executeSearch = () => {
  activeSearchQuery.value = searchQuery.value
}

const showCreateModal = ref(false)
const isEditMode = ref(false)
const toastMsg = ref('')

const formData = ref({
  id: '',
  title: '',
  leaderId: '',
  server: '新東京',
  location: '失落異界迴廊',
  customLocation: '',
  startTimeStr: '',
  endTimeStr: '',
  reqText: '',
  password: '',
  status: '招募中',
  closeReason: ''
})

const parties = ref([
  {
    id: 'party-1',
    title: '迴廊C趴團',
    leaderId: '幻海奇緣',
    server: '新東京',
    location: '失落異界迴廊',
    customLocation: '',
    startTime: Date.now() + 3600000, // 1 hour from now
    endTime: Date.now() + 14400000,  // 4 hours from now
    requirements: ['等級1~200', '無戰力限制'],
    subscribed: false,
    expectedCount: 0,
    status: '招募中',
    password: '123',
    closeReason: '',
    notified10min: false
  }
])

const filteredParties = computed(() => {
  return parties.value.filter(p => {
    // 1. Server filter
    if (selectedServer.value !== '全部' && p.server !== selectedServer.value) return false
    
    // 2. Location filter
    const actualLocation = p.location === '其他' ? p.customLocation : p.location
    if (selectedLocation.value !== '全部' && p.location !== selectedLocation.value) return false

    // 3. Keyword fuzzy search
    if (activeSearchQuery.value) {
      const keyword = activeSearchQuery.value.toLowerCase()
      const matchTitle = p.title.toLowerCase().includes(keyword)
      const matchLeader = p.leaderId.toLowerCase().includes(keyword)
      const matchLoc = actualLocation.toLowerCase().includes(keyword)
      if (!matchTitle && !matchLeader && !matchLoc) return false
    }

    return true
  })
})

const formatTime = (unixMs) => {
  if (!unixMs) return ''
  const d = new Date(unixMs)
  const YYYY = d.getFullYear()
  const MM = String(d.getMonth()+1).padStart(2, '0')
  const DD = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${YYYY}/${MM}/${DD} ${hh}:${mm}`
}

const formatForInput = (unixMs) => {
  if (!unixMs) return ''
  const d = new Date(unixMs)
  const YYYY = d.getFullYear()
  const MM = String(d.getMonth()+1).padStart(2, '0')
  const DD = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${YYYY}-${MM}-${DD}T${hh}:${mm}`
}

const getDuration = (start, end) => {
  const hours = (end - start) / 3600000
  return Number.isInteger(hours) ? hours : hours.toFixed(2)
}

const getStatusClass = (status) => {
  if (status === '招募中') return 'recruiting'
  if (status === '進行中') return 'in-progress'
  if (status === '已結束' || status === '已關閉') return 'closed'
  return ''
}

const toggleSubscribe = (party) => {
  party.subscribed = !party.subscribed
  if (party.subscribed) {
    party.expectedCount++
    showToast(`參加成功！開團前將通知您。`)
  } else {
    party.expectedCount--
    showToast(`已取消參加。`)
  }
}

const showToast = (msg) => {
  toastMsg.value = msg
  setTimeout(() => {
    toastMsg.value = ''
  }, 3000)
}

const openCreateModal = () => {
  isEditMode.value = false
  const now = new Date()
  const start = new Date(now.getTime() + 10 * 60000) // 預設 10 分鐘後
  const end = new Date(now.getTime() + 130 * 60000) // 預設 2 小時 10 分鐘後

  formData.value = {
    id: '',
    title: '',
    leaderId: '',
    server: '新東京',
    location: '失落異界迴廊',
    customLocation: '',
    startTimeStr: formatForInput(start.getTime()),
    endTimeStr: formatForInput(end.getTime()),
    reqText: '',
    password: '',
    status: '招募中',
    closeReason: ''
  }
  showCreateModal.value = true
}

const attemptEdit = (party) => {
  const pwd = prompt('請輸入此招募的防呆密碼 (純數字)：')
  if (pwd === null) return // cancel
  if (pwd === party.password) {
    isEditMode.value = true
    formData.value = {
      id: party.id,
      title: party.title,
      leaderId: party.leaderId,
      server: party.server,
      location: party.location,
      customLocation: party.customLocation || '',
      startTimeStr: formatForInput(party.startTime),
      endTimeStr: formatForInput(party.endTime),
      reqText: party.requirements.join('\n'),
      password: party.password,
      status: party.status,
      closeReason: party.closeReason || ''
    }
    showCreateModal.value = true
  } else {
    alert('密碼錯誤！')
  }
}

const saveParty = () => {
  if (!formData.value.title || !formData.value.leaderId || !formData.value.password || !formData.value.startTimeStr || !formData.value.endTimeStr) {
    showToast('請填寫所有必要資訊！')
    return
  }
  if (!/^\d+$/.test(formData.value.password)) {
    showToast('防呆密碼僅限輸入純數字！')
    return
  }
  
  const startMs = new Date(formData.value.startTimeStr).getTime()
  const endMs = new Date(formData.value.endTimeStr).getTime()
  
  if (startMs >= endMs) {
    showToast('結束時間必須晚於開始時間！')
    return
  }

  const reqs = formData.value.reqText
    ? formData.value.reqText.split('\n').filter(r => r.trim() !== '')
    : ['無特殊要求']

  if (isEditMode.value) {
    const idx = parties.value.findIndex(p => p.id === formData.value.id)
    if (idx !== -1) {
      const oldParty = parties.value[idx]
      const locChanged = oldParty.location !== formData.value.location || oldParty.customLocation !== formData.value.customLocation
      const timeChanged = oldParty.startTime !== startMs || oldParty.endTime !== endMs
      const statusChanged = oldParty.status !== formData.value.status
      
      parties.value[idx] = {
        ...oldParty,
        title: formData.value.title,
        location: formData.value.location,
        customLocation: formData.value.customLocation,
        startTime: startMs,
        endTime: endMs,
        requirements: reqs,
        status: formData.value.status,
        closeReason: formData.value.closeReason
      }
      
      if (oldParty.subscribed && (locChanged || timeChanged || statusChanged)) {
        console.log(`%c【單一招募通知】%c 發起人變更了招募資訊: ${oldParty.title}`, 'background: #00e5ff; color: #000; padding: 2px 6px; border-radius: 4px;', 'color: #00e5ff; font-weight: bold;')
      }
      showToast('招募修改成功！')
    }
  } else {
    parties.value.unshift({
      id: `party-${Date.now()}`,
      title: formData.value.title,
      leaderId: formData.value.leaderId,
      server: formData.value.server,
      location: formData.value.location,
      customLocation: formData.value.customLocation,
      startTime: startMs,
      endTime: endMs,
      requirements: reqs,
      password: formData.value.password,
      status: '招募中',
      closeReason: '',
      expectedCount: 0,
      subscribed: false,
      notified10min: false
    })
    
    const actualLoc = formData.value.location === '其他' ? formData.value.customLocation : formData.value.location
    if (globalSubscribed.value) {
      console.log(`%c【全訂閱推播】%c 新招募發起: ${formData.value.leaderId} | ${actualLoc} | ${formatTime(startMs)} ~ ${formatTime(endMs)}`, 'background: #ff0055; color: #fff; padding: 2px 6px; border-radius: 4px;', 'color: #ff0055; font-weight: bold;')
    }
    showToast('招募發布成功！')
  }

  closeModal()
}

const deleteParty = (id) => {
  if (confirm("確定要刪除此招募嗎？此操作無法還原。")) {
    const p = parties.value.find(x => x.id === id)
    if (p && p.subscribed) {
      console.log(`%c【單一招募通知】%c 發起人刪除了招募: ${p.title}`, 'background: #00e5ff; color: #000; padding: 2px 6px; border-radius: 4px;', 'color: #00e5ff; font-weight: bold;')
    }
    parties.value = parties.value.filter(x => x.id !== id)
    closeModal()
    showToast('招募已刪除！')
  }
}

const closeModal = () => {
  showCreateModal.value = false
}

// Frontend Scheduler Logic
let schedulerTimer = null
onMounted(() => {
  // Check every 10 seconds for real-time frontend simulation
  schedulerTimer = setInterval(() => {
    const now = Date.now()
    parties.value.forEach(p => {
      // 10 minute warning
      if (!p.notified10min && p.status === '招募中' && p.startTime > now && (p.startTime - now <= 10 * 60 * 1000)) {
        p.notified10min = true
        if (p.subscribed) {
          console.log(`%c【單一招募通知】%c 您訂閱的招募「${p.title}」即將在10分鐘內開始！`, 'background: #00e5ff; color: #000; padding: 2px 6px; border-radius: 4px;', 'color: #00e5ff; font-weight: bold;')
        }
      }
      
      // Auto transition to "進行中"
      if (now >= p.startTime && p.status === '招募中') {
        p.status = '進行中'
      }
      
      // Auto transition to "已結束"
      if (now >= p.endTime && (p.status === '招募中' || p.status === '進行中')) {
        p.status = '已結束'
        p.closeReason = '已經順利結束囉'
      }
    })
  }, 10000)
})

onUnmounted(() => {
  if (schedulerTimer) clearInterval(schedulerTimer)
})
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
  flex-wrap: wrap;
}

.select-label {
  font-size: 0.9rem;
  color: var(--text-muted);
  font-weight: 700;
}

.server-select, .search-input {
  background: rgba(8, 9, 13, 0.6);
  border: 1px solid rgba(255,255,255,0.1);
  color: #fff;
  padding: 8px 12px;
  border-radius: 6px;
  outline: none;
  font-weight: 700;
  cursor: url('/assets/ran2-cursor.cur'), text;
}
.server-select {
  cursor: url('/assets/ran2-cursor.cur'), pointer;
}
.search-box {
  display: flex;
  gap: 8px;
}
.search-btn {
  background: rgba(8, 9, 13, 0.6);
  border: 1px solid rgba(255,255,255,0.1);
  color: #fff;
  border-radius: 6px;
  padding: 0 12px;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.search-btn:hover {
  background: rgba(255,255,255,0.1);
  border-color: rgba(255,255,255,0.3);
  transform: translateY(-2px);
}

.global-subscribe-btn {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-muted);
  border: 1px solid rgba(255,255,255,0.1);
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  transition: all 0.3s;
  white-space: nowrap;
}

.global-subscribe-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.global-subscribe-btn.active {
  background: rgba(0, 229, 255, 0.1);
  border-color: var(--color-snipper);
  color: var(--color-snipper);
  box-shadow: 0 0 10px rgba(0, 229, 255, 0.2);
}

.search-input {
  min-width: 200px;
}
.search-input:focus, .server-select:focus {
  border-color: var(--color-warrior);
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
  white-space: nowrap;
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
  position: relative;
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
.meta-left {
  display: flex;
  gap: 8px;
  align-items: center;
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
.status-badge.in-progress {
  background: rgba(0, 255, 102, 0.15);
  color: var(--color-qigong);
}
.status-badge.closed {
  background: rgba(255, 255, 255, 0.1);
  color: #888;
}

.edit-icon-btn {
  background: none;
  border: none;
  font-size: 1.1rem;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
}
.edit-icon-btn:hover {
  opacity: 1;
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
  align-items: flex-start;
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
  margin: 0;
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

.subscribe-btn:hover:not(.disabled) {
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

.subscribe-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: rgba(255,255,255,0.05);
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
  max-height: 90vh;
  overflow-y: auto;
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

.form-group input:disabled, .form-group select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-group input:focus:not(:disabled), .form-group select:focus:not(:disabled), .form-group textarea:focus {
  border-color: var(--color-warrior);
}

.modal-buttons {
  display: flex;
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

.modal-btn.delete-btn {
  background: rgba(255,0,0,0.1);
  border: 1px solid red;
  color: #ff4d4d;
}
.modal-btn.delete-btn:hover {
  background: red;
  color: white;
  box-shadow: 0 0 10px rgba(255,0,0,0.5);
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

/* 手機版篩選收合按鈕 (電腦版隱藏) */
.mobile-filter-toggle {
  display: none;
}

/* 響應式手機版 */
@media (max-width: 768px) {
  .mobile-filter-toggle {
    display: block;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255,255,255,0.1);
    color: #fff;
    padding: 10px 16px;
    border-radius: 6px;
    width: 100%;
    font-weight: 700;
    cursor: url('/assets/ran2-cursor.cur'), pointer;
    text-align: center;
  }
  .action-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
    padding: 15px;
  }
  .filter-controls {
    display: none;
    flex-direction: column;
    align-items: stretch;
  }
  .filter-controls.expanded {
    display: flex;
  }
  .action-buttons {
    flex-direction: column;
    width: 100%;
  }
  .global-subscribe-btn, .create-party-btn {
    width: 100%;
    text-align: center;
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
