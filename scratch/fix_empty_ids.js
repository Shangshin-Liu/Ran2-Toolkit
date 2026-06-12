import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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

const dataPath = 'c:/Project/Ran2-Toolkit/raw-data/tasks/official-task-data.json';
const tasks = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

let fixedCount = 0;
const fixedTasks = tasks.map(t => {
  if (!t.id || !t.id.trim()) {
    const hash = crypto.createHash('md5').update(t.name).digest('hex').substring(0, 8);
    t.id = `task-${hash}`;
    fixedCount++;
    console.log(`已為「${t.name}」生成 ID: ${t.id}`);
  }
  return t;
});

if (fixedCount > 0) {
  fs.writeFileSync(dataPath, JSON.stringify(fixedTasks, null, 2), 'utf-8');
  console.log(`已將修復後的 ${fixedCount} 筆任務寫回 ${dataPath}`);
  
  const emptyIdTasks = fixedTasks.filter(t => t.id.startsWith('task-') && (
    t.name === '議會的委託' ||
    t.name === '深入死牢' ||
    t.name === '號克百人斬!!' ||
    t.name === '更難突破的虛空要塞'
  ));
  
  console.log(`開始上傳這 ${emptyIdTasks.length} 筆修復的任務...`);
  for (const task of emptyIdTasks) {
    await setDoc(doc(db, 'tasks', task.id), task);
    console.log(`已上傳: ${task.name} (${task.id})`);
  }
  console.log('修復上傳完成！');
} else {
  console.log('沒有需要修復的任務。');
}

process.exit(0);
