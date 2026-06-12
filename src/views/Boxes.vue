<template>
  <div class="boxes-page">
    <div class="page-header">
      <h2 class="neon-text-box">🎁 禮盒查詢</h2>
      <p class="subtitle">探索各大禮盒的獲取途徑與內容物機率，好運就在下一擊</p>
    </div>

    <!-- 搜尋與過濾列 -->
    <div class="filter-bar glass-card">
      <button class="mobile-filter-toggle" @click="isMobileFiltersExpanded = !isMobileFiltersExpanded">
        {{ isMobileFiltersExpanded ? '收起篩選' : '🔍 展開篩選' }}
      </button>

      <div class="filter-controls" :class="{ 'expanded': isMobileFiltersExpanded }">
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

        <button 
          class="provide-btn neon-border-box" 
          :disabled="!isLoggedIn"
          @click="openProvideModal"
          :title="isLoggedIn ? '提供新禮盒資訊' : '請先登入後使用提供禮盒功能'"
        >
          📋 提供新禮盒
        </button>
      </div>
    </div>

    <!-- 主區塊：與 Share 頁面一致的版面 -->
    <div class="boxes-layout" v-if="filteredBoxes.length > 0">
      <!-- 左側：禮盒列表 -->
      <div class="boxes-list-panel">
        <div 
          v-for="box in paginatedBoxes" 
          :key="box.id" 
          class="box-card glass-card"
          :class="{ 'active-box-card': selectedBox && selectedBox.id === box.id }"
          @click="selectBox(box)"
        >
          <div class="box-card-details">
            <h3 class="box-card-title">{{ box.name }}</h3>
            <p class="box-card-source">來源: {{ box.sourceType ? box.sourceType.join('/') : '' }}</p>
          </div>
        </div>

        <!-- 🔢 分頁控制項 -->
        <div class="pagination-container" v-if="totalPages > 1">
          <button 
            class="page-btn arrow-btn" 
            :disabled="currentPage === 1" 
            @click="currentPage = 1"
            title="最前頁"
          >
            «
          </button>
          <button 
            class="page-btn arrow-btn" 
            :disabled="currentPage === 1" 
            @click="currentPage--"
            title="上一頁"
          >
            ‹
          </button>

          <button 
            v-for="page in pageNumbers" 
            :key="page" 
            class="page-btn num-btn"
            :class="{ 'active-page': currentPage === page }"
            @click="currentPage = page"
          >
            {{ page }}
          </button>

          <button 
            class="page-btn arrow-btn" 
            :disabled="currentPage === totalPages" 
            @click="currentPage++"
            title="下一頁"
          >
            ›
          </button>
          <button 
            class="page-btn arrow-btn" 
            :disabled="currentPage === totalPages" 
            @click="currentPage = totalPages"
            title="最末頁"
          >
            »
          </button>

          <div class="page-info">
            第 {{ currentPage }} / {{ totalPages }} 頁 (共 {{ filteredBoxes.length }} 筆)
          </div>
        </div>
      </div>

      <!-- 右側：禮盒詳細內容 -->
      <div class="box-detail-panel glass-card neon-border-box" v-if="selectedBox">
        <div class="detail-header">
          <div class="detail-main-info" style="width: 100%;">
            <h2 class="detail-box-name neon-text-box">{{ selectedBox.name }}</h2>
            <p class="obtain-source" style="margin-bottom: 8px;">📂 來源類型：<strong>{{ selectedBox.sourceType ? selectedBox.sourceType.join('/') : '' }}</strong></p>
            <div class="obtain-path-box" v-if="selectedBox.obtains && selectedBox.obtains.length">
              <span style="font-size: 0.95rem; color: var(--text-muted); font-weight: 700;">📍 獲取途徑：</span>
              <ul class="bullet-list" style="margin-top: 6px; padding-left: 20px; list-style-type: square;">
                <li v-for="(obs, index) in selectedBox.obtains" :key="index" style="color: #fff; font-size: 0.92rem; line-height: 1.5; margin-bottom: 4px;">
                  {{ obs }}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <hr class="divider" />

        <!-- 內容物 -->
        <div class="detail-section">
          <h3 class="section-title">🎒 內容物</h3>
          <ul class="stats-list">
            <li v-for="(item, idx) in selectedBox.items" :key="idx" class="stat-li">
              <span class="stat-text" :class="{ 'min-rate-highlight': isMinRateItem(item, selectedBox.items) }">
                {{ item.rate >= 100 ? item.name : `${item.name} (${item.rate}%)` }}
                <span v-if="isMinRateItem(item, selectedBox.items)" class="rare-fire-badge">🔥 極稀有</span>
              </span>
            </li>
          </ul>
        </div>

        <!-- 備註 -->
        <div class="detail-section">
          <div class="warnings-box">
            <h4>📝 備註</h4>
            <p style="margin: 0; white-space: pre-wrap; font-size: 0.9rem; line-height: 1.6;">{{ selectedBox.note || '無額外說明。' }}</p>
          </div>
        </div>

        <!-- 我要回報按鈕 -->
        <div class="report-section" style="margin-top: 20px; text-align: right; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px;">
          <button 
            class="report-btn" 
            :disabled="!isLoggedIn"
            @click="openReportModal(selectedBox)"
            :title="isLoggedIn ? '點擊回報此禮盒建議' : '請先登入後使用回報功能'"
          >
            💬 我要回報
          </button>
        </div>
      </div>
    </div>

    <!-- 查無資料 Empty State -->
    <div class="empty-state glass-card neon-border-box" v-else style="text-align: center; padding: 60px 20px;">
      <div class="empty-state-icon" style="font-size: 3rem; margin-bottom: 16px;">🔍</div>
      <h3 class="empty-state-title neon-text-box" style="font-size: 1.5rem; margin-bottom: 8px;">找不到符合條件的禮盒</h3>
      <p class="empty-state-desc" style="color: var(--text-muted);">請嘗試重新輸入關鍵字搜尋。</p>
    </div>

    <!-- 手機版抽屜 -->
    <div class="mobile-drawer-overlay" v-if="showMobileDetail" @click="closeMobileDetail">
      <div class="mobile-drawer glass-card neon-border-box" @click.stop>
        <button class="close-btn" @click="closeMobileDetail">✕</button>
        <div class="drawer-content" v-if="selectedBox">
          <div class="detail-header" style="flex-direction: column; align-items: flex-start; text-align: left;">
            <h2 class="detail-box-name neon-text-box" style="font-size: 1.5rem; margin-bottom: 8px;">{{ selectedBox.name }}</h2>
            <p class="obtain-source" style="margin-bottom: 8px;">📂 來源類型: <strong>{{ selectedBox.sourceType ? selectedBox.sourceType.join('/') : '' }}</strong></p>
            <div class="obtain-path-box" v-if="selectedBox.obtains && selectedBox.obtains.length" style="width: 100%;">
              <span style="font-size: 0.88rem; color: var(--text-muted); font-weight: 700;">📍 獲取途徑：</span>
              <ul class="bullet-list" style="margin-top: 4px; padding-left: 20px; list-style-type: square; color: #fff;">
                <li v-for="(obs, index) in selectedBox.obtains" :key="index" style="font-size: 0.88rem; line-height: 1.5; margin-bottom: 4px;">
                  {{ obs }}
                </li>
              </ul>
            </div>
          </div>

          <hr class="divider" style="margin: 15px 0;" />

          <div class="detail-section">
            <h3 class="section-title" style="font-size: 1rem;">🎒 內容物</h3>
            <ul class="stats-list">
              <li v-for="(item, idx) in selectedBox.items" :key="idx" class="stat-li">
                <span class="stat-text" :class="{ 'min-rate-highlight': isMinRateItem(item, selectedBox.items) }">
                  {{ item.rate >= 100 ? item.name : `${item.name} (${item.rate}%)` }}
                  <span v-if="isMinRateItem(item, selectedBox.items)" class="rare-fire-badge">🔥 極稀有</span>
                </span>
              </li>
            </ul>
          </div>

          <div class="warnings-box" style="margin-top: 10px;">
            <h4>📝 備註</h4>
            <p style="margin: 0; white-space: pre-wrap; font-size: 0.85rem; line-height: 1.5; color: var(--text-muted);">{{ selectedBox.note || '無額外說明。' }}</p>
          </div>

          <!-- 手機版回報按鈕 -->
          <div class="report-section" style="margin-top: 20px; text-align: right; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px;">
            <button 
              class="report-btn" 
              :disabled="!isLoggedIn"
              @click="openReportModal(selectedBox)"
              :title="isLoggedIn ? '點擊回報此禮盒建議' : '請先登入後使用回報功能'"
            >
              💬 我要回報
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 💬 我要回報 Modal -->
    <div class="modal-overlay" v-if="showReportModal" @click="showReportModal = false" style="z-index: 2400;">
      <div class="modal-content glass-card neon-border-box" @click.stop style="width: 550px; max-width: 95%;">
        <button class="modal-close-btn" @click="showReportModal = false">✕</button>
        <h3 class="modal-title neon-text-box" style="margin-bottom: 20px; text-align: center; font-weight: 800; font-size: 1.4rem;">💬 回報禮盒內容建議</h3>
        
        <div class="modal-body" v-if="reportingBox">
          <!-- 提報者資訊 (唯讀) -->
          <div class="input-group">
            <label class="input-label">提報者身分 (固定不可改)</label>
            <input 
              type="text" 
              class="modal-text-input" 
              :value="`${currentUser.code} [${currentUser.server}][${currentUser.school}][${currentUser.dept}]${currentUser.charId}`" 
              readonly 
            />
          </div>

          <!-- 禮盒名稱說明 -->
          <div class="input-group">
            <label class="input-label">回報對應禮盒</label>
            <p class="modal-read-only-box">
              {{ reportingBox.name }}
            </p>
          </div>

          <!-- 回報內容輸入 -->
          <div class="input-group">
            <label class="input-label">回報建議內容</label>
            <textarea 
              v-model="reportContent" 
              class="modal-text-input" 
              rows="6" 
              placeholder="請輸入此禮盒的具體內容修改建議或管道錯誤回報..."
              required
            ></textarea>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px;">
            <button class="modal-btn cancel" @click="showReportModal = false">取消</button>
            <button class="modal-btn confirm neon-border-box" @click="handleSendReport">確認送出</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 📋 提供新禮盒 Modal -->
    <div class="modal-overlay" v-if="showProvideModal" @click="showProvideModal = false" style="z-index: 2400;">
      <div class="modal-content glass-card neon-border-box" @click.stop style="width: 550px; max-width: 95%;">
        <button class="modal-close-btn" @click="showProvideModal = false">✕</button>
        <h3 class="modal-title neon-text-box" style="margin-bottom: 20px; text-align: center; font-weight: 800; font-size: 1.4rem;">📋 提供新禮盒資訊</h3>
        
        <div class="modal-body">
          <!-- 提報者資訊 (唯讀) -->
          <div class="input-group">
            <label class="input-label">提供者身分 (固定不可改)</label>
            <input 
              type="text" 
              class="modal-text-input" 
              :value="`${currentUser.code} [${currentUser.server}][${currentUser.school}][${currentUser.dept}]${currentUser.charId}`" 
              readonly 
            />
          </div>

          <!-- 禮盒名稱輸入 -->
          <div class="input-group">
            <label class="input-label">新禮盒名稱</label>
            <input 
              type="text" 
              class="modal-text-input" 
              v-model="provideTitle"
              placeholder="例如: 鳳凰學院專屬新手禮盒(30D)"
              required
            />
          </div>

          <!-- 提供內容輸入 -->
          <div class="input-group">
            <label class="input-label">禮盒內容物與途徑說明</label>
            <textarea 
              v-model="provideContent" 
              class="modal-text-input" 
              rows="6" 
              placeholder="請寫下此禮盒的獲取途徑、內容物品、以及獲取機率 (例如：起點(7D)-100%、前點(7D)-100%、高級護貝劑-5.5% 等)..."
              required
            ></textarea>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px;">
            <button class="modal-btn cancel" @click="showProvideModal = false">取消</button>
            <button class="modal-btn confirm neon-border-box" @click="handleSendProvide">確認送出</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 載入中 Loading Overlay -->
    <LoadingOverlay v-if="isActionLoading" theme="box" :message="actionLoadingMessage" fullscreen />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { collection, getDocs, getDoc, doc } from 'firebase/firestore'
