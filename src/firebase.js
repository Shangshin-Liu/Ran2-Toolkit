import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getMessaging } from 'firebase/messaging'

// 使用 Vite 的環境變數讀取 Firebase 金鑰，避免將金鑰寫死在程式碼中提交進 Git
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'YOUR_API_KEY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'YOUR_AUTH_DOMAIN',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'ran2-toolkit',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'YOUR_STORAGE_BUCKET',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'YOUR_MESSAGING_SENDER_ID',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'YOUR_APP_ID'
}
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

let messaging = null
try {
  messaging = getMessaging(app)
} catch (err) {
  console.warn('Firebase Messaging is not supported in this environment:', err.message)
}

export { db, messaging }
