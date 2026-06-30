import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

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

const dataDir = 'c:/Project/Ran2-Toolkit/src/assets/data';
const dataPath = path.join(dataDir, 'boxes.json');

async function download() {
  console.log("正在從 Firestore 讀取現有的禮盒資料...");
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const querySnapshot = await getDocs(collection(db, 'boxes'));
    const fetchedBoxes = [];
    querySnapshot.forEach((doc) => {
      fetchedBoxes.push(doc.data());
    });

    // 排序
    fetchedBoxes.sort((a, b) => {
      if (a.id && b.id) {
        return a.id.localeCompare(b.id);
      }
      return 0;
    });

    fs.writeFileSync(dataPath, JSON.stringify(fetchedBoxes, null, 2), 'utf-8');
    console.log(`成功下載 ${fetchedBoxes.length} 筆資料並寫入 ${dataPath}`);
  } catch (err) {
    console.error("下載失敗：", err);
  }
  process.exit(0);
}

download();
