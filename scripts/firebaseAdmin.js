/**
 * 管理用腳本共用的 Firebase Admin 初始化 (scripts/firebaseAdmin.js)
 *
 * Admin SDK 以服務帳戶身分存取 Firestore，不受 firestore.rules 限制，
 * 因此 notices / metadata / tasks / skills 等集合可在 rules 中對前端設為唯讀。
 *
 * 金鑰路徑優先順序：
 *   1. 環境變數 GOOGLE_APPLICATION_CREDENTIALS 指定的路徑
 *   2. 專案根目錄的 serviceAccountKey.json（已列入 .gitignore，切勿提交）
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_KEY_PATH = path.join(__dirname, '../serviceAccountKey.json');

function loadServiceAccount() {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || DEFAULT_KEY_PATH;
  if (!fs.existsSync(keyPath)) {
    console.error(`❌ 找不到服務帳戶金鑰：${keyPath}`);
    console.error('   請至 Firebase Console → 專案設定 → 服務帳戶 → 產生新的私密金鑰，');
    console.error('   存為專案根目錄的 serviceAccountKey.json，或以 GOOGLE_APPLICATION_CREDENTIALS 指定路徑。');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(keyPath, 'utf8'));
}

if (getApps().length === 0) {
  initializeApp({ credential: cert(loadServiceAccount()) });
}

export const db = getFirestore();
