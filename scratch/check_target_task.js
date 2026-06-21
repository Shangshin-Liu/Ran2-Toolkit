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

async function main() {
  const id = 'task-512021cf';
  const d = await getDoc(doc(db, 'tasks', id));
  if (d.exists()) {
    console.log(`找到任務 ${id}:`, d.data());
  } else {
    console.log(`任務 ${id} 不存在`);
  }

  // 順便檢查一下 metadata 的 tasks 與 boxes
  const metaTasks = await getDoc(doc(db, 'metadata', 'tasks'));
  const metaBoxes = await getDoc(doc(db, 'metadata', 'boxes'));
  console.log('metadata/tasks lastUpdated:', metaTasks.exists() ? metaTasks.data().lastUpdated : '無');
  console.log('metadata/boxes lastUpdated:', metaBoxes.exists() ? metaBoxes.data().lastUpdated : '無');
}

main();
