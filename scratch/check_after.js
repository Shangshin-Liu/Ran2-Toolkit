import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

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

const boxesToCheck = [
  'box-e1862fb8', // 練功禮盒(7D)LV.130
  'box-e2fed5a8', // 練功禮盒(7D)LV.140
  'box-2fab89bd', // 高等練功禮盒(7D)LV.170
  'box-bc6a580f', // 高等練功禮盒(7D)LV.180
  'box-b69c9106'  // 高等練功禮盒(7D)LV.190
];

async function main() {
  console.log("================= 驗證任務刪除 =================");
  const taskId = 'task-512021cf';
  const taskSnap = await getDoc(doc(db, 'tasks', taskId));
  console.log(`任務 ${taskId} 存在狀況: ${taskSnap.exists()}`);

  console.log("================= 驗證禮盒寫入 =================");
  for (const id of boxesToCheck) {
    const boxSnap = await getDoc(doc(db, 'boxes', id));
    if (boxSnap.exists()) {
      const data = boxSnap.data();
      console.log(`禮盒 ${id} 存在!`);
      console.log(`  名稱: ${data.name}`);
      console.log(`  來源: ${JSON.stringify(data.sourceType)}`);
      console.log(`  獲取方式: ${JSON.stringify(data.obtains)}`);
      console.log(`  內容物 (${data.items.length}項):`);
      data.items.forEach(item => {
        console.log(`    - ${item.name} (rate: ${item.rate}%)`);
      });
    } else {
      console.log(`禮盒 ${id} 不存在!!!`);
    }
  }

  console.log("================= 驗證更新時間 =================");
  const metaTasks = await getDoc(doc(db, 'metadata', 'tasks'));
  const metaBoxes = await getDoc(doc(db, 'metadata', 'boxes'));
  console.log('metadata/tasks lastUpdated:', metaTasks.exists() ? metaTasks.data().lastUpdated : '無');
  console.log('metadata/boxes lastUpdated:', metaBoxes.exists() ? metaBoxes.data().lastUpdated : '無');
}

main();
