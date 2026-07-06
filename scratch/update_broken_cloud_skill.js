import fs from 'fs'
import path from 'path'
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc, deleteDoc } from 'firebase/firestore'

// 1. 讀取並解析 .env.local 環境變數
const envPath = path.resolve(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const envConfig = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
  if (match) {
    const key = match[1]
    let value = match[2] ? match[2].trim() : ''
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)
    envConfig[key] = value
  }
})

// Firebase 配置
const firebaseConfig = {
  apiKey: envConfig.VITE_FIREBASE_API_KEY,
  authDomain: envConfig.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: envConfig.VITE_FIREBASE_PROJECT_ID,
  storageBucket: envConfig.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envConfig.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: envConfig.VITE_FIREBASE_APP_ID
}

// 2. 讀取並修改 local 的 ran2_all_skills.json
const jsonPath = path.resolve(process.cwd(), 'skill-design-meta/ran2_all_skills.json')
const rawData = fs.readFileSync(jsonPath, 'utf8')
const allSkills = JSON.parse(rawData)

// 尋找力弓破空穿雲 (shinbow_str_019) 及其所屬技能樹
const targetSkillId = 'shinbow_str_019'
let targetTree = null

for (const tree of allSkills) {
  const skill = tree.skills.find(s => s.skill_group_id === targetSkillId)
  if (skill) {
    targetTree = tree
    // 確保 local json 裡都已經是半形
    skill.levels.forEach(lv => {
      if (lv.learn_condition && lv.learn_condition.prerequisite) {
        const pre = lv.learn_condition.prerequisite
        if (pre.skill_name === '奧義：惡虎咆哮') {
          pre.skill_name = '奧義:惡虎咆哮'
        }
      }
    })
    break
  }
}

if (!targetTree) {
  console.error(`找不到技能: ${targetSkillId}`)
  process.exit(1)
}

console.log(`所屬技能樹 ID (Doc ID): ${targetTree.id}`)

// 寫回檔案 (確保 local 為最新)
fs.writeFileSync(jsonPath, JSON.stringify(allSkills, null, 2), 'utf8')
console.log(`成功更新 local JSON 檔案。`)

// 3. Firestore 更新作業
console.log('初始化 Firebase App...')
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

console.log('開始修復 Firestore 雲端資料庫...')

// A. 刪除格式錯誤且多餘的單一技能 document (shinbow_str_019)
const badDocRef = doc(db, 'skills', targetSkillId)
await deleteDoc(badDocRef)
console.log(`🗑️ 已成功從 skills 集合中刪除錯誤的 document: ${targetSkillId}`)

// B. 正確更新所屬技能樹 document (shinbow_str)
const treeDocRef = doc(db, 'skills', targetTree.id)
await setDoc(treeDocRef, targetTree)
console.log(`✅ 已成功將完整的技能樹 ${targetTree.skill_tree} (${targetTree.id}) 上傳至雲端 Firestore！`)

// C. 更新 metadata 中的 skills.lastUpdated
const metaDocRef = doc(db, 'metadata', 'skills')
const newUpdateTime = Date.now()
await setDoc(metaDocRef, { lastUpdated: newUpdateTime }, { merge: true })
console.log(`🔄 已更新 metadata/skills 的 lastUpdated 時間戳為: ${newUpdateTime}`)

console.log('🎉 雲端資料庫修復暨同步作業完全成功！')
process.exit(0)
