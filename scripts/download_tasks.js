import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, getDocs } from 'firebase/firestore';

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

const defaultSchemaDescription = {
  collection: "tasks",
  purpose: "取得能力點、技能點所需的任務清單（涵蓋所有學院與部門）：有能力點或技能點獎勵的任務、它們的前置任務（含前置的前置），以及名稱帶學院或部門之任務的所有版本。",
  documentId: "game-data-task.json 的 id（例如 quest-0015）",
  source: "real-tasks.json（R，主角完成紀錄）、game-data-task.json（G，遊戲任務資料）、expect-tasks.json（E，地點與分類）、遊戲 NPC 對話檔 npctalk.rcc（接取條件與前置任務）",
  rules: [
    "以 R 的 fullName 對應 G 的 name（只從 R 找 G；統一 玄巖/玄嚴、中間點與空白；其名的指責 → 莫名的指責）。同名多筆時，R 的筆數與 G 的同名任務數相同才採用。",
    "保留 statsPoints > 0 或 skillPoints > 0 的任務。",
    "依指定另收錄轉職奧義流程的任務（莫名的指責、另一個自己?!、災難的開始）；這三個任務沒有能力點或技能點，災難的開始的獎勵為轉職為奧義職業。",
    "前置任務以遊戲資料為準：經 NPC 對話接取的任務，前置任務是 NPC 接取時檢查的已完成或進行中任務（有多條接取路線時，取每條路線都需要的任務；路線彼此互斥時列出可擇一完成的任務；只要有一條路線不需前置，就不列前置），以及這些前置間接需要的任務；G「完成後自動接續」或 E 記載、但遊戲接取時並不需要的任務不列入。不經 NPC 接取的任務（道具觸發、完成後自動接續）沿用 G 的自動接續與 E 記載的前置。前置任務都必須是主角實際完成過（在 R 中）的任務；前置任務本身也依同樣規則找它的前置，並一併收錄。",
    "E 前置的名稱對應：先正規化名稱比對；寫法不同時取唯一最相近者（近似度 ≥ 0.75）；「獲得汽油」視為「汽油回收」、「製作過敏治療劑」視為「過敏治療劑的製作」。有學院／部門版本時，只取和本任務學院、部門相容的版本；同名但不同任務時，取 G 已連結者，否則取任務編號最接近者。",
    "接取條件另取自遊戲 NPC 對話檔（npctalk.rcc 內的 .ntk，依遊戲程式的讀取與判斷方式解析）：等級（含上限）、學院、部門、奧義職業限定、身上需有的金幣、需尚未完成的任務等。一個任務有多條接取路線（不同 NPC 或對話分支）時，只列每條路線都需要的條件；經由「進行中的前一個任務」接取時 NPC 不檢查等級，以該任務的等級為準；學院或部門與本檔 school、department 相同時不重複列出。",
    "只允許已轉職奧義職業的角色接取的任務，前置加入「災難的開始」（遊戲中轉為奧義職業的劇情任務）。",
    "任務檔起始條件中的「死亡即任務失敗」旗標（遊戲任務視窗會列為任務條件）也併入 requirements。",
    "手動群組（groupId ≥ 10000）的任務若有其他學院／部門版本不在 R 中，一併收錄。這些版本遊戲不會一併標記完成，獎勵也不會重複；玩家只需完成自己的版本。",
    "名稱帶學院或部門的任務，收錄所有學院／部門版本（含主角沒做過的版本）；沒做過的版本，前置任務比照已收錄的版本，換成與該版本相容的同系列任務。",
    "E 與遊戲資料不一致時以遊戲為準（遊戲前些年大改版，E 有部分內容是改版前的資料）。",
    "location、category、npc 取自 E 中名稱最相近的任務（名稱正規化後比對，同分時以學院、部門相符者優先）；近似度低於 0.75 時為 null；E 沒有對應或該欄位空白時，改用同一個 NPC（同一個 NPC 對話檔）其他任務的資料；分類中的「懸岩」比照修正為「玄嚴」。"
  ],
  verification: {
    statsPoints: 122,
    skillPoints: 202,
    note: "以主角（聖門弓箭部）角度：只算該學院／部門可做的任務；遊戲群組完成一個即全部完成，重置後各版本點數都算(「groupId<10000」的任務獎勵可以疊加，其餘的則不可疊加獎勵)",
    byPerspective: {
      "聖門格鬥": { statsPoints: 122, skillPoints: 202 },
      "聖門劍道": { statsPoints: 122, skillPoints: 202 },
      "聖門弓箭": { statsPoints: 122, skillPoints: 202 },
      "聖門氣功": { statsPoints: 122, skillPoints: 202 },
      "玄嚴格鬥": { statsPoints: 122, skillPoints: 202 },
      "玄嚴劍道": { statsPoints: 122, skillPoints: 202 },
      "玄嚴弓箭": { statsPoints: 122, skillPoints: 202 },
      "玄嚴氣功": { statsPoints: 122, skillPoints: 202 },
      "鳳凰格鬥": { statsPoints: 122, skillPoints: 202 },
      "鳳凰劍道": { statsPoints: 122, skillPoints: 202 },
      "鳳凰弓箭": { statsPoints: 122, skillPoints: 202 },
      "鳳凰氣功": { statsPoints: 122, skillPoints: 202 }
    }
  },
  fields: {
    id: { type: "String", description: "G 的 id" },
    name: { type: "String", description: "G 的 name" },
    school: { type: "String", description: "G 的 school" },
    department: { type: "String", description: "G 的 department（已修正：任務檔只限極限部者改依名稱中的職業判斷，沒有則為共通）" },
    groupId: {
      type: "Number | null",
      description: "G 的 groupId。小於 10000 為遊戲本身的群組（完成一個會一併標記同組其他任務）；10000 以上為後續手動補上的群組（遊戲不會一併標記，獎勵不會重複）；null 為無群組"
    },
    requiredIds: {
      type: "Array<String>",
      description: "前置任務的 G id，以遊戲資料為準：NPC 對話接取時檢查的已完成或進行中任務（及其間接需要的任務）；不經 NPC 接取的任務沿用 G 的自動接續與 E 記載、且主角確實完成過的前置。列出多個同群組（groupId 相同）版本或彼此互斥的任務時，只需完成其中一個。"
    },
    requirements: {
      type: "Array<Object>",
      description: "前置任務以外的接取條件，每項為物件 { type, value }（value 一律為字串；levelWithSkill 另有 skills）。來源：任務檔起始條件、任務檔的「死亡即任務失敗」旗標、遊戲 NPC 對話檔的接取條件；沒有則為空陣列",
      types: {
        level: "等級下限：value = 等級（例：達到 Lv.112 → \"112\"）",
        levelMax: "等級上限：value = 等級；與 level 搭配表示區間（例：等級 Lv.110～130 → level \"110\" + levelMax \"130\"）",
        levelWithSkill: "已學會 skills 中任一技能者，等級下限改為 value；skills 為技能編號 mid/sid 陣列",
        timeLimit: "限時：value = 分鐘數",
        failOnDeath: "死亡即任務失敗：value = \"true\"",
        item: "接取時需持有的道具：value = 道具編號 mid/sid 或道具名稱",
        fee: "接取時需支付的金幣：value = 金額",
        school: "限定學院：value = 聖門／玄嚴／鳳凰",
        advancedClass: "奧義職業：value = \"required\"（限已轉職奧義者，前置含災難的開始）或 \"forbidden\"（已轉職奧義者不可接取）",
        notCompleted: "需尚未完成的任務：value = G id"
      }
    },
    location: { type: "String | null", description: "任務地點：E 中名稱最相近任務的 startLocation.desc；E 沒有時取同一個 NPC 其他任務的地點" },
    category: { type: "String | null", description: "分類：E 中名稱最相近任務的 qc10726.category；E 沒有時取同一個 NPC 其他任務的分類" },
    npc: { type: "String | null", description: "NPC：E 中名稱最相近任務的 qc10726.npc；E 沒有時取同一個 NPC 其他任務的值" },
    statsPoints: { type: "Number", description: "G 的能力點獎勵" },
    skillPoints: { type: "Number", description: "G 的技能點獎勵" }
  }
};

