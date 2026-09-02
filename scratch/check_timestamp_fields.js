import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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
  const snap = await getDocs(collection(db, 'tasks'));
  const allKeys = new Set();
  snap.docs.forEach(doc => {
    Object.keys(doc.data()).forEach(k => allKeys.add(k));
  });
  console.log("All task document root fields:", Array.from(allKeys));
  
  // Check sample documents with timestamp fields
  const samples = [];
  snap.docs.slice(0, 10).forEach(doc => {
    const d = doc.data();
    samples.push({ id: doc.id, updatedAt: d.updatedAt, timestamp: d.timestamp, updated_at: d.updated_at, lastModified: d.lastModified });
  });
  console.log("Sample task timestamps:", samples);

  process.exit(0);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
