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
  title: "⚔️ 練功團系統全面重構、安全防禦升級與推播鏈路強化",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  content: `### ⚔️ 練功團系統 (Parties) 功能與體驗升級
- **全域推播鏈路打通**：修復切換至「任務指南」或「配點模擬器」時前台推播被丟棄的問題；現在瀏覽任何頁面皆可透過右上角電競風浮條與桌面彈窗即時掌握最新團訊。
- **發起人開團提醒**：補正開團前 10 分鐘通知機制，現在團長本人也能正常收到自己發起招募的即將出發提醒。
- **嚴格組團人數限制**：加入滿團（上限 8 人）自動防護阻斷，並統一以雲端名單長度推算人數，徹底終結雙軌資料漂移問題。
- **詳情頁功能補齊**：招募詳情頁新增團長專屬「🚫 取消並關閉招募」按鈕，方便發起人快速結案。
- **狀態保護與防重複彈窗**：解耦編輯招募時的狀態污染問題；開團前 10 分鐘通知記錄同步至會話儲存，按 F5 重新整理不再重複轟炸彈窗。

### 🛡️ 雲端安全防禦與背景排程優化
- **資料庫權限防護**：Firestore 安全性規則全面升級，封鎖客戶端硬刪除，並隔離隊員與團長欄位異動權限，杜絕竄改他人招募。
- **背景定時器容錯與清理**：GAS 排程器加入局部容錯隔離，單筆髒資料不再造成全站推播癱瘓；新增失效 FCM Token 自動移除機制，防止孤兒訂閱堆積。
- **查詢效能安全閥**：前端即時看板與後端排程皆配置 100 筆查詢上限，防止用量爆表與載入延遲。`
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
