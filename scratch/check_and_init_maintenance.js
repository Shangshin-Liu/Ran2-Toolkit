import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

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

const defaultMaintenance = {
  password: 'ran2admin', // 預設維護解鎖密碼
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
};

async function main() {
  console.log("================= 檢查 Firebase metadata/maintenance =================");
  const docRef = doc(db, 'metadata', 'maintenance');
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    console.log("現有 Firebase 資料庫中的 maintenance 資料：", docSnap.data());
  } else {
    console.log("Firebase 資料庫中無 maintenance 資料，正在寫入預設維護設定...");
    await setDoc(docRef, defaultMaintenance);
    console.log("成功寫入預設維護設定至 metadata/maintenance！");
  }
}

main().catch(err => {
  console.error("執行失敗:", err);
  process.exit(1);
});
