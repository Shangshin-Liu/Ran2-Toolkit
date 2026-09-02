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
  console.log("Fetching tasks from Firestore...");
  const snap = await getDocs(collection(db, 'tasks'));
  console.log(`Total tasks found: ${snap.docs.length}`);

  const highStatsTasks = [];
  const allStatsPoints = [];

  snap.docs.forEach(doc => {
    const data = doc.data();
    const statsPoints = data.rewards?.statsPoints || 0;
    const taskName = data.name || data.customizedName || '(未命名任務)';
    
    if (statsPoints > 0) {
      allStatsPoints.push({
        id: doc.id,
        name: taskName,
        reqLevel: data.reqLevel || data.level || 0,
        category: data.category || '',
        statsPoints
      });
    }

    if (statsPoints > 10) {
      highStatsTasks.push({
        id: doc.id,
        name: taskName,
        reqLevel: data.reqLevel || data.level || 0,
        category: data.category || '',
        statsPoints
      });
    }
  });

  console.log("\n=== Tasks with statsPoints > 10 ===");
  if (highStatsTasks.length === 0) {
    console.log("None found!");
  } else {
    highStatsTasks.sort((a, b) => b.statsPoints - a.statsPoints);
    highStatsTasks.forEach(t => {
      console.log(`ID: ${t.id} | Name: ${t.name} | ReqLevel: ${t.reqLevel} | Category: ${t.category} | StatsPoints: ${t.statsPoints}`);
    });
  }

  console.log("\n=== Distribution of statsPoints ===");
  const counts = {};
  allStatsPoints.forEach(t => {
    counts[t.statsPoints] = (counts[t.statsPoints] || 0) + 1;
  });
  console.log(counts);

  process.exit(0);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
