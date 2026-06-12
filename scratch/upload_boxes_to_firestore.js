import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';

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

const dataPath = 'c:/Project/Ran2-Toolkit/src/assets/data/boxes.json';

if (!fs.existsSync(dataPath)) {
  console.error(`Error: File not found at ${dataPath}`);
  process.exit(1);
}

const boxes = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
console.log(`準備上傳 ${boxes.length} 筆禮盒到 Firestore...`);

for (let i = 0; i < boxes.length; i++) {
  const box = boxes[i];
  try {
    await setDoc(doc(db, 'boxes', box.id), box);
    console.log(`已成功上傳: ${box.name} (${box.id})`);
  } catch (err) {
    console.error(`上傳禮盒 ${box.id} (${box.name}) 失敗:`, err);
  }
}

try {
  console.log('正在更新雲端禮盒最後更新時間中介資料...');
  await setDoc(doc(db, 'metadata', 'boxes'), { lastUpdated: Date.now() });
  console.log('雲端時間戳記更新成功！');
} catch (metaErr) {
  console.error('更新時間戳記中介資料失敗:', metaErr);
}

console.log('禮盒上傳完成！');
process.exit(0);
