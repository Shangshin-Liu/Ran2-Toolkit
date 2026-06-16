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
  snap.docs.forEach(doc => {
    const d = doc.data();
    if (d.name && (d.name.includes("打倒冰凍可滷") || d.name.includes("冰凍可滷"))) {
      console.log("Found:", doc.id, "| Name:", d.name, "| CustomizedName:", d.customizedName);
    }
  });
}

main();
