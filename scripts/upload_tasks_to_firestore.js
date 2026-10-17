import { initializeApp } from 'firebase/app';
import { getFirestore, doc, writeBatch } from 'firebase/firestore';
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

const dataPath = path.join(__dirname, '../backups/meta-tasks.json');

if (!fs.existsSync(dataPath)) {
  console.error(`Error: File not found at ${dataPath}`);
  process.exit(1);
}

const run = async () => {
  try {
    const parsed = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    const tasks = Array.isArray(parsed) ? parsed : (parsed.tasks || []);
    const version = String(parsed.version || '');
    const total = Number(parsed.total ?? tasks.length);

    console.log(`準備從 backups/meta-tasks.json 上傳 ${tasks.length} 筆任務 (version: ${version}) 到 Firestore 'tasks' 集合...`);

    const batch = writeBatch(db);

    for (const task of tasks) {
      const taskRef = doc(db, 'tasks', task.id);
      batch.set(taskRef, task);
    }

    const now = Date.now();
    const metaRef = doc(db, 'metadata', 'tasks');
    batch.set(metaRef, {
      lastUpdated: now,
      version,
      total
    });

    console.log('正在提交批次寫入 (Batch Commit)...');
    await batch.commit();

    console.log(`✅ 成功上傳 ${tasks.length} 筆任務至 'tasks' 集合！`);
    console.log(`✅ 已更新 'metadata/tasks' -> { lastUpdated: ${now}, version: "${version}", total: ${total} }`);
    process.exit(0);
  } catch (err) {
    console.error('❌ 上傳任務或更新 metadata 失敗:', err);
    process.exit(1);
  }
};

run();
