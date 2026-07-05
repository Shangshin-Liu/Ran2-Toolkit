import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, writeBatch } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Firebase 金鑰
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

const JSON_PATH = 'C:/Project/Ran2-Toolkit/skill-design-meta/ran2_all_skills.json';

const run = async () => {
  try {
    console.log('正在讀取 JSON 樣本檔案:', JSON_PATH);
    if (!fs.existsSync(JSON_PATH)) {
      throw new Error(`找不到樣本檔案: ${JSON_PATH}`);
    }

    const fileContent = fs.readFileSync(JSON_PATH, 'utf8');
    const skillTrees = JSON.parse(fileContent);

    if (!Array.isArray(skillTrees)) {
      throw new Error('JSON 格式有誤，預期為一個陣列');
    }

    console.log(`共讀取到 ${skillTrees.length} 個技能樹，準備上傳到 Firestore...`);

    const batch = writeBatch(db);

    skillTrees.forEach((tree) => {
      // 產生唯一的 document ID，例如：弓箭部_共通
      const docId = `${tree.job}_${tree.skill_tree}`;
      const docRef = doc(db, 'skills', docId);
      
      // 將資料寫入 batch
      batch.set(docRef, tree);
      console.log(` - 已排入 Batch: ${docId}`);
    });

    // 設定 metadata/skills 更新時間為現在
    const now = Date.now();
    const metaRef = doc(db, 'metadata', 'skills');
    batch.set(metaRef, { lastUpdated: now });
    console.log(` - 已排入 Metadata 更新: ${now}`);

    console.log('正在提交批次寫入 (Batch Commit)...');
    await batch.commit();

    console.log('🎉 上傳成功！Firestore 技能資料庫已更新為最新版本。');
    process.exit(0);
  } catch (err) {
    console.error('❌ 上傳失敗:', err);
    process.exit(1);
  }
};

run();
