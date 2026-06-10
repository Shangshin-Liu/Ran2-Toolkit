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

  let locModified = 0;
  let stepsModified = 0;
  let tipsModified = 0;

  for (let task of tasks) {
    // 1. startLocation.desc 文字包含 "自動觸發" 的，直接改寫成 "自動觸發"
    if (task.startLocation && task.startLocation.desc && task.startLocation.desc.includes('自動觸發')) {
      task.startLocation.desc = '自動觸發';
      locModified++;
    }

    // 2. steps.desc 文字為 "完成任務指示的所有步驟"，調整為 "待補充"
    if (task.steps && task.steps.length > 0) {
      task.steps.forEach(step => {
        if (step.desc === '完成任務指示的所有步驟') {
          step.desc = '待補充';
          stepsModified++;
        }
      });
    }

    // 3. 移除 tips 內的 "待補充" 內容 (直接還原為空陣列)
    if (task.tips && task.tips.includes('待補充')) {
      task.tips = task.tips.filter(t => t !== '待補充');
      tipsModified++;
    }
  }

  console.log(`Location Modified (desc -> "自動觸發"): ${locModified}`);
  console.log(`Steps Modified (desc -> "待補充"): ${stepsModified}`);
  console.log(`Tips Modified (removed "待補充"): ${tipsModified}`);

  fs.writeFileSync(tasksPath, JSON.stringify(tasks, null, 2), 'utf-8');
  console.log(`Successfully updated ${tasksPath}`);
}

run();
