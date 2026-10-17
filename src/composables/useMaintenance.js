import { ref } from 'vue'
import { db } from '@/firebase.js'
import { doc, onSnapshot } from 'firebase/firestore'
import { maintenanceConfig as defaultConfig } from '@/config/maintenance.js'

const STORAGE_KEY = 'ran2_maintenance_bypassed'

// 判斷是否為純本地開發模式 (npm run dev，且非單元測試環境)
const isLocalDev = Boolean(
  import.meta.env.DEV &&
  !import.meta.env.VITEST &&
  import.meta.env.MODE !== 'test'
)

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
    // 若在本地 dev 模式運作，直接使用 src/config/maintenance.js 設定，不連線 Firestore 覆蓋
    if (isLocalDev) {
      maintenanceState.value = { ...defaultConfig }
      isLoaded.value = true
      return Promise.resolve(maintenanceState.value)
    }

    if (initPromise) return initPromise

    initPromise = new Promise((resolve) => {
      try {
        const docRef = doc(db, 'metadata', 'maintenance')
        unsubscribe = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const raw = docSnap.data()
            const merged = {
              ...defaultConfig,
              ...raw
            }
            for (const key of Object.keys(defaultConfig)) {
              if (key !== 'password' && raw[key] && typeof raw[key] === 'object') {
                merged[key] = {
                  ...defaultConfig[key],
                  ...raw[key]
                }
              }
            }
            maintenanceState.value = merged
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

  const getBlockingFeature = (path, config = maintenanceState.value, bypassed = isBypassed.value) => {
    if (bypassed) return null
    const cfg = config || {}
    if (cfg.home && cfg.home.enabled) return 'home'
    if (path.startsWith('/tasks') && cfg.tasks && cfg.tasks.enabled) return 'tasks'
    if (path.startsWith('/simulator') && cfg.simulator && cfg.simulator.enabled) return 'simulator'
    if (path.startsWith('/function2') && cfg.function2 && cfg.function2.enabled) return 'function2'
    if (path.startsWith('/parties') && cfg.parties && cfg.parties.enabled) return 'parties'
    if (path.startsWith('/function1') && cfg.function1 && cfg.function1.enabled) return 'function1'
    return null
  }

  return {
    maintenanceState,
    isLoaded,
    isBypassed,
    initMaintenance,
    verifyPassword,
    unlockMaintenance,
    lockMaintenance,
    getMaintenanceInfo,
    getBlockingFeature
  }
}
