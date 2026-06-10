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
  const newTasksPath = path.join(__dirname, '..', 'raw-data', 'tasks', 'new-task-data.json');
  if (!fs.existsSync(newTasksPath)) {
    console.error(`File not found: ${newTasksPath}`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(newTasksPath, 'utf-8'));
  console.log(`Loaded ${data.length} tasks.`);

  // 重新更新 ID
  let updatedCount = 0;
  for (let task of data) {
    const nameToHash = (task.customizedName && task.customizedName.trim()) ? task.customizedName : task.name;
    const newId = getTaskId(nameToHash);
    if (task.id !== newId) {
      task.id = newId;
      updatedCount++;
    }
  }

  console.log(`Re-calculated and updated IDs count: ${updatedCount}`);

  // 寫回檔案
  fs.writeFileSync(newTasksPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`Saved updated tasks to ${newTasksPath}`);

  // 同步到 brain store
  const brainNewTasksPath = 'C:\\Users\\soup1\\.gemini\\antigravity\\brain\\a3ad10b3-b7fe-457a-98dc-05b35f877fa9\\new-task-data.json';
  fs.writeFileSync(brainNewTasksPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`Synced updated tasks to brain store.`);
}

run();
