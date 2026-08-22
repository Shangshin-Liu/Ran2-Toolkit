import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  deleteDoc, 
  setDoc,
  getDoc
} from 'firebase/firestore';

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

const collectionsToDelete = ['shares', 'applications', 'shops', 'favorites', 'boxes'];

async function deleteCollection(collectionName) {
  console.log(`正在刪除 Firestore 集合: ${collectionName}...`);
  const colRef = collection(db, collectionName);
  const snapshot = await getDocs(colRef);
  
  if (snapshot.empty) {
    console.log(`集合 ${collectionName} 為空，無須清理。`);
    return;
  }

  let count = 0;
  for (const docItem of snapshot.docs) {
    await deleteDoc(doc(db, collectionName, docItem.id));
    count++;
  }
  console.log(`已從集合 ${collectionName} 刪除 ${count} 筆文件。`);
}

async function main() {
  console.log("================= 開始清理 Firebase Firestore 資料 =================");
  
  // 1. 刪除相關集合
  for (const col of collectionsToDelete) {
    await deleteCollection(col);
  }

  // 2. 刪除 metadata/boxes 文檔
  console.log("正在刪除 metadata/boxes 文檔...");
  try {
    await deleteDoc(doc(db, 'metadata', 'boxes'));
    console.log("已成功刪除 metadata/boxes 文檔。");
  } catch (err) {
    console.warn("刪除 metadata/boxes 失敗或不存在:", err.message);
  }

  // 3. 更新 metadata/maintenance
  console.log("正在更新 metadata/maintenance 文件設定...");
  const maintenanceRef = doc(db, 'metadata', 'maintenance');
  const maintSnap = await getDoc(maintenanceRef);
  let currentConfig = {};
  if (maintSnap.exists()) {
    currentConfig = maintSnap.data();
  }

  // 移除舊的 share 與 boxes 設定
  delete currentConfig.share;
  delete currentConfig.boxes;

  const maintenanceMessage = "原功能涉及複雜問題，已超出維護可行範圍，新功能尚在構思若有甚麼idea還贏透過首頁的「聯絡我們」分享你的想法";

  // 添加新的 function1 與 function2 設定
  currentConfig.function1 = {
    enabled: true,
    title: '此功能虛位以待',
    message: maintenanceMessage
  };
  currentConfig.function2 = {
    enabled: true,
    title: '此功能虛位以待',
    message: maintenanceMessage
  };

  await setDoc(maintenanceRef, currentConfig, { merge: false });
  console.log("已成功更新 metadata/maintenance 至 Firebase！");

  console.log("================= Firebase 清理作業全數完成 =================");
}

main().catch(err => {
  console.error("執行清理失敗:", err);
  process.exit(1);
});
