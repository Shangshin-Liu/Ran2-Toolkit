import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore'
import { db } from '@/firebase.js'
import {
  createProgressObject,
  parseProgressPayload,
} from '@/utils/taskLogic.js'

/**
 * 任務資料來源介面 (Task Data Provider Interface)
 * 目前預設使用 PublicJsonTaskProvider (fetch '/meta-tasks.json')，
 * 未來將 meta-tasks.json 上傳至 Firestore 後，只需將 activeTaskProvider 切換為 FirestoreTaskProvider 即可。
 */
export const PublicJsonTaskProvider = {
  name: 'public-json',
  async fetchMetaTasks() {
    const res = await fetch('/meta-tasks.json')
    if (!res.ok) {
      throw new Error(`讀取 /meta-tasks.json 失敗 (HTTP ${res.status})`)
    }
    const data = await res.json()
    return {
      tasks: Array.isArray(data?.tasks) ? data.tasks : [],
      version: String(data?.version || data?.exportedAt || ''),
      total: data?.total ?? (Array.isArray(data?.tasks) ? data.tasks.length : 0),
    }
  },
}

/**
 * 預留之 Firebase Firestore 任務資料來源介面
 */
export const FirestoreTaskProvider = {
  name: 'firestore',
  async fetchMetaTasks() {
    let dbVersion = ''
    try {
      const metaSnap = await getDoc(doc(db, 'metadata', 'tasks'))
      if (metaSnap.exists()) {
        const metaData = metaSnap.data()
        dbVersion = String(metaData.version || metaData.lastUpdated || '')
      }
    } catch (err) {
      console.warn('讀取 metadata/tasks 失敗，直接拉取雲端任務集合:', err)
    }

    const querySnapshot = await getDocs(collection(db, 'tasks'))
    const tasks = []
    querySnapshot.forEach((docSnap) => {
      tasks.push(docSnap.data())
    })

    return {
      tasks,
      version: dbVersion,
      total: tasks.length,
    }
  },
}

let activeTaskProvider = PublicJsonTaskProvider

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
