import { ref } from 'vue'
import { db } from '@/firebase.js'
import { doc, onSnapshot } from 'firebase/firestore'

const STORAGE_KEY = 'ran2_maintenance_bypassed'

// 預設維護設定 (用於 Firestore 載入失敗或無資料時的後備 fallback)
const defaultConfig = {
  password: 'ran2admin',
  home: {
    enabled: false,
    title: '網站系統維護中',
    message: '亂2萬事通正在進行核心資料優化與安全升級，我們將盡快恢復服務，感謝您的耐心等待。'
  },
  tasks: {
    enabled: false,
    title: '任務指南維護中',
    message: '任務資料庫目前正進行資料結構優化與最新官方任務同步調整。'
  },
  simulator: {
    enabled: false,
    title: '配點模擬維護中',
    message: '配點模擬功能目前正處於設計與規劃階段，敬請期待最新功能釋出！'
  },
  boxes: {
    enabled: true,
    title: '禮盒查詢維護中',
    message: '資料欠缺太多，工程師正在努力整理 😭'
  },
  parties: {
    enabled: false,
    title: '組隊招募系統維護中',
    message: '組隊招募與討論板塊正在進行架構最佳化以提供更快速的反應時間。'
  },
  share: {
    enabled: true,
    title: '好物交易板暫時關閉',
    message: '等待法律諮詢後推出!!'
  }
}

// 共享單例響應式狀態
const maintenanceState = ref({ ...defaultConfig })
const isLoaded = ref(false)
const isBypassed = ref(typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === 'true')

let unsubscribe = null
let initPromise = null

/**
 * 計算字串之 SHA-256 Hash 值 (十六進位小寫)
 * @param {string} str 
 * @returns {Promise<string>}
 */
export async function sha256(str) {
  if (!str) return ''
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    return str.trim()
  }
  const msgBuffer = new TextEncoder().encode(str.trim())
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export function useMaintenance() {
  const initMaintenance = () => {
    if (initPromise) return initPromise

    initPromise = new Promise((resolve) => {
      try {
        const docRef = doc(db, 'metadata', 'maintenance')
        unsubscribe = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            maintenanceState.value = {
              ...defaultConfig,
              ...docSnap.data()
            }
          }
          isLoaded.value = true
          resolve(maintenanceState.value)
        }, (err) => {
          console.warn('載入 Firebase 維護設定失敗，使用預設設定:', err)
          isLoaded.value = true
          resolve(maintenanceState.value)
        })
      } catch (err) {
        console.warn('初始化 Firebase 維護設定異常:', err)
        isLoaded.value = true
        resolve(maintenanceState.value)
      }

      // 2 秒網路保護機制
      setTimeout(() => {
        if (!isLoaded.value) {
          isLoaded.value = true
          resolve(maintenanceState.value)
        }
      }, 2000)
    })

    return initPromise
  }

  const verifyPassword = async (inputPassword) => {
    if (!inputPassword) return false
    const inputHash = await sha256(inputPassword)
    const rawInput = inputPassword.trim()
    const target = String(maintenanceState.value.password || 'ran2admin').trim().toLowerCase()
    
    // 支援 SHA-256 比對，並同時向上相容舊版明文設定
    return inputHash === target || rawInput.toLowerCase() === target
  }

  const unlockMaintenance = () => {
    isBypassed.value = true
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, 'true')
      }
    } catch (e) {
      console.warn('無法寫入 localStorage:', e)
    }
  }

  const lockMaintenance = () => {
    isBypassed.value = false
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch (e) {
      console.warn('無法移除 localStorage:', e)
    }
  }

  const getMaintenanceInfo = (featureKey) => {
    const key = featureKey || 'home'
    return maintenanceState.value[key] || maintenanceState.value.home || defaultConfig.home
  }

  return {
    maintenanceState,
    isLoaded,
    isBypassed,
    initMaintenance,
    verifyPassword,
    unlockMaintenance,
    lockMaintenance,
    getMaintenanceInfo
  }
}
