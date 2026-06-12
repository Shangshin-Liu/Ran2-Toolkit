<template>
  <div class="party-detail-page">
    <div class="back-nav">
      <router-link to="/parties" class="back-btn neon-border-warrior">
        ⬅️ 返回練功團佈告欄
      </router-link>
    </div>

    <div v-if="loading" class="loading-state glass-card">
      <div class="spinner"></div>
      <p>正在載入練功團詳細資訊...</p>
    </div>

    <div v-else-if="!party" class="error-state glass-card neon-border-warrior">
      <h3>⚠️ 找不到此招募團</h3>
      <p>此練功團可能已被發起人刪除，或者連結網址有誤。</p>
      <router-link to="/parties" class="action-btn">返回佈告欄</router-link>
    </div>

    <div v-else class="detail-container">
      <div class="party-card glass-card detail-card" :class="{ 'subscribed-card': isSubscribed }">
        <!-- 伺服器與狀態 -->
        <div class="party-meta">
          <div class="meta-left">
            <span class="server-badge">{{ party.server }}</span>
            <span class="status-badge" :class="getStatusClass(effectiveStatus)">
              {{ effectiveStatus }}
            </span>
          </div>
        </div>

        <h2 class="party-title neon-text-warrior">{{ party.title }}</h2>
        
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
            <span class="info-text">目前跟團人數: <strong>{{ getMemberCount(party) }}</strong> 人</span>
          </div>
          <div class="info-item" v-if="effectiveStatus === '已結束' || effectiveStatus === '已關閉'">
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

        <!-- 跟團隊員 -->
        <div class="party-members-section" v-if="party.memberCharIds && party.memberCharIds.length > 0">
          <h4 class="req-title">當前成員：</h4>
          <div class="member-badges">
            <span v-for="mem in party.memberCharIds" :key="mem" class="member-badge">{{ mem }}</span>
          </div>
        </div>

        <!-- 訂閱動作 -->
        <div class="party-actions" v-if="effectiveStatus === '招募中'">
          <button 
            class="subscribe-btn"
            :class="{ 'subscribed': isSubscribed, 'disabled': !isLoggedIn }"
            :disabled="!isLoggedIn"
            @click="toggleSubscribe"
            :title="!isLoggedIn ? '請先登入後使用' : ''"
          >
            <span class="bell-icon">{{ isSubscribed ? '🔕' : '🔔' }}</span>
            {{ isSubscribed ? '我這次先pass好了' : '我想參加這團' }}
          </button>
        </div>
        <div class="party-actions disabled-actions" v-else>
          <button class="subscribe-btn disabled" disabled>
            {{ effectiveStatus }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { db, messaging } from '@/firebase.js'
import { doc, onSnapshot, updateDoc, increment, setDoc, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { getToken } from 'firebase/messaging'
import { useAuth } from '@/composables/useAuth.js'

const route = useRoute()
const partyId = route.params.id

const party = ref(null)
const loading = ref(true)
const localSubscribedIds = ref(JSON.parse(localStorage.getItem('ran2_subscribed_party_ids') || '[]'))

const { currentUser, isLoggedIn } = useAuth()

let unsubscribeDoc = null

const isSubscribed = computed(() => {
  if (!isLoggedIn.value || !party.value) return false
  return party.value.memberCharIds && party.value.memberCharIds.includes(currentUser.value.charId)
})

const getMemberCount = (p) => {
  if (!p) return 0
  return p.memberCharIds ? p.memberCharIds.length : (p.expectedCount || 0)
}

const getFcmToken = async () => {
  try {
    if (!('Notification' in window)) return null
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null
    return await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
    })
  } catch (err) {
    console.error(err)
    return null
  }
}

const toggleSubscribe = async () => {
  if (!party.value) return
  if (effectiveStatus.value === '已結束' || effectiveStatus.value === '已關閉') {
    return
  }
  if (!isLoggedIn.value) {
    alert('請先登入後再進行此操作！')
    return
  }

  // 伺服器校驗
  if (currentUser.value.server !== party.value.server) {
    alert(`伺服器不匹配！您的角色在「${currentUser.value.server}」，無法加入「${party.value.server}」的練功團。`)
    return
  }

  // 發起人不可跟團校驗
  if (currentUser.value.charId === party.value.leaderId || currentUser.value.codeHash === party.value.creatorHash) {
    alert('您是此招募團的發起人，無法參加自己發起的團！')
    return
  }

  const docRef = doc(db, 'parties', party.value.id)
  const isSubbed = isSubscribed.value
  
  try {
    if (!isSubbed) {
      const token = await getFcmToken()
      if (!token) return
      
      const subId = `${token}_${party.value.id}`
      await setDoc(doc(db, 'party_subscriptions', subId), {
        token: token,
        partyId: party.value.id,
        createdAt: Date.now()
      })
      
      localSubscribedIds.value.push(party.value.id)
      localStorage.setItem('ran2_subscribed_party_ids', JSON.stringify(localSubscribedIds.value))
      await updateDoc(docRef, {
        memberCharIds: arrayUnion(currentUser.value.charId),
        expectedCount: increment(1)
      })
    } else {
      const token = localStorage.getItem('ran2_fcm_token') || await getFcmToken()
      if (token) {
        const subId = `${token}_${party.value.id}`
        await deleteDoc(doc(db, 'party_subscriptions', subId))
      }
      
      localSubscribedIds.value = localSubscribedIds.value.filter(id => id !== party.value.id)
      localStorage.setItem('ran2_subscribed_party_ids', JSON.stringify(localSubscribedIds.value))
      await updateDoc(docRef, {
        memberCharIds: arrayRemove(currentUser.value.charId),
        expectedCount: increment(-1)
      })
    }
  } catch (err) {
    console.error(err)
  }
}