import { db } from '@/firebase.js'
import { useAuth } from '@/composables/useAuth.js'
import LoadingOverlay from '@/components/LoadingOverlay.vue'

// 取得 Auth
const { currentUser, isLoggedIn } = useAuth()

const route = useRoute()
const searchQuery = ref('')
const isMobileFiltersExpanded = ref(false)
const showMobileDetail = ref(false)

// 禮盒資料
const boxes = ref([])
const isActionLoading = ref(false)
const actionLoadingMessage = ref('')

// 分頁設定
const currentPage = ref(1)
const pageSize = 5

// 選中的禮盒
const selectedBox = ref(null)

// 彈窗狀態
const showReportModal = ref(false)
const reportingBox = ref(null)
const reportContent = ref('')

const showProvideModal = ref(false)
const provideTitle = ref('')
const provideContent = ref('')

// 計算過濾後的禮盒列表 (純文字即時搜尋)
const filteredBoxes = computed(() => {
  if (!searchQuery.value) return boxes.value
  const query = searchQuery.value.toLowerCase().trim()
  return boxes.value.filter(b => b.name.toLowerCase().includes(query))
})

// 總頁數
const totalPages = computed(() => {
  return Math.ceil(filteredBoxes.value.length / pageSize) || 1
})

// 當前分頁禮盒
const paginatedBoxes = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  return filteredBoxes.value.slice(start, end)
})

