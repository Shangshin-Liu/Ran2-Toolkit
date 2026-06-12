import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

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

const localPath = 'c:/Project/Ran2-Toolkit/raw-data/tasks/official-task-data.json';

// 1. 取得舊版的內容 (HEAD)
let headTasks = [];
try {
  const headJson = execSync('git show HEAD:raw-data/tasks/official-task-data.json', { maxBuffer: 10 * 1024 * 1024 }).toString();
  headTasks = JSON.parse(headJson);
} catch (err) {
  console.error('無法讀取 HEAD 版本，可能是未提交過。將預設為全部比對。', err);
}

// 2. 讀取本地新版內容
const localTasks = JSON.parse(fs.readFileSync(localPath, 'utf-8'));

// 3. 比對差異
const headMap = new Map(headTasks.map(t => [t.id, t]));
const diffTasks = [];

for (const task of localTasks) {
  const headTask = headMap.get(task.id);
  if (!headTask) {
    // 新增的任務
    diffTasks.push(task);
  } else {
    // 比對 JSON 內容是否相同
    const localStr = JSON.stringify(task);
    const headStr = JSON.stringify(headTask);
    if (localStr !== headStr) {
      diffTasks.push(task);
    }
  }
}

console.log(`比對完成！共發現 ${diffTasks.length} 筆任務有差異。`);

if (diffTasks.length > 0) {
  console.log('開始更新差異任務到 Firestore...');
  for (let i = 0; i < diffTasks.length; i++) {
    const task = diffTasks[i];
    try {
      await setDoc(doc(db, 'tasks', task.id), task);
      console.log(`[${i+1}/${diffTasks.length}] 已更新: ${task.name} (${task.id})`);
    } catch (err) {
      console.error(`更新任務 ${task.name} (${task.id}) 失敗:`, err);
    }
  }
  console.log('差異更新上傳完成！');
} else {
  console.log('無任何資料差異，無須更新。');
}

process.exit(0);
