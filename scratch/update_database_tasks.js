import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';

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
  console.log("開始更新 Firestore tasks 資料庫...");

  // 1. task-6a00c2f8
  try {
    await updateDoc(doc(db, 'tasks', 'task-6a00c2f8'), {
      rewards: {
        exp: 0,
        skillPoints: 1,
        statsPoints: 0,
        customRewards: [
          { desc: "金幣100000" },
          { desc: "可自由進出虎令學院本館B3" }
        ]
      }
    });
    console.log("✓ task-6a00c2f8 (rewards) 更新成功");
  } catch (err) {
    console.error("✗ task-6a00c2f8 更新失敗:", err);
  }

  // 2. task-1a5d55b9
  try {
    await updateDoc(doc(db, 'tasks', 'task-1a5d55b9'), {
      rewards: {
        exp: 0,
        skillPoints: 2,
        statsPoints: 0,
        customRewards: [
          { desc: "【終極練功禮盒(7D)LV.210】" }
        ]
      }
    });
    console.log("✓ task-1a5d55b9 (rewards) 更新成功");
  } catch (err) {
    console.error("✗ task-1a5d55b9 更新失敗:", err);
  }

  // 3. task-1abaf69a
  try {
    await updateDoc(doc(db, 'tasks', 'task-1abaf69a'), {
      rewards: {
        exp: 0,
        skillPoints: 2,
        statsPoints: 0,
        customRewards: [
          { desc: "【終極練功禮盒(7D)LV.250】" }
        ]
      }
    });
    console.log("✓ task-1abaf69a (rewards) 更新成功");
  } catch (err) {
    console.error("✗ task-1abaf69a 更新失敗:", err);
  }

  // 4. task-13dab0ce (移除此筆資料)
  try {
    await deleteDoc(doc(db, 'tasks', 'task-13dab0ce'));
    console.log("✓ task-13dab0ce 刪除成功");
  } catch (err) {
    console.error("✗ task-13dab0ce 刪除失敗:", err);
  }

  // 5. task-1f3d0e9e
  try {
    await updateDoc(doc(db, 'tasks', 'task-1f3d0e9e'), {
      rewards: {
        exp: 353336,
        skillPoints: 0,
        statsPoints: 0,
        customRewards: [
          { desc: "屬性點數: 2" }
        ]
      }
    });
    console.log("✓ task-1f3d0e9e (rewards) 更新成功");
  } catch (err) {
    console.error("✗ task-1f3d0e9e 更新失敗:", err);
  }

  // 6. task-3386ac2e
  try {
    await updateDoc(doc(db, 'tasks', 'task-3386ac2e'), {
      name: "清除炸彈",
      customizedName: "清除炸彈[鳳凰]"
    });
    console.log("✓ task-3386ac2e (名稱) 更新成功");
  } catch (err) {
    console.error("✗ task-3386ac2e 更新失敗:", err);
  }

  // 7. task-5d21ff15
  try {
    await updateDoc(doc(db, 'tasks', 'task-5d21ff15'), {
      isQc10726: true,
      qc10726: {
        category: "血痕廣場",
        npc: "神祕女子"
      }
    });
    console.log("✓ task-5d21ff15 (isQc10726 & qc10726) 更新成功");
  } catch (err) {
    console.error("✗ task-5d21ff15 更新失敗:", err);
  }

  // 8. task-5d221009
  try {
    await updateDoc(doc(db, 'tasks', 'task-5d221009'), {
      name: "集中營狀況調查",
      isQc10726: true,
      qc10726: {
        category: "血痕廣場",
        npc: "神祕女子"
      }
    });
    console.log("✓ task-5d221009 (name & isQc10726 & qc10726) 更新成功");
  } catch (err) {
    console.error("✗ task-5d221009 更新失敗:", err);
  }

  // 9. task-2776bf10
  try {
    await updateDoc(doc(db, 'tasks', 'task-2776bf10'), {
      name: "打倒冰凍可滷",
      customizedName: "打倒冰凍可滷[玄嚴]",
      isQc10726: true,
      qc10726: {
        category: "聖門/懸岩/鳳凰洞",
        npc: "物理老師"
      }
    });
    console.log("✓ task-2776bf10 (名稱 & isQc10726 & qc10726 - 玄嚴) 更新成功");
  } catch (err) {
    console.error("✗ task-2776bf10 更新失敗:", err);
  }

  // 10. task-5744cc64
  try {
    await updateDoc(doc(db, 'tasks', 'task-5744cc64'), {
      customizedName: "打倒冰凍可滷[鳳凰]"
    });
    console.log("✓ task-5744cc64 (customizedName - 鳳凰) 更新成功");
  } catch (err) {
    console.error("✗ task-5744cc64 更新失敗:", err);
  }

  // 11. task-27ae7a16 (聖門，修正後 ID)
  try {
    await updateDoc(doc(db, 'tasks', 'task-27ae7a16'), {
      name: "打倒冰凍可滷",
      customizedName: "打倒冰凍可滷[聖門]",
      isQc10726: true,
      qc10726: {
        category: "聖門/懸岩/鳳凰洞",
        npc: "物理老師"
      }
    });
    console.log("✓ task-27ae7a16 (名稱 & isQc10726 & qc10726 - 聖門) 更新成功");
  } catch (err) {
    console.error("✗ task-27ae7a16 更新失敗:", err);
  }

  // 12. 更新雲端時間戳記
  try {
    console.log("正在更新雲端任務最後更新時間中介資料...");
    await setDoc(doc(db, 'metadata', 'tasks'), { lastUpdated: Date.now() });
    console.log("✓ 雲端時間戳記更新成功！");
  } catch (metaErr) {
    console.error("✗ 更新時間戳記中介資料失敗:", metaErr);
  }

  console.log("Firestore tasks 更新全部完成！");
}

main();
