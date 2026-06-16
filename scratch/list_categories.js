import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

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
  const q = query(collection(db, 'tasks'), where('isQc10726', '==', true));
  const snap = await getDocs(q);

  const categories = new Set();
  snap.docs.forEach(doc => {
    const data = doc.data();
    if (data.qc10726 && data.qc10726.category) {
      categories.add(data.qc10726.category);
    }
  });

  console.log("目前的不要有名字大分類：", Array.from(categories));
}

main();