function formatNowToVersion() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  return `${yy}${mm}${dd}${hh}`;
}

async function downloadTasks() {
  const outputPath = path.join(rootDir, 'backups', 'meta-tasks.json');
  let existingSchema = defaultSchemaDescription;
  let existingVersion = '';

  if (fs.existsSync(outputPath)) {
    try {
      const existingData = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
      if (existingData._schema) existingSchema = existingData._schema;
      if (existingData.version) existingVersion = String(existingData.version);
    } catch {
      // ignore
    }
  }

  console.log("正在從 Firestore 讀取 'metadata/tasks' 與 'tasks' 集合資料...");
  let cloudVersion = '';
  try {
    const metaSnap = await getDoc(doc(db, 'metadata', 'tasks'));
    if (metaSnap.exists() && metaSnap.data().version) {
      cloudVersion = String(metaSnap.data().version);
    }
  } catch (err) {
    console.warn("讀取 metadata/tasks 失敗，使用本地版本號作為備援:", err);
  }

  const tasksRef = collection(db, 'tasks');
  const snapshot = await getDocs(tasksRef);

  console.log(`成功獲取，共 ${snapshot.docs.length} 筆任務。`);

  const tasksList = [];
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const id = data.id || docSnap.id;
    // 保持固定欄位順序與 backups/meta-tasks.json 一致
    tasksList.push({
      id,
      name: data.name ?? '',
      school: data.school ?? '共通',
      department: data.department ?? '共通',
      groupId: data.groupId ?? null,
      requiredIds: Array.isArray(data.requiredIds) ? data.requiredIds : [],
      requirements: Array.isArray(data.requirements) ? data.requirements : [],
      location: data.location ?? null,
      category: data.category ?? null,
      npc: data.npc ?? null,
      statsPoints: Number(data.statsPoints) || 0,
      skillPoints: Number(data.skillPoints) || 0
    });
  });

  // 依 id 排序保持穩定性
  tasksList.sort((a, b) => (a.id || '').localeCompare(b.id || '', 'en', { numeric: true }));

  const outputData = {
    _schema: existingSchema,
    total: tasksList.length,
    version: cloudVersion || existingVersion || formatNowToVersion(),
    tasks: tasksList
  };

  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2) + '\n', 'utf8');
  console.log(`✅ 已成功導出 ${tasksList.length} 筆任務資料 (version: ${outputData.version}) 至: ${outputPath}`);
  process.exit(0);
}

downloadTasks().catch(err => {
  console.error("下載任務失敗:", err);
  process.exit(1);
});
