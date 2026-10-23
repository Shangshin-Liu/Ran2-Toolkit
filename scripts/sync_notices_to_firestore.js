import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './firebaseAdmin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));


function parseNoticesYaml(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const items = [];
  const rawBlocks = fileContent.split(/\n(?=- type:)/);

  for (const block of rawBlocks) {
    if (!block.trim() || block.trim().startsWith('#')) continue;

    const typeMatch = block.match(/type:\s*"([^"]+)"/);
    const topMatch = block.match(/top:\s*(true|false)/);
    const titleMatch = block.match(/title:\s*"([^"]+)"/);
    const dateMatch = block.match(/createdAt:\s*"([^"]+)"/);
    const contentIdx = block.indexOf('content: |');

    if (typeMatch && titleMatch && dateMatch && contentIdx !== -1) {
      const type = typeMatch[1];
      const top = topMatch ? topMatch[1] === 'true' : false;
      const title = titleMatch[1];
      const createdAt = dateMatch[1];
      const rawContentLines = block.substring(contentIdx + 'content: |'.length).split('\n');
      
      // 移除前導縮排 4 個空白
      const content = rawContentLines
        .map(line => line.startsWith('    ') ? line.substring(4) : line)
        .join('\n')
        .trim();

      items.push({
        type,
        top,
        title,
        createdAt,
        content
      });
    }
  }

  return items;
}

async function main() {
  const yamlPath = path.join(__dirname, '../backups/notices.yaml');
  console.log(`正在讀取 YAML 檔案: ${yamlPath}...`);
  const notices = parseNoticesYaml(yamlPath);
  console.log(`解析成功！共 ${notices.length} 筆公告項目。`);

  console.log("正在清理 Firestore 現有的 'notices' 集合...");
  const noticesRef = db.collection('notices');
  const snapshot = await noticesRef.get();
  let deleteCount = 0;
  for (const docItem of snapshot.docs) {
    await docItem.ref.delete();
    deleteCount++;
  }
  console.log(`已刪除現有 ${deleteCount} 筆舊公告文檔。`);

  console.log("正在寫入最新公告資料至 Firestore 'notices' 集合...");
  let addCount = 0;
  for (const item of notices) {
    await noticesRef.add(item);
    addCount++;
    console.log(`[${addCount}/${notices.length}] 已成功寫入公告: ${item.title}`);
  }

  console.log("================= 所有公告同步至 Firebase 上傳完畢！ =================");
  process.exit(0);
}

main().catch(err => {
  console.error("同步公告失敗:", err);
  process.exit(1);
});
