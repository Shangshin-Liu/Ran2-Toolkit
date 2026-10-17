import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 讀取 .env.local
const envPath = path.join(rootDir, '.env.local');
const env = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.substring(0, eqIdx).trim();
      const val = trimmed.substring(eqIdx + 1).split('#')[0].trim();
      env[key] = val;
    }
  }
}

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyCA4jc0LE5idc2Y9Ejeckq2pt6czMt12HA",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "ran2-toolkit.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "ran2-toolkit",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "ran2-toolkit.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "415180332080",
  appId: env.VITE_FIREBASE_APP_ID || "1:415180332080:web:8fe6cf9a47d620c608a1f5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function downloadTasks() {
  console.log("正在從 Firestore 獲取 'tasks' 集合資料...");
  const tasksRef = collection(db, 'tasks');
  const snapshot = await getDocs(tasksRef);

  console.log(`成功獲取，共 ${snapshot.docs.length} 筆任務。`);

  const tasksList = [];
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    // 確保 id 欄位存在，若 data 內無 id 則取 docSnap.id
    if (!data.id) {
      data.id = docSnap.id;
    }
    tasksList.push(data);
  });

  // 依 id 排序保持穩定性
  tasksList.sort((a, b) => (a.id || '').localeCompare(b.id || ''));

  const schemaDescription = {
    collection: "tasks",
    purpose: "儲存官方任務步驟、起點、限制與獎勵資訊。",
    documentId: "任務唯一 ID（例如：task_0001，或無名字任務 qc_10726_001 等）",
    fields: {
      id: {
        type: "String",
        description: "任務唯一識別碼"
      },
      name: {
        type: "String",
        description: "任務標題名稱"
      },
      customizedName: {
        type: "String",
        description: "自訂/修正名稱（例如無名字任務的前端客製標題，可為空）"
      },
      school: {
        type: "String",
        description: "所屬學院限制（玄嚴、聖門、鳳凰、共通）"
      },
      department: {
        type: "String",
        description: "所屬部門限制（格鬥部、氣功部、劍道部、弓箭部、共通）"
      },
      isQc10726: {
        type: "Boolean",
        description: "是否為無名字任務（特定官方任務識別）"
      },
      qc10726: {
        type: "Object",
        description: "無名字任務額外攻略屬性（可為空，內含 category, npc）",
        subFields: {
          category: {
            type: "String",
            description: "無名字任務的大分類（例如：學院廣場、綜合修練院、本洞等）"
          },
          npc: {
            type: "String",
            description: "無名字任務所屬的特定 NPC 名稱"
          }
        }
      },
      requirements: {
        type: "Array<String | Object>",
        description: "接取任務之前置需求與限制條件清單。可為純字串或含 { desc: string } 物件"
      },
      startLocation: {
        type: "Object",
        description: "起點資訊",
        subFields: {
          desc: {
            type: "String",
            description: "NPC 與地圖描述"
          },
          image: {
            type: "String",
            description: "可選，起點地圖截圖路徑/網址 (可為空字串)"
          }
        }
      },
      steps: {
        type: "Array<Object>",
        description: "任務流程步驟清單",
        subFields: {
          desc: {
            type: "String",
            description: "步驟說明文字"
          },
          image: {
            type: "String",
            description: "可選，步驟地圖截圖路徑/網址 (可為空字串)"
          }
        }
      },
      rewards: {
        type: "Object",
        description: "任務獎勵物件",
        subFields: {
          exp: {
            type: "Number",
            description: "獲得經驗值"
          },
          statsPoints: {
            type: "Number",
            description: "獲得能力點數 (屬性點)"
          },
          skillPoints: {
            type: "Number",
            description: "獲得技能點數"
          },
          customRewards: {
            type: "Array<String | Object>",
            description: "自訂道具/禮盒獎勵清單。常見結構為 { desc: string, url: string }"
          }
        }
      },
      tips: {
        type: "Array<String>",
        description: "前端提示與小技巧清單"
      },
      notes: {
        type: "Array<String>",
        description: "前端特別注意事項 / 備註清單"
      }
    }
  };

  const outputData = {
    _schema: schemaDescription,
    total: tasksList.length,
    exportedAt: new Date().toISOString(),
    tasks: tasksList
  };

  const outputPath = path.join(rootDir, 'backups', 'tasks.json');
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf8');
  console.log(`已成功導出 ${tasksList.length} 筆任務資料至: ${outputPath}`);
  process.exit(0);
}

downloadTasks().catch(err => {
  console.error("下載任務失敗:", err);
  process.exit(1);
});