const getEffectiveStatus = (p) => {
  if (!p) return ''
  const now = Date.now()
  if (p.status === '已關閉' || p.status === '已結束') return p.status
  if (now >= p.endTime) return '已結束'
  if (now >= p.startTime) return '進行中'
  return p.status
}

const effectiveStatus = computed(() => {
  return getEffectiveStatus(party.value)
})

const getStatusClass = (status) => {
  if (status === '招募中') return 'recruiting'
  if (status === '進行中') return 'in-progress'
  if (status === '已結束' || status === '已關閉') return 'closed'
  return ''
}

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

const getDuration = (start, end) => {
  const hours = (end - start) / 3600000
  return Number.isInteger(hours) ? hours : hours.toFixed(2)
}

onMounted(() => {
  const docRef = doc(db, 'parties', partyId)
  unsubscribeDoc = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      party.value = { id: docSnap.id, ...docSnap.data() }
    } else {
      party.value = null
    }
    loading.value = false
  }, (err) => {
    console.error("載入詳細資訊失敗：", err)
    loading.value = false
  })
})

onUnmounted(() => {
  if (unsubscribeDoc) unsubscribeDoc()
})
</script>

<style scoped>
.party-detail-page {
  animation: fadeIn 0.4s ease-out;
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.back-nav {
  margin-bottom: 30px;
}

.back-btn {
  background: rgba(255,255,255,0.05);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.15);
  padding: 10px 20px;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 700;
  font-size: 0.95rem;
  display: inline-block;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  transition: all 0.3s;
}

.back-btn:hover {
  background: var(--color-warrior);
  color: #000;
  box-shadow: var(--glow-warrior);
  transform: translateX(-4px);
}

.loading-state, .error-state {
  text-align: center;
  padding: 40px;
}

.error-state h3 {
  font-size: 1.5rem;
  margin-bottom: 12px;
}

.error-state p {
  color: var(--text-muted);
  margin-bottom: 24px;
}

.action-btn {
  background: rgba(255, 0, 85, 0.2);
  border: 1px solid var(--color-warrior);
  color: #fff;
  padding: 10px 24px;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 700;
  display: inline-block;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  transition: all 0.3s;
}

.action-btn:hover {
  background: var(--color-warrior);
  color: #000;
  box-shadow: var(--glow-warrior);
}

.detail-card {
  border-top: 3px solid rgba(255, 255, 255, 0.1);
  padding: 30px !important;
  min-height: auto !important;
  transition: all 0.35s;
}

.detail-card.subscribed-card {
  border-color: var(--color-warrior);
  box-shadow: var(--glow-warrior);
}

.party-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
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
  margin-left: 8px;
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

.party-title {
  font-size: 1.6rem;
  font-weight: 800;
  margin-bottom: 24px;
  line-height: 1.3;
}

.party-info-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 28px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.95rem;
  color: var(--text-muted);
}

.info-icon {
  font-size: 1.25rem;
}

.party-requirements {
  background: rgba(255,255,255,0.02);
  padding: 16px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.03);
  margin-bottom: 28px;
}

.req-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 8px;
}

.req-list {
  list-style-type: none;
  padding-left: 0;
  margin: 0;
}

.req-list li {
  font-size: 0.85rem;
  color: var(--text-muted);
  position: relative;
  padding-left: 14px;
  line-height: 1.6;
}

.req-list li::before {
  content: '•';
  color: var(--color-warrior);
  position: absolute;
  left: 0;
}

.subscribe-btn {
  width: 100%;
  padding: 14px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #fff;
  font-weight: 700;
  font-size: 1rem;
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
  background: rgba(255, 255, 255, 0.03) !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
  color: rgba(255, 255, 255, 0.15) !important;
  box-shadow: none !important;
  cursor: not-allowed !important;
  opacity: 0.5;
  pointer-events: none;
}

.spinner {
  border: 4px solid rgba(255, 255, 255, 0.1);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border-left-color: var(--color-warrior);
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 統一身分新增樣式 */
.party-members-section {
  margin-top: 15px;
  padding: 10px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  text-align: left;
}
.member-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.member-badge {
  background: rgba(255, 0, 85, 0.1);
  border: 1px solid rgba(255, 0, 85, 0.3);
  color: #ff0055;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 700;
  text-shadow: 0 0 5px rgba(255, 0, 85, 0.3);
  box-shadow: 0 0 10px rgba(255, 0, 85, 0.1);
}
</style>
