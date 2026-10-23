import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc 
} from 'firebase/firestore';

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

function parseNoticesYaml(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const items = [];
  const rawBlocks = fileContent.split(/\n(?=- type:)/);

  for (const block of rawBlocks) {
    if (!block.trim() || block.trim().startsWith('#')) continue;

    const typeMatch = block.match(/type:\s*"([^"]+)"/);
    const topMatch = block.match(/top:\s*(true|false)/);
    const titleMatch = block.match(/title:\s*"([^"]+)"/);
    const dateMatch = block.match(/createdAt:\s*"([^"]+)"/);
    const contentIdx = block.indexOf('content: |');

    if (typeMatch && titleMatch && dateMatch && contentIdx !== -1) {
      const type = typeMatch[1];
      const top = topMatch ? topMatch[1] === 'true' : false;
      const title = titleMatch[1];
      const createdAt = dateMatch[1];
      const rawContentLines = block.substring(contentIdx + 'content: |'.length).split('\n');
      
      // 移除前導縮排 4 個空白
      const content = rawContentLines
        .map(line => line.startsWith('    ') ? line.substring(4) : line)
        .join('\n')
        .trim();

      items.push({
        type,
        top,
        title,
        createdAt,
        content
      });
    }
  }

  return items;
}

async function main() {
  console.log("================= 讀取 backups/notices.yaml 並更新 Firebase Firestore =================");
  const yamlPath = path.join(__dirname, '../backups/notices.yaml');
  const allItems = parseNoticesYaml(yamlPath);

  const targetTitles = [
    "📢 新手操作導引上線！練功團、任務指南、配點模擬一看就會",
    "⚡ v2.9.0 新手操作導引上線：三大功能導覽、多圖輪播與點圖放大檢視"
  ];

  const targetItems = targetTitles.map(t => {
    const found = allItems.find(item => item.title === t);
    if (!found) {
      throw new Error(`在 YAML 中找不到指定公告: "${t}"`);
    }
    return found;
  });

  const noticesRef = collection(db, 'notices');

  // 1. 寫入兩筆新公告
  for (const item of targetItems) {
    const existingSnap = await getDocs(query(noticesRef, where('title', '==', item.title)));
    if (!existingSnap.empty) {
      console.log(`[跳過] 公告已存在: "${item.title}" (ID: ${existingSnap.docs[0].id})`);
      continue;
    }

    const docData = {
      type: item.type,
      top: item.top,
      title: item.title,
      createdAt: item.createdAt,
      content: item.content
    };

    const docRef = await addDoc(noticesRef, docData);
    console.log(`[新增成功] "${item.title}" (ID: ${docRef.id}, top: ${item.top}, createdAt: ${item.createdAt})`);
  }

  // 2. 更新舊公告 top 欄位為 false
  const oldNoticeTitle = "📢 任務指南全面改版！任務截圖自動辨識與進度追蹤新體驗上線";
  const oldNoticeSnap = await getDocs(query(noticesRef, where('title', '==', oldNoticeTitle)));

  if (oldNoticeSnap.empty) {
    console.warn(`[警告] 找不到舊公告: "${oldNoticeTitle}"`);
  } else {
    for (const oldDoc of oldNoticeSnap.docs) {
      const docRef = doc(db, 'notices', oldDoc.id);
      await updateDoc(docRef, { top: false });
      console.log(`[更新成功] 舊公告 top 已設為 false: "${oldNoticeTitle}" (ID: ${oldDoc.id})`);
    }
  }

  console.log("================= 操作完成 =================");
  process.exit(0);
}

main().catch(err => {
  console.error("執行失敗:", err);
  process.exit(1);
});
