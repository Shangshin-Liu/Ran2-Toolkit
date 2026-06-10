const fs = require('fs');
const path = require('path');

const srcPath = 'C:\\Users\\soup1\\.gemini\\antigravity\\brain\\a3ad10b3-b7fe-457a-98dc-05b35f877fa9\\official_tasks.json';
const destPath = path.join(__dirname, '..', 'raw-data', 'tasks', 'official_tasks.json');

if (!fs.existsSync(srcPath)) {
  console.error(`Source file not found at: ${srcPath}`);
  process.exit(1);
}

const tasks = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
console.log(`Loaded ${tasks.length} tasks from brain store.`);

const updatedTasks = tasks.map(task => {
  return {
    ...task,
    customizedName: task.customizedName !== undefined ? task.customizedName : ""
  };
});

// 寫入到 brain store
fs.writeFileSync(srcPath, JSON.stringify(updatedTasks, null, 2), 'utf8');
console.log('Saved to brain store.');

// 確保 dest 目錄存在
const destDir = path.dirname(destPath);
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// 寫入到專案的 raw-data
fs.writeFileSync(destPath, JSON.stringify(updatedTasks, null, 2), 'utf8');
console.log('Saved to project raw-data.');

console.log('Done!');