// 分頁按鈕頁碼 (前後 3 頁)
const pageNumbers = computed(() => {
  const current = currentPage.value
  const total = totalPages.value
  const pages = []
  
  let start = Math.max(1, current - 3)
  let end = Math.min(total, current + 3)
  
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
})

// 監聽搜尋重置頁碼
watch(searchQuery, () => {
  currentPage.value = 1
})

// 防斷頭處理
watch(totalPages, (newVal) => {
  if (currentPage.value > newVal) {
    currentPage.value = newVal
  }
})

// 篩選改變時的預設選取處理
watch(filteredBoxes, (newFiltered) => {
  if (newFiltered.length > 0) {
    const isSelectedStillVisible = newFiltered.some(b => b.id === selectedBox.value?.id)
    if (!isSelectedStillVisible) {
      selectedBox.value = newFiltered[0]
    }
  } else {
    selectedBox.value = null
  }
})

// 載入與 LocalStorage 快取秒開邏輯
const loadAllBoxes = async () => {
  isActionLoading.value = true
  actionLoadingMessage.value = '拉拉拉~~~'
  try {
    const cachedData = localStorage.getItem('ran2_boxes_cache')
    const cachedTime = localStorage.getItem('ran2_boxes_last_updated')
    
    if (cachedData && cachedTime) {
      try {
        boxes.value = JSON.parse(cachedData)
        setDefaultSelectedBox()
      } catch (e) {
        console.error('解析快取禮盒資料失敗:', e)
      }
    }

    // 檢查 Firebase 的中介更新時間
    const metaRef = doc(db, 'metadata', 'boxes')
    const metaSnap = await getDoc(metaRef)
    let dbLastUpdated = 0
    if (metaSnap.exists()) {
      dbLastUpdated = metaSnap.data().lastUpdated || 0
    }

    const localTimeNum = parseInt(cachedTime || '0', 10)
    // 若資料庫比較新，或完全沒有快取，則進行撈取
    if (dbLastUpdated > localTimeNum || !cachedData) {
      const querySnapshot = await getDocs(collection(db, 'boxes'))
      const fetchedBoxes = []
      querySnapshot.forEach((doc) => {
        fetchedBoxes.push(doc.data())
      })

      // 排序
      fetchedBoxes.sort((a, b) => a.id.localeCompare(b.id))

      boxes.value = fetchedBoxes
      localStorage.setItem('ran2_boxes_cache', JSON.stringify(fetchedBoxes))
      localStorage.setItem('ran2_boxes_last_updated', dbLastUpdated.toString())
      
      setDefaultSelectedBox()
    }
  } catch (err) {
    console.error('載入禮盒資料失敗:', err)
  } finally {
    isActionLoading.value = false
  }
}

