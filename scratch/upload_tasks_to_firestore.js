import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

const dataPath = path.join(__dirname, '../raw-data/tasks/official-task-data.json');

if (!fs.existsSync(dataPath)) {
  console.error(`Error: File not found at ${dataPath}`);
  process.exit(1);
}

const tasks = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
console.log(`準備上傳 ${tasks.length} 筆任務到 Firestore...`);

for (let i = 0; i < tasks.length; i++) {
  const task = tasks[i];
  try {
    await setDoc(doc(db, 'tasks', task.id), task);
    if (i % 100 === 0 || i === tasks.length - 1) {
      console.log(`已成功上傳 ${i} / ${tasks.length} 筆任務...`);
    }
  } catch (err) {
    console.error(`上傳任務 ${task.id} (${task.name}) 失敗:`, err);
  }
}

try {
  console.log('正在更新雲端任務最後更新時間中介資料...');
  await setDoc(doc(db, 'metadata', 'tasks'), { lastUpdated: Date.now() });
  console.log('雲端時間戳記更新成功！');
} catch (metaErr) {
  console.error('更新時間戳記中介資料失敗:', metaErr);
}

console.log('上傳完成！');
process.exit(0);
