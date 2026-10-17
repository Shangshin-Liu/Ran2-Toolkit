import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore'
import { db } from '@/firebase.js'
import {
  createProgressObject,
  parseProgressPayload,
} from '@/utils/taskLogic.js'

export const TASKS_CACHE_KEY = 'ran2_tasks_cache'
export const TASKS_LAST_UPDATED_KEY = 'ran2_tasks_last_updated'

/**
 * 解析本地快取的任務資料庫結構並驗證是否符合新版 meta-tasks 格式
 */
function parseCachedTasksPayload(rawCache) {
  if (!rawCache) return null
  try {
    const parsed = JSON.parse(rawCache)
    const tasks = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.tasks)
        ? parsed.tasks
        : null
    if (!tasks || tasks.length === 0) return null
    // 確保快取資料為新版結構（具備 statsPoints 與 skillPoints 數值欄位，排除舊版 719 筆任務快取）
    const first = tasks[0]
    if (!first || typeof first.id !== 'string' || typeof first.statsPoints !== 'number') {
      return null
    }
    return {
      tasks,
      version: String(parsed?.version || ''),
      total: Number(parsed?.total ?? tasks.length),
    }
  } catch {
    return null
  }
}

/**
 * Firebase Firestore 任務資料來源介面（含 metadata/tasks.lastUpdated 本地快取比對）
 * 當使用者進入任務指南時，僅讀取 1 筆 metadata/tasks 比對 lastUpdated：
 * - 若與本地 ran2_tasks_last_updated 相同且快取有效，直接回傳本地快取，不讀取雲端 169 筆任務文檔
 * - 若發現 lastUpdated 有異動或本地無快取，才一次性下載 tasks 集合並更新本地快取
 */
export const FirestoreTaskProvider = {
  name: 'firestore',
  async fetchMetaTasks() {
    let dbLastUpdated = 0
    let dbVersion = ''

    try {
      const metaSnap = await getDoc(doc(db, 'metadata', 'tasks'))
      if (metaSnap.exists()) {
        const metaData = metaSnap.data()
        dbLastUpdated = Number(metaData.lastUpdated || 0)
        dbVersion = String(metaData.version || '')
      }
    } catch (err) {
      console.warn('讀取 metadata/tasks 失敗，改為檢查本地快取或直接拉取雲端任務集合:', err)
    }

    const localLastUpdated = Number(localStorage.getItem(TASKS_LAST_UPDATED_KEY) || '0')
    const cachedPayload = parseCachedTasksPayload(localStorage.getItem(TASKS_CACHE_KEY))

    const isCacheFresh =
      cachedPayload &&
      ((dbLastUpdated > 0 && localLastUpdated === dbLastUpdated) ||
        (dbLastUpdated === 0 && localLastUpdated > 0))

    if (isCacheFresh) {
      const resolvedVersion = dbVersion || cachedPayload.version
      return {
        tasks: cachedPayload.tasks,
        version: resolvedVersion,
        total: cachedPayload.tasks.length,
      }
    }

    const querySnapshot = await getDocs(collection(db, 'tasks'))
    const tasks = []
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data()
      if (!data.id) {
        data.id = docSnap.id
      }
      tasks.push(data)
    })

    // 依 id 排序，確保與 backups/meta-tasks.json 原始資料順序一致
    tasks.sort((a, b) => String(a.id || '').localeCompare(String(b.id || ''), 'en', { numeric: true }))

    const finalVersion = dbVersion || cachedPayload?.version || ''
    const cacheToSave = {
      version: finalVersion,
      total: tasks.length,
      tasks,
    }

    try {
      localStorage.setItem(TASKS_CACHE_KEY, JSON.stringify(cacheToSave))
      localStorage.setItem(TASKS_LAST_UPDATED_KEY, String(dbLastUpdated || Date.now()))
    } catch (storageErr) {
      console.warn('寫入本地任務快取失敗:', storageErr)
    }

    return {
      tasks,
      version: finalVersion,
      total: tasks.length,
    }
  },
}

let activeTaskProvider = FirestoreTaskProvider

export function setTaskDataProvider(provider) {
  if (provider && typeof provider.fetchMetaTasks === 'function') {
    activeTaskProvider = provider
  }
}

export async function loadMetaTasks() {
  return activeTaskProvider.fetchMetaTasks()
}

/**
 * 雲端同步：上傳當前進度至 Firestore `completed_tasks/{userCode}`
 * 儲存結構與匯出/匯入 JSON 完全一致：{ version: string, done: string[] }，以 userCode 作為 Document Key
 */
export async function syncProgressToCloud(userCode, doneIds, dbVersion = '') {
  if (!userCode) {
    throw new Error('請先登入角色帳號！')
  }
  const payload = createProgressObject(doneIds, dbVersion)
  await setDoc(doc(db, 'completed_tasks', userCode), payload)
}

/**
 * 雲端同步：從 Firestore `completed_tasks/{userCode}` 拉取進度並檢查版本差異
 */
export async function fetchProgressFromCloud(userCode, indexes, currentDbVersion = '') {
  if (!userCode) {
    throw new Error('請先登入角色帳號！')
  }
  const docSnap = await getDoc(doc(db, 'completed_tasks', userCode))
  if (!docSnap.exists()) {
    return {
      exists: false,
      doneIds: [],
      versionMismatch: false,
      incomingVersion: null,
    }
  }
  const data = docSnap.data()
  const parsed = parseProgressPayload(data, indexes, currentDbVersion)
  return {
    exists: true,
    doneIds: parsed.doneIds,
    versionMismatch: parsed.versionMismatch,
    incomingVersion: parsed.incomingVersion,
  }
}
