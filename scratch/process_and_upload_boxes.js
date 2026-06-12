import fs from 'fs';
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

const dataPath = 'c:/Project/Ran2-Toolkit/src/assets/data/boxes.json';

if (!fs.existsSync(dataPath)) {
  console.error(`找不到禮盒資料檔案：${dataPath}`);
  process.exit(1);
}

const boxes = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
console.log(`讀取到 ${boxes.length} 筆禮盒資料。`);

// 1. 檢查 name 是否有重複
const names = boxes.map(b => b.name);
const uniqueNames = new Set(names);

if (uniqueNames.size !== names.length) {
  console.error("錯誤：boxes.json 中的 name 存在重複項目！");
  // 找出重複的項目
  const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
  console.error("重複的名稱：", duplicates);
  process.exit(1);
}

console.log("檢查通過：沒有重複的 name。");

// 2. 根據規則將 id 填上
const processedBoxes = boxes.map(box => {
  const hash = crypto.createHash('md5').update(box.name).digest('hex').substring(0, 8);
  box.id = `box-${hash}`;
  console.log(`生成 ID：${box.name} -> ${box.id}`);
  return box;
});

// 3. 寫回本地檔案
fs.writeFileSync(dataPath, JSON.stringify(processedBoxes, null, 2), 'utf-8');
console.log(`已更新本地檔案：${dataPath}`);

// 4. 上傳到 Firestore
console.log("正在上傳至 Firestore boxes 集合...");
for (const box of processedBoxes) {
  try {
    await setDoc(doc(db, 'boxes', box.id), box);
    console.log(`成功上傳：${box.name} (${box.id})`);
  } catch (err) {
    console.error(`上傳失敗 ${box.id}：`, err);
  }
}

// 5. 更新雲端時間戳記
try {
  console.log("更新中介時間戳記...");
  await setDoc(doc(db, 'metadata', 'boxes'), { lastUpdated: Date.now() });
  console.log("雲端時間戳記更新成功！");
} catch (metaErr) {
  console.error("更新時間戳記失敗：", metaErr);
}

console.log("所有作業已完成！");
process.exit(0);
