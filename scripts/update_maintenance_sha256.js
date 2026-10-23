import { db } from './firebaseAdmin.js';
import { createHash } from 'crypto';


// 計算 ran2admin 的 SHA-256 Hash
const rawPassword = 'ran2admin';
const hashPassword = createHash('sha256').update(rawPassword).digest('hex');

async function main() {
  console.log(`================= 更新 Firebase 維護解鎖密碼為 SHA-256 =================`);
  console.log(`原始密碼: ${rawPassword}`);
  console.log(`SHA-256 Hash: ${hashPassword}`);

  const docRef = db.collection('metadata').doc('maintenance');
  const docSnap = await docRef.get();

  if (docSnap.exists) {
    await docRef.update({ password: hashPassword });
    console.log("成功更新 Firebase metadata/maintenance 的 password 為 SHA-256 Hash！");
  } else {
    console.log("文件不存在，新建並更新...");
    await docRef.set({ password: hashPassword }, { merge: true });
    console.log("成功寫入 SHA-256 Hash！");
  }
  process.exit(0);
}

main().catch(err => {
  console.error("更新失敗:", err);
  process.exit(1);
});