const setDefaultSelectedBox = () => {
  const routeBoxId = route.params.id
  const routeSearchQuery = route.query.search

  if (routeBoxId) {
    const found = boxes.value.find(b => b.id === routeBoxId)
    if (found) {
      selectedBox.value = found
      return
    }
  }

  if (routeSearchQuery) {
    const found = boxes.value.find(b => b.name.includes(routeSearchQuery))
    if (found) {
      selectedBox.value = found
      return
    }
  }

  if (boxes.value.length > 0 && !selectedBox.value) {
    selectedBox.value = boxes.value[0]
  }
}

// 判斷是否為最低機率 item 且 rate < 100
const isMinRateItem = (item, items) => {
  if (!items || items.length === 0) return false
  const sub100Items = items.filter(i => i.rate < 100)
  if (sub100Items.length === 0) return false
  const minRate = Math.min(...sub100Items.map(i => i.rate))
  return item.rate === minRate && item.rate < 100
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

// 彈窗操作
const openReportModal = (box) => {
  reportingBox.value = box
  reportContent.value = ''
  showReportModal.value = true
}

const openProvideModal = () => {
  provideTitle.value = ''
  provideContent.value = ''
  showProvideModal.value = true
}

// 回報發送 Webhook
const handleSendReport = async () => {
  if (!isLoggedIn.value) {
    alert('請先登入後使用回報功能！')
    return
  }
  if (!reportContent.value.trim()) {
    alert('請輸入回報內容！')
    return
  }

  isActionLoading.value = true
  actionLoadingMessage.value = '正在送出回報...'

  try {
    const webhookUrl = import.meta.env.VITE_DISCORD_BOX_WEBHOOK_URL || ''
    if (!webhookUrl) {
      console.warn('未設定 Discord Webhook 網址，跳過發送並模擬成功')
    } else {
      const reporter = `${currentUser.value.code} [${currentUser.value.server}][${currentUser.value.school}][${currentUser.value.dept}]${currentUser.value.charId}`
      const title = `禮盒查詢 [${reportingBox.value.name}](${reportingBox.value.id}) 內容建議`
      
      const payload = {
        username: "RAN2 禮盒回報小助手",
        avatar_url: "https://ran2-toolkit.web.app/assets/logo.jpg",
        embeds: [{
          title: title,
          color: 13107455, // #c800ff
          fields: [
            { name: "👤 提報者", value: reporter, inline: false },
            { name: "📝 建議內容", value: reportContent.value }
          ],
          timestamp: new Date().toISOString()
        }]
      }

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        throw new Error(`Discord Webhook 回傳錯誤: ${res.statusText}`)
      }
    }

    showReportModal.value = false
    reportContent.value = ''
    alert('感謝您的回報！我們會盡快處理。')
  } catch (err) {
    console.error('回報發送失敗:', err)
    alert('回報失敗：' + err.message)
  } finally {
    isActionLoading.value = false
  }
}

