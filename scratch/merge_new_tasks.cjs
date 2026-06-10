const fs = require('fs');
const path = require('path');

function run() {
  const officialPath = path.join(__dirname, '..', 'raw-data', 'tasks', 'official-task-data.json');
  const newTasksPath = path.join(__dirname, '..', 'raw-data', 'tasks', 'new-task-data.json');

  if (!fs.existsSync(officialPath)) {
    console.error(`File not found: ${officialPath}`);
    return;
  }
  if (!fs.existsSync(newTasksPath)) {
    console.error(`File not found: ${newTasksPath}`);
    return;
  }

  const officialTasks = JSON.parse(fs.readFileSync(officialPath, 'utf-8'));
  const newTasks = JSON.parse(fs.readFileSync(newTasksPath, 'utf-8'));

  console.log(`Loaded official tasks: ${officialTasks.length}`);
  console.log(`Loaded new tasks: ${newTasks.length}`);

  // 合併
  const merged = [...officialTasks, ...newTasks];
  console.log(`Merged total tasks: ${merged.length}`);

  // 檢查重複 ID
  const idCounts = {};
  merged.forEach(t => {
    idCounts[t.id] = (idCounts[t.id] || 0) + 1;
  });

  const duplicateIds = Object.keys(idCounts).filter(id => idCounts[id] > 1);

  if (duplicateIds.length > 0) {
    console.log(`\nFound duplicate IDs (${duplicateIds.length}):`);
    duplicateIds.forEach(id => {
      const match = merged.filter(t => t.id === id);
      console.log(`ID: ${id} (occurs ${idCounts[id]} times)`);
      match.forEach(t => {
        console.log(`  - Name: "${t.name}", customizedName: "${t.customizedName || ''}", School: "${t.school}", Dept: "${t.department}"`);
      });
    });
  } else {
    console.log('\nNo duplicate IDs found!');
  }

  // 寫回
  fs.writeFileSync(officialPath, JSON.stringify(merged, null, 2), 'utf-8');
  console.log(`Saved merged tasks to ${officialPath}`);

  // 同步到 brain store
  const brainTasksDest = 'C:\\Users\\soup1\\.gemini\\antigravity\\brain\\a3ad10b3-b7fe-457a-98dc-05b35f877fa9\\official-task-data.json';
  fs.writeFileSync(brainTasksDest, JSON.stringify(merged, null, 2), 'utf-8');
  console.log(`Synced merged tasks to brain store.`);
}

run();
