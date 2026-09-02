import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

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
  const metaRef = doc(db, 'metadata', 'tasks');
  const now = Date.now();
  console.log(`Updating metadata/tasks lastUpdated to ${now} (${new Date(now).toISOString()})...`);
  
  await setDoc(metaRef, { lastUpdated: now }, { merge: true });

  const snap = await getDoc(metaRef);
  console.log("Updated metadata/tasks content:", snap.data());

  process.exit(0);
}

main().catch(err => {
  console.error("Error updating metadata:", err);
  process.exit(1);
});