// 提供新禮盒發送 Webhook
const handleSendProvide = async () => {
  if (!isLoggedIn.value) {
    alert('請先登入後使用提供禮盒功能！')
    return
  }
  if (!provideTitle.value.trim()) {
    alert('請輸入新禮盒名稱！')
    return
  }
  if (!provideContent.value.trim()) {
    alert('請輸入禮盒詳細說明！')
    return
  }

  isActionLoading.value = true
  actionLoadingMessage.value = '正在送出提供資訊...'

  try {
    const webhookUrl = import.meta.env.VITE_DISCORD_BOX_WEBHOOK_URL || ''
    if (!webhookUrl) {
      console.warn('未設定 Discord Webhook 網址，跳過發送並模擬成功')
    } else {
      const reporter = `${currentUser.value.code} [${currentUser.value.server}][${currentUser.value.school}][${currentUser.value.dept}]${currentUser.value.charId}`
      const title = `禮盒查詢 新禮盒 ${provideTitle.value}`
      
      const payload = {
        username: "RAN2 禮盒回報小助手",
        avatar_url: "https://ran2-toolkit.web.app/assets/logo.jpg",
        embeds: [{
          title: title,
          color: 13107455, // #c800ff
          fields: [
            { name: "👤 提供者", value: reporter, inline: false },
            { name: "📋 禮盒與管道內容", value: provideContent.value }
          ],
          timestamp: new Date().toISOString()
        }]
      }

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        throw new Error(`Discord Webhook 回傳錯誤: ${res.statusText}`)
      }
    }

    showProvideModal.value = false
    provideTitle.value = ''
    provideContent.value = ''
    alert('感謝您提供新禮盒資訊！我們會盡快審核上傳。')
  } catch (err) {
    console.error('提供資訊發送失敗:', err)
    alert('送出失敗：' + err.message)
  } finally {
    isActionLoading.value = false
  }
}

