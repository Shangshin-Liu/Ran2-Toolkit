import { ref, computed } from 'vue'
import { db } from '@/firebase.js'
import { doc, getDoc, setDoc, getDocs, collection, query, where } from 'firebase/firestore'

// 15個安全問題定義
export const SECURITY_QUESTIONS = [
  "", // 留空以讓 index 對應 1 ~ 15
  "你最喜歡的亂2職業是什麼？",
  "你第一隻創立的角色名字是什麼？",
  "就讀的小學名稱是什麼？",
  "你最喜歡的亂2武器或是裝備名稱是甚麼?",
  "你的第一隻寵物叫什麼名字？",
  "你最喜歡的食物是什麼？",
  "你最喜歡的電影是什麼？",
  "你最想去旅遊的城市是哪裡？",
  "你最喜歡的亂2招式名稱是甚麼?",
  "你童年最好的朋友是誰？",
  "你的第一台車子是什麼牌子？",
  "你最喜歡的一本書是什麼？",
  "你第一份工作的公司名稱是什麼？",
  "你在哪個城市出生？",
  "你最喜歡的運動是什麼？"
]

const SESSION_KEY = 'ran2_user_session'

// 計算 SHA-256 雜湊
export const sha256 = async (message) => {
  if (!message) return ''
  const msgBuffer = new TextEncoder().encode(message.trim())
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// 全域共享狀態
const currentUser = ref(null)
const isLoggedIn = computed(() => !!currentUser.value)

// 初始化狀態
const initAuth = () => {
  const session = localStorage.getItem(SESSION_KEY)
  if (session) {
    try {
      currentUser.value = JSON.parse(session)
    } catch (err) {
      console.error('解析登入狀態失敗:', err)
      localStorage.removeItem(SESSION_KEY)
    }
  }
}

// 執行初始化
initAuth()

export function useAuth() {
  
  // 註冊帳號
  const register = async ({ server, dept, charId, questionId, answer }) => {
    if (!server || !dept || !charId || !questionId || !answer) {
      throw new Error('請填寫所有必要資訊！')
    }

    const trimmedCharId = charId.trim()
    const trimmedAnswer = answer.trim()

    // 2. 呼叫 GAS 生成唯一識別碼 (在後端安全地計算，防止鹽值與生成演算法流出)
    const functionUrl = import.meta.env.VITE_GAS_FUNCTION_URL
    if (!functionUrl) {
      throw new Error('未設定 GAS 串接網址，無法生成識別碼')
    }

    const res = await fetch(functionUrl, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'generateUserCode',
        server,
        dept,
        charId: trimmedCharId
      })
    })

    const resJson = await res.json()
    if (!resJson.success || !resJson.code) {
      throw new Error(resJson.error || 'GAS 後端生成識別碼失敗！')
    }

    const code = resJson.code.toUpperCase()

    // 2. 檢查該唯一識別碼是否已被註冊 (相同的 server+dept+charId 算出的代碼永遠一致)
    const userDoc = await getDoc(doc(db, 'users', code))
    if (userDoc.exists()) {
      throw new Error(`伺服器「${server}」的「${dept}」中已存在角色「${trimmedCharId}」，不可重複註冊！`)
    }
    const codeHash = await sha256(code)
    const answerHash = await sha256(trimmedAnswer)

    // 3. 寫入 Firestore users 集合
    const userRef = doc(db, 'users', code)
    await setDoc(userRef, {
      server,
      dept,
      charId: trimmedCharId,
      questionId: Number(questionId),
      answerHash,
      createdAt: Date.now()
    })

    // 4. 寫入本地 Session 與更新狀態
    const sessionData = {
      code,
      server,
      dept,
      charId: trimmedCharId,
      codeHash
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData))
    currentUser.value = sessionData

    return code
  }

  // 登入帳號
  const login = async (code) => {
    if (!code || !code.trim()) {
      throw new Error('請輸入識別碼！')
    }
    const cleanCode = code.trim().toUpperCase()

    // 查詢 Firestore
    const userDoc = await getDoc(doc(db, 'users', cleanCode))
    if (!userDoc.exists()) {
      throw new Error('找不到此唯一識別碼，請確認是否輸入正確或重新註冊！')
    }

    const userData = userDoc.data()
    const codeHash = await sha256(cleanCode)

    const sessionData = {
      code: cleanCode,
      server: userData.server,
      dept: userData.dept,
      charId: userData.charId,
      codeHash
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData))
    currentUser.value = sessionData
    return sessionData
  }

  // 登出帳號
  const logout = () => {
    localStorage.removeItem(SESSION_KEY)
    currentUser.value = null
  }

  // 找回識別碼第一步：根據角色資訊獲取安全問題
  const getSecurityQuestion = async ({ server, dept, charId }) => {
    if (!server || !dept || !charId) {
      throw new Error('請填寫完整角色資訊！')
    }
    const trimmedCharId = charId.trim()

    // 1. 呼叫 GAS 計算出對應的唯一識別碼
    const functionUrl = import.meta.env.VITE_GAS_FUNCTION_URL
    if (!functionUrl) {
      throw new Error('未設定 GAS 串接網址，無法計算識別碼')
    }

    const res = await fetch(functionUrl, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'generateUserCode',
        server,
        dept,
        charId: trimmedCharId
      })
    })

    const resJson = await res.json()
    if (!resJson.success || !resJson.code) {
      throw new Error(resJson.error || 'GAS 後端計算識別碼失敗！')
    }

    const code = resJson.code.toUpperCase()

    // 2. 直接以識別碼向 Firestore 取得使用者資料
    const userDoc = await getDoc(doc(db, 'users', code))
    if (!userDoc.exists()) {
      throw new Error('找不到對應的角色資訊，請確認輸入是否有誤！')
    }

    const userData = userDoc.data()
    return {
      code, // 用於後續比對
      questionId: userData.questionId,
      questionText: SECURITY_QUESTIONS[userData.questionId] || '未知的安全問題'
    }
  }

  // 找回識別碼第二步：校驗回答，成功回傳 Code
  const verifyAnswer = async ({ code, answer }) => {
    if (!code || !answer) {
      throw new Error('資料不完整！')
    }

    const userDoc = await getDoc(doc(db, 'users', code))
    if (!userDoc.exists()) {
      throw new Error('資料異常，該用戶已不存在！')
    }

    const userData = userDoc.data()
    const inputAnswerHash = await sha256(answer.trim())

    if (inputAnswerHash === userData.answerHash) {
      return code // 答對，回傳 Code
    } else {
      throw new Error('回答錯誤！')
    }
  }

  return {
    currentUser,
    isLoggedIn,
    register,
    login,
    logout,
    getSecurityQuestion,
    verifyAnswer
  }
}
