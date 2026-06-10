const fs = require('fs');
const path = require('path');

const tasksPath = path.join(__dirname, '..', 'raw-data', 'tasks', 'official_tasks.json');

function run() {
  if (!fs.existsSync(tasksPath)) {
    console.error(`File not found: ${tasksPath}`);
    return;
  }

  const tasks = JSON.parse(fs.readFileSync(tasksPath, 'utf-8'));

  console.log(`Processing ${tasks.length} tasks...`);

  let stepModifiedCount = 0;
  let locationModifiedCount = 0;

  for (let task of tasks) {
    // 1. 任務步驟為 "完成任務指示的所有步驟" 的任務，提示設為 ["待補充"]
    const hasDefaultStep = task.steps.some(s => s.desc === '完成任務指示的所有步驟');
    if (hasDefaultStep) {
      task.tips = ['待補充'];
      stepModifiedCount++;
    }

    // 2. 接任務地點有 "自動觸發" 的任務，NPC 改為 "無"
    if (task.startLocation.desc.includes('自動觸發')) {
      if (task.startLocation.desc.includes('(NPC:')) {
        task.startLocation.desc = task.startLocation.desc.replace(/\(NPC:\s*[^)]+\)/g, '(NPC: 無)');
      } else {
        task.startLocation.desc += ' (NPC: 無)';
      }
      locationModifiedCount++;
    }
  }

  console.log(`Step Modified (tips -> 待補充): ${stepModifiedCount}`);
  console.log(`Location Modified (NPC -> 無): ${locationModifiedCount}`);

  fs.writeFileSync(tasksPath, JSON.stringify(tasks, null, 2), 'utf-8');
  console.log(`Successfully updated ${tasksPath}`);
}

run();