// 監聽路由與直達
watch(
  () => route.params.id,
  (newId) => {
    if (newId && boxes.value.length > 0) {
      const found = boxes.value.find(b => b.id === newId)
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
    if (newSearch && boxes.value.length > 0) {
      searchQuery.value = newSearch
      const found = boxes.value.find(b => b.name.includes(newSearch))
      if (found) {
        selectedBox.value = found
      }
    }
  },
  { immediate: true }
)

onMounted(() => {
  loadAllBoxes()
})
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
  min-height: 494px; /* 固定最小高度，避免跳動 */
}

.box-card {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 16px;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  border-left: 4px solid transparent;
  height: 86px; /* 固定高度 */
  min-height: 86px;
  max-height: 86px;
  box-sizing: border-box;
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
  width: 100%;
  overflow: hidden;
}

.box-card-title {
  font-size: 1rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.box-card-source {
  font-size: 0.85rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

/* --- 手機版搜尋框摺疊樣式 --- */
.filter-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  flex: 1;
  width: 100%;
}

.mobile-filter-toggle {
  display: none;
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

.stat-text {
  font-size: 0.95rem;
  font-weight: 600;
}

/* 最低機率高亮與 🔥 極稀有 */
.min-rate-highlight {
  color: #ff0055 !important;
  font-weight: 800;
  text-shadow: 0 0 8px rgba(255, 0, 85, 0.5);
}

.rare-fire-badge {
  background: linear-gradient(135deg, #ff0055, #ff5500);
  color: #fff;
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 6px;
  font-weight: 800;
  box-shadow: 0 0 8px rgba(255, 0, 85, 0.4);
  display: inline-block;
}

/* 備註 */
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

/* 🔢 分頁控制項樣式 */
.pagination-container {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 25px;
  padding: 12px 16px;
  background: rgba(13, 14, 19, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  backdrop-filter: blur(4px);
}

.page-btn {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #fff;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  transition: all 0.25s ease;
  min-width: 36px;
  display: inline-flex;
  justify-content: center;
  align-items: center;
}

.page-btn:hover:not(:disabled) {
  background: rgba(200, 0, 255, 0.08);
  border-color: var(--color-box);
  color: var(--color-box);
  box-shadow: 0 0 8px rgba(200, 0, 255, 0.2);
}

.page-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  background: transparent;
  border-color: rgba(255, 255, 255, 0.03);
}

.page-btn.active-page {
  background: rgba(200, 0, 255, 0.15);
  border-color: var(--color-box);
  color: var(--color-box);
  box-shadow: 0 0 10px rgba(200, 0, 255, 0.3);
  text-shadow: 0 0 5px rgba(200, 0, 255, 0.5);
}

.page-info {
  font-size: 0.8rem;
  color: var(--text-muted);
  width: 100%;
  text-align: center;
  margin-top: 6px;
}

/* 雙通道回報與提供新禮盒按鈕 */
.provide-btn {
  background: rgba(200, 0, 255, 0.05);
  border: 1px solid rgba(200, 0, 255, 0.3);
  color: #fff;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 700;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  transition: all 0.3s ease;
}

.provide-btn:hover:not(:disabled) {
  background: rgba(200, 0, 255, 0.15);
  border-color: var(--color-box);
  box-shadow: 0 0 12px rgba(200, 0, 255, 0.3);
  transform: translateY(-2px);
}

.provide-btn:disabled, .report-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

.report-btn {
  background: rgba(8, 9, 13, 0.8);
  border: 1px solid rgba(200, 0, 255, 0.3);
  color: #fff;
  padding: 8px 20px;
  border-radius: 6px;
  font-weight: 700;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.report-btn:hover:not(:disabled) {
  background: rgba(200, 0, 255, 0.1);
  border-color: var(--color-box);
  text-shadow: 0 0 8px var(--color-box);
  box-shadow: 0 0 15px rgba(200, 0, 255, 0.2);
  transform: translateY(-2px);
}

/* --- Modal 彈窗樣式 --- */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(6px);
  z-index: 2000;
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  width: 550px;
  max-width: 90%;
  max-height: 85vh;
  background: rgba(13, 15, 23, 0.95);
  border: 1px solid rgba(200, 0, 255, 0.25);
  padding: 24px;
  border-radius: 16px;
  position: relative;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8), 0 0 30px rgba(200, 0, 255, 0.1);
}

.modal-close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 1.5rem;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  transition: color 0.2s ease;
  z-index: 10;
}

.modal-close-btn:hover {
  color: #fff;
}

.modal-body {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
}

.input-group {
  margin-bottom: 20px;
  text-align: left;
}

.input-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.55);
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}

