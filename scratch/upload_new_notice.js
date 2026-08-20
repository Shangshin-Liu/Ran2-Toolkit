import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCA4jc0LE5idc2Y9Ejeckq2pt6czMt12HA",
  authDomain: "ran2-toolkit.firebaseapp.com",
  projectId: "ran2-toolkit",
  storageBucket: "ran2-toolkit.firebasestorage.app",
  messagingSenderId: "415180332080",
  appId: "1:415180332080:web:8fe6cf9a47d620c608a1f5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const newNotice = {
  type: "更新歷程",
  top: false,
  title: "🛠️ 系統維護機制升級與動態雲端同步",
  createdAt: "2026-08-21T00:10:00Z",
  content: `### 系統服務與架構優化
- **雲端即時維護**：維護機制全面升級為雲端動態同步，系統維護狀態與提示公告改由雲端即時控管。
- **安全防護升級**：全站維護驗證導入 SHA-256 哈希加密機制，提升系統整體安全性。`
};

async function main() {
  console.log("================= 寫入公告至 Firebase Firestore 'notices' 集合 =================");
  const docRef = await addDoc(collection(db, 'notices'), newNotice);
  console.log(`成功新增公告！Doc ID: ${docRef.id}`);
}

main().catch(err => {
  console.error("寫入公告失敗:", err);
  process.exit(1);
});
