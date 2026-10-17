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
  title: "📊 全站流量統計累進加總升級與讀寫效能優化",
  createdAt: "2026-10-16T17:32:00Z",
  content: `### 網站流量統計 (Analytics) 架構與效能升級
- **累進加總欄位擴充**：於後端 Google Sheet 統計表保留每日日期與單日拜訪紀錄外，新增「累計總次數」欄位（Running Total），逐日同步記錄全站總人次成長軌跡。
- **極速查詢與倒序檢索**：將總瀏覽人次讀取機制由全表掃描加總優化為 \`O(1)\` 單一儲存格讀取，並改採由下往上倒序檢索當日紀錄，大幅縮短資料表增長後的回應耗時。
- **防併發寫入與請求精簡**：GAS 後端導入 \`LockService\` 腳本鎖防止多人同時進站產生計數覆寫；前端進站統計改由單次請求直接取回最新總人次，消除重複查詢之雙倍延遲。`
};

async function main() {
  console.log("================= 寫入公告至 Firebase Firestore 'notices' 集合 =================");
  const docRef = await addDoc(collection(db, 'notices'), newNotice);
  console.log(`成功新增公告！Doc ID: ${docRef.id}`);
  process.exit(0);
}

main().catch(err => {
  console.error("寫入公告失敗:", err);
  process.exit(1);
});