.modal-text-input {
  width: 100%;
  background: rgba(13, 14, 19, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: #ffffff;
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 0.95rem;
  font-family: inherit;
  line-height: 1.5;
  outline: none;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-sizing: border-box;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  resize: vertical;
}

.modal-text-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
  font-weight: 500;
}

.modal-text-input:hover {
  border-color: rgba(200, 0, 255, 0.45);
  background: rgba(18, 20, 27, 0.9);
}

.modal-text-input:focus {
  border-color: var(--color-box);
  background: rgba(10, 11, 15, 0.98);
  box-shadow: 0 0 12px rgba(200, 0, 255, 0.35), inset 0 2px 4px rgba(0, 0, 0, 0.6);
}

.modal-text-input[readonly] {
  background: rgba(255, 255, 255, 0.02) !important;
  border: 1px solid rgba(255, 255, 255, 0.06) !important;
  color: rgba(200, 0, 255, 0.75) !important;
  font-weight: 700;
  cursor: not-allowed;
  box-shadow: none !important;
  text-shadow: 0 0 5px rgba(200, 0, 255, 0.3);
}

.modal-read-only-box {
  font-size: 0.95rem;
  color: #ffffff;
  font-weight: 700;
  margin: 0;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
}

.modal-btn {
  background: rgba(8, 9, 13, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 8px 20px;
  border-radius: 6px;
  font-weight: 700;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.modal-btn.confirm {
  border-color: var(--color-box);
  background: rgba(200, 0, 255, 0.08);
  color: #fff;
  text-shadow: 0 0 8px var(--color-box);
  box-shadow: 0 0 10px rgba(200, 0, 255, 0.1);
}

.modal-btn.confirm:hover {
  background: rgba(200, 0, 255, 0.15);
  box-shadow: 0 0 15px rgba(200, 0, 255, 0.3);
  transform: translateY(-2px);
}

.modal-btn.cancel {
  border-color: rgba(255, 255, 255, 0.1);
  color: var(--text-muted);
}

.modal-btn.cancel:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.3);
  color: #fff;
  transform: translateY(-2px);
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

  .mobile-filter-toggle {
    display: block;
    width: 100%;
    padding: 10px;
    background: rgba(200, 0, 255, 0.1);
    border: 1px solid var(--color-box);
    border-radius: 8px;
    color: #fff;
    font-weight: 700;
    cursor: url('/assets/ran2-cursor.cur'), pointer;
    text-align: center;
    margin-bottom: 10px;
  }

  .filter-controls {
    display: none;
    flex-direction: column;
    width: 100%;
    gap: 10px;
  }

  .filter-controls.expanded {
    display: flex;
  }

  .search-input-wrapper {
    max-width: 100%;
  }

  .provide-btn {
    width: 100%;
  }
}
</style>

