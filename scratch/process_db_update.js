import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import crypto from 'crypto';

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

const newBoxesData = [
  {
    name: "練功禮盒(7D)LV.130",
    sourceType: ["任務獎勵"],
    obtains: ["完成任務【怒殺野鴛鴦】"],
    items: [
      { name: "歸魂修煉念珠(2倍)(3D)" },
      { name: "財團附屬停車場D禮盒x2" },
      { name: "磨石x2" },
      { name: "護貝劑x2" },
      { name: "異界磨石x2" },
      { name: "高級護貝劑x2" }
    ]
  },
  {
    name: "練功禮盒(7D)LV.140",
    sourceType: ["任務獎勵"],
    obtains: ["完成任務【隱隱騷動之聲】"],
    items: [
      { name: "歸魂修煉念珠(2倍)(3D)" },
      { name: "財團附屬停車場D禮盒x2" },
      { name: "磨石x2" },
      { name: "護貝劑x2" },
      { name: "異界磨石x2" },
      { name: "高級護貝劑x2" }
    ]
  },
  {
    name: "高等練功禮盒(7D)LV.170",
    sourceType: ["任務獎勵"],
    obtains: ["完成任務【詭異的異變人種】"],
    items: [
      { name: "歸魂修煉念珠(2倍)(3D)" },
      { name: "超自然研究中心3F進入證(1H)x14" },
      { name: "磨石x2" },
      { name: "護貝劑x2" },
      { name: "異界磨石x3" },
      { name: "高級護貝劑x3" }
    ]
  },
  {
    name: "高等練功禮盒(7D)LV.180",
    sourceType: ["任務獎勵"],
    obtains: ["完成任務【阻止異變加劇】"],
    items: [
      { name: "歸魂修煉念珠(2倍)(3D)" },
      { name: "超自然研究中心3F進入證(1H)x14" },
      { name: "磨石x2" },
      { name: "護貝劑x2" },
      { name: "異界磨石x3" },
      { name: "高級護貝劑x3" }
    ]
  },
  {
    name: "高等練功禮盒(7D)LV.190",
    sourceType: ["任務獎勵"],
    obtains: ["完成任務【異界虎令的毒惡深淵】"],
    items: [
      { name: "歸魂修煉念珠(2倍)(3D)" },
      { name: "超自然研究中心3F進入證(1H)x14" },
      { name: "磨石x2" },
      { name: "護貝劑x2" },
      { name: "異界磨石x3" },
      { name: "高級護貝劑x3" }
    ]
  }
];

async function run() {
  console.log("================= 1. 刪除指定的任務 (task-512021cf) =================");
  const taskId = "task-512021cf";
  try {
    const docRef = doc(db, 'tasks', taskId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      console.log(`即將刪除任務: ${taskId} - ${docSnap.data().name}`);
      await deleteDoc(docRef);
      console.log(`成功刪除任務: ${taskId}`);
    } else {
      console.log(`警告: 任務 ${taskId} 不存在，跳過刪除`);
    }
  } catch (err) {
    console.error(`刪除任務 ${taskId} 失敗:`, err);
  }

  console.log("\n================= 2. 更新任務 metadata =================");
  try {
    await setDoc(doc(db, 'metadata', 'tasks'), { lastUpdated: Date.now() });
    console.log("成功更新 tasks metadata 的 lastUpdated");
  } catch (err) {
    console.error("更新 tasks metadata 失敗:", err);
  }

  console.log("\n================= 3. 處理並寫入 boxes 到 Firestore =================");
  const processedBoxes = newBoxesData.map(box => {
    // 依據名稱計算 md5
    const hash = crypto.createHash('md5').update(box.name).digest('hex').substring(0, 8);
    const id = `box-${hash}`;
    
    // 轉換 items (若 rate 未提供則填入 100)
    const items = box.items.map(item => {
      return {
        name: item.name,
        rate: item.rate !== undefined ? item.rate : 100
      };
    });

    return {
      id,
      name: box.name,
      sourceType: box.sourceType,
      obtains: box.obtains,
      items,
      note: "" // 預設空字串
    };
  });

  for (const box of processedBoxes) {
    try {
      console.log(`即將寫入禮盒: ${box.name} (id: ${box.id})`);
      await setDoc(doc(db, 'boxes', box.id), box);
      console.log(`成功寫入禮盒: ${box.id}`);
    } catch (err) {
      console.error(`寫入禮盒 ${box.name} (${box.id}) 失敗:`, err);
    }
  }

  console.log("\n================= 4. 更新禮盒 metadata =================");
  try {
    await setDoc(doc(db, 'metadata', 'boxes'), { lastUpdated: Date.now() });
    console.log("成功更新 boxes metadata 的 lastUpdated");
  } catch (err) {
    console.error("更新 boxes metadata 失敗:", err);
  }

  console.log("\n================= 5. 驗證更新後結果 =================");
  try {
    const taskSnap = await getDoc(doc(db, 'tasks', taskId));
    console.log(`驗證: 任務 ${taskId} 存在狀況 => ${taskSnap.exists()}`);
    
    for (const box of processedBoxes) {
      const boxSnap = await getDoc(doc(db, 'boxes', box.id));
      if (boxSnap.exists()) {
        console.log(`驗證: 禮盒 ${box.id} 存在狀況 => 存在 (名稱: ${boxSnap.data().name})`);
      } else {
        console.log(`驗證: 禮盒 ${box.id} 存在狀況 => 不存在`);
      }
    }

    const metaTasks = await getDoc(doc(db, 'metadata', 'tasks'));
    const metaBoxes = await getDoc(doc(db, 'metadata', 'boxes'));
    console.log('驗證: metadata/tasks lastUpdated:', metaTasks.exists() ? metaTasks.data().lastUpdated : '無');
    console.log('驗證: metadata/boxes lastUpdated:', metaBoxes.exists() ? metaBoxes.data().lastUpdated : '無');
  } catch (err) {
    console.error("驗證失敗:", err);
  }

  console.log("\n所有作業已完成！");
  process.exit(0);
}

run();
