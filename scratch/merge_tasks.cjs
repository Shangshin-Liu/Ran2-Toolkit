const fs = require('fs');
const path = require('path');

function getTaskId(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return 'task-' + Math.abs(hash).toString(16);
}

function run() {
  const taskDataPath = path.join(__dirname, '..', 'raw-data', 'tasks', 'official-task-data.json');
  const diffFixedPath = path.join(__dirname, '..', 'raw-data', 'tasks', 'official-defference-task-data-fixed.json');
  
  if (!fs.existsSync(taskDataPath)) {
    console.error(`File not found: ${taskDataPath}`);
    return;
  }
  if (!fs.existsSync(diffFixedPath)) {
    console.error(`File not found: ${diffFixedPath}`);
    return;
  }

  const taskData = JSON.parse(fs.readFileSync(taskDataPath, 'utf-8'));
  const diffFixed = JSON.parse(fs.readFileSync(diffFixedPath, 'utf-8'));

  console.log(`Original taskData entries: ${taskData.length}`);
  console.log(`diffFixed entries to add: ${diffFixed.length}`);

  // 合併
  const merged = [...taskData, ...diffFixed];
  console.log(`Merged entries count: ${merged.length}`);

  // 補上 ID
  let addedIdCount = 0;
  for (let task of merged) {
    if (!task.id || task.id.trim() === '') {
      const nameToHash = (task.customizedName && task.customizedName.trim()) ? task.customizedName : task.name;
      task.id = getTaskId(nameToHash);
      addedIdCount++;
    }
  }
  console.log(`Automatically added ID count: ${addedIdCount}`);

  // 檢查是否有 id 重複的任務
  const idCounts = {};
  merged.forEach(task => {
    idCounts[task.id] = (idCounts[task.id] || 0) + 1;
  });

  const duplicateIds = Object.keys(idCounts).filter(id => idCounts[id] > 1);
  if (duplicateIds.length > 0) {
    console.log(`\nFound duplicate IDs (${duplicateIds.length}):`);
    duplicateIds.forEach(id => {
      const matchingTasks = merged.filter(t => t.id === id);
      console.log(`ID: ${id} (occurs ${idCounts[id]} times)`);
      matchingTasks.forEach(t => {
        console.log(`  - Name: "${t.name}", CustomizedName: "${t.customizedName || ''}", School: "${t.school}", Dept: "${t.department}"`);
      });
    });
  } else {
    console.log('\nNo duplicate IDs found!');
  }

  // 檢查是否有同名且同 customizedName 的重複任務
  const keyCounts = {};
  merged.forEach(task => {
    const key = `${task.name} | ${task.customizedName || ''}`;
    keyCounts[key] = (keyCounts[key] || 0) + 1;
  });
  const duplicateKeys = Object.keys(keyCounts).filter(k => keyCounts[k] > 1);
  if (duplicateKeys.length > 0) {
    console.log(`\nFound duplicate name-customizedName keys (${duplicateKeys.length}):`);
    duplicateKeys.forEach(k => {
      console.log(`  - Key: "${k}" (occurs ${keyCounts[k]} times)`);
    });
  }

  // 檢查是否所有項目的 id 都設定好了
  const missingIdTasks = merged.filter(t => !t.id || t.id.trim() === '');
  console.log(`\nTasks missing ID: ${missingIdTasks.length}`);

  // 寫回檔案
  fs.writeFileSync(taskDataPath, JSON.stringify(merged, null, 2), 'utf-8');
  console.log(`Saved merged tasks to ${taskDataPath}`);

  // 同步到 brain store
  const brainTasksDest = 'C:\\Users\\soup1\\.gemini\\antigravity\\brain\\a3ad10b3-b7fe-457a-98dc-05b35f877fa9\\official-task-data.json';
  fs.writeFileSync(brainTasksDest, JSON.stringify(merged, null, 2), 'utf-8');
  console.log(`Synced merged tasks to brain store.`);
}

run();
