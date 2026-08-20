import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { createHash } from 'crypto';

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

// 計算 ran2admin 的 SHA-256 Hash
const rawPassword = 'ran2admin';
const hashPassword = createHash('sha256').update(rawPassword).digest('hex');

async function main() {
  console.log(`================= 更新 Firebase 維護解鎖密碼為 SHA-256 =================`);
  console.log(`原始密碼: ${rawPassword}`);
  console.log(`SHA-256 Hash: ${hashPassword}`);

  const docRef = doc(db, 'metadata', 'maintenance');
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    await updateDoc(docRef, { password: hashPassword });
    console.log("成功更新 Firebase metadata/maintenance 的 password 為 SHA-256 Hash！");
  } else {
    console.log("文件不存在，新建並更新...");
    await setDoc(docRef, { password: hashPassword }, { merge: true });
    console.log("成功寫入 SHA-256 Hash！");
  }
}

main().catch(err => {
  console.error("更新失敗:", err);
  process.exit(1);
});
