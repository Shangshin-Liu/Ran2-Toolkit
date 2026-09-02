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
  const ids = ['task-1f3d0779', 'task-29d8e74f', 'task-3a5ba3e4'];
  for (const id of ids) {
    const snap = await getDoc(doc(db, 'tasks', id));
    console.log(`=== Task ID: ${id} ===`);
    console.log(JSON.stringify(snap.data(), null, 2));
  }
  process.exit(0);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
