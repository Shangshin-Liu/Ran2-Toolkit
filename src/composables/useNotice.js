import { ref, computed } from 'vue'
import { db } from '@/firebase.js'
import { collection, onSnapshot, addDoc } from 'firebase/firestore'

// LocalStorage key for storing dismissed top notice IDs
export const DISMISSED_TOP_IDS_KEY = 'ran2_dismissed_top_ids'
export const TOP_NOTICE_DISMISSED_KEY = DISMISSED_TOP_IDS_KEY

/**
 * 取得 LocalStorage 中已被關閉的置頂文章 ID 陣列
 * @returns {Array<string>}
 */
export function getDismissedTopIds() {
  try {
    const raw = localStorage.getItem(DISMISSED_TOP_IDS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    return []
  }
}

/**
 * 格式化時間為 YYMMDDHH (例如：2026/08/16 14:32:55 -> 26081614)
 * @param {string|Date} dateVal 
 * @returns {string}
 */
export function formatYYMMDDHH(dateVal) {
  if (!dateVal) return ''
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) return ''
  
  const yy = String(d.getFullYear()).slice(-2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  
  return `${yy}${mm}${dd}${hh}`
}

/**
 * 排序邏輯：top (true 優先) -> createdAt (越新越上) -> updatedAt (越新越上) -> id
 * @param {Array} list 
 * @returns {Array} 排序後的陣列副本
 */
export function sortNotices(list) {
  return [...list].sort((a, b) => {
    // 1. top: true 優先
    if (a.top !== b.top) {
      return a.top ? -1 : 1
    }
    // 2. createdAt: 越新越上 (降序)
    const timeA = new Date(a.createdAt).getTime() || 0
    const timeB = new Date(b.createdAt).getTime() || 0
    if (timeA !== timeB) {
      return timeB - timeA
    }
    // 3. updatedAt: 越新越上 (降序)
    const updateA = new Date(a.updatedAt).getTime() || 0
    const updateB = new Date(b.updatedAt).getTime() || 0
    if (updateA !== updateB) {
      return updateB - updateA
    }
    // 4. id: 字串比較
    return String(a.id).localeCompare(String(b.id))
  })
}

// 全局響應式狀態，方便全組件共享狀態
const notices = ref([])
const isLoadingNotices = ref(true)
const activeTab = ref('公告消息') // '公告消息' | '更新歷程'
const currentPage = ref(1)
const pageSize = ref(10)

const showListModal = ref(false)
const showDetailModal = ref(false)
const selectedNotice = ref(null)

const showTopNoticePopup = ref(false)

let unsubscribeNotices = null

/**
 * 初始化並訂閱 Firestore notices 集合
 */
export function initNoticeListener() {
  if (unsubscribeNotices) return
  try {
    isLoadingNotices.value = true
    const noticesRef = collection(db, 'notices')
    unsubscribeNotices = onSnapshot(noticesRef, (snapshot) => {
      const list = []
      snapshot.forEach(doc => {
        list.push({
          id: doc.id,
          ...doc.data()
        })
      })
      notices.value = list
      isLoadingNotices.value = false
    }, (err) => {
      console.warn('Firestore onSnapshot error for notices:', err)
      isLoadingNotices.value = false
    })
  } catch (err) {
    console.warn('Firestore setup error for notices:', err)
    isLoadingNotices.value = false
  }
}

/**
 * 一鍵播種初始資料至 Firestore notices 集合 (當資料庫為空時使用)
 * @param {Array} initialList 
 */
export async function seedInitialNotices(initialList) {
  if (!Array.isArray(initialList) || initialList.length === 0) return
  try {
    const noticesRef = collection(db, 'notices')
    for (const item of initialList) {
      const { id, ...data } = item
      await addDoc(noticesRef, data)
    }
  } catch (e) {
    console.error('播種初始公告資料至 Firestore 失敗:', e)
  }
}

export function useNotice() {
  // 自動啟動 Firestore 即時連線訂閱
  initNoticeListener()

  // 分類並排序後的全部列表
  const sortedAllNotices = computed(() => sortNotices(notices.value))

  // 依當前 Tab 過濾
  const filteredNotices = computed(() => {
    return sortedAllNotices.value.filter(n => n.type === activeTab.value)
  })

  // 總頁數
  const totalPages = computed(() => {
    return Math.ceil(filteredNotices.value.length / pageSize.value) || 1
  })

  // 當前頁面的 10 筆資料
  const paginatedNotices = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return filteredNotices.value.slice(start, start + pageSize.value)
  })

  // 置頂文章 (所有 top: true 的文章，依相同規則排序)
  const topNotices = computed(() => {
    return sortNotices(notices.value.filter(n => n.top === true))
  })

  // 尚未被忽略的置頂文章
  const unreadTopNotices = computed(() => {
    const dismissedIds = getDismissedTopIds()
    return topNotices.value.filter(n => !dismissedIds.includes(n.id))
  })

  // 切換 Tab
  const setTab = (type) => {
    activeTab.value = type
    currentPage.value = 1
  }

  // 分頁控制
  const setPage = (page) => {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page
    }
  }

  // 開啟列表 Modal
  const openNoticeList = (defaultTab = '公告消息') => {
    activeTab.value = defaultTab
    currentPage.value = 1
    showListModal.value = true
  }

  const closeNoticeList = () => {
    showListModal.value = false
  }

  // 開啟詳情 Modal
  const openNoticeDetail = (notice) => {
    selectedNotice.value = notice
    showDetailModal.value = true
  }

  const closeNoticeDetail = () => {
    showDetailModal.value = false
    selectedNotice.value = null
  }

  // 檢查並觸發首訪置頂公告彈窗：只要存在「未忽略」的置頂文章即彈出
  const checkAndShowTopNotices = () => {
    try {
      if (unreadTopNotices.value.length > 0) {
        showTopNoticePopup.value = true
      }
    } catch (e) {
      console.warn('localStorage error in checkAndShowTopNotices:', e)
    }
  }

  // 設定「不再顯示」並關閉彈窗：將當前所有 top: true 文章 ID 存入 localStorage
  const dismissTopNoticePermanently = () => {
    try {
      const dismissedIds = getDismissedTopIds()
      topNotices.value.forEach(n => {
        if (!dismissedIds.includes(n.id)) {
          dismissedIds.push(n.id)
        }
      })
      localStorage.setItem(DISMISSED_TOP_IDS_KEY, JSON.stringify(dismissedIds))
    } catch (e) {
      console.warn('localStorage error in dismissTopNoticePermanently:', e)
    }
    showTopNoticePopup.value = false
  }

  const closeTopNoticePopup = () => {
    showTopNoticePopup.value = false
  }

  return {
    notices,
    isLoadingNotices,
    activeTab,
    currentPage,
    pageSize,
    totalPages,
    filteredNotices,
    paginatedNotices,
    topNotices,
    unreadTopNotices,
    showListModal,
    showDetailModal,
    selectedNotice,
    showTopNoticePopup,
    setTab,
    setPage,
    openNoticeList,
    closeNoticeList,
    openNoticeDetail,
    closeNoticeDetail,
    checkAndShowTopNotices,
    dismissTopNoticePermanently,
    closeTopNoticePopup,
    formatYYMMDDHH,
    sortNotices,
    getDismissedTopIds,
    seedInitialNotices
  }
}
