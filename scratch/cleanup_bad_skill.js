import { initializeApp } from 'firebase/app';
import { getFirestore, doc, deleteDoc } from 'firebase/firestore';

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

const run = async () => {
  try {
    const badDocRef = doc(db, 'skills', 'shinbow_str_019');
    await deleteDoc(badDocRef);
    console.log('🗑️ 成功從雲端 skills 集合中刪除錯誤的 document: shinbow_str_019');
    process.exit(0);
  } catch (err) {
    console.error('刪除失敗:', err);
    process.exit(1);
  }
};

run();
