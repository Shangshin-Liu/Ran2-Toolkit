import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore';

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
  const taskId = 'task-1f3d0779';
  const taskRef = doc(db, 'tasks', taskId);

  console.log(`Updating ${taskId} rewards.statsPoints to 0...`);
  await updateDoc(taskRef, {
    'rewards.statsPoints': 0
  });

  const updatedSnap = await getDoc(taskRef);
  console.log('Updated document content:');
  console.log(JSON.stringify(updatedSnap.data(), null, 2));

  process.exit(0);
}

main().catch(err => {
  console.error('Error updating task:', err);
  process.exit(1);
});
