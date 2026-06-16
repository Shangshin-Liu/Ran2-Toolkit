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
  const ids = [
    'task-3386ac2e',
    'task-5d21ff15',
    'task-5d221009',
    'task-5744cc64',
    'task-2776bf10'
  ];

  for(const id of ids) {
    const d = await getDoc(doc(db, 'tasks', id));
    if(d.exists()) {
      console.log(id, "-> Name:", d.data().name, "| CustomizedName:", d.data().customizedName);
    } else {
      console.log(id, "不存在");
    }
  }
}

main();
