import { initializeApp } from 'firebase/app';
import { getFirestore, doc, deleteDoc, setDoc } from 'firebase/firestore';

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

const taskIds = [
  'task-226a5b79',
  'task-22703966',
  'task-22966bd7',
  'task-22c2eec3'
];

console.log('準備從 Firestore 刪除指定的四筆任務...');

for (const id of taskIds) {
  try {
    await deleteDoc(doc(db, 'tasks', id));
    console.log(`成功刪除任務: ${id}`);
  } catch (err) {
    console.error(`刪除任務 ${id} 失敗:`, err);
  }
}

try {
  console.log('正在更新雲端任務最後更新時間中介資料...');
  await setDoc(doc(db, 'metadata', 'tasks'), { lastUpdated: Date.now() });
  console.log('雲端時間戳記更新成功！');
} catch (metaErr) {
  console.error('更新時間戳記中介資料失敗:', metaErr);
}

console.log('完成！');
process.exit(0);
