const fs = require('fs');
const path = require('path');

const tasksPath = path.join(__dirname, '..', 'raw-data', 'tasks', 'official_tasks.json');
const diffPath = path.join(__dirname, '..', 'raw-data', 'tasks', 'task_differences.json');

function run() {
  if (!fs.existsSync(tasksPath)) {
    console.error(`File not found: ${tasksPath}`);
    return;
  }
  if (!fs.existsSync(diffPath)) {
    console.error(`File not found: ${diffPath}`);
    return;
  }

  const tasks = JSON.parse(fs.readFileSync(tasksPath, 'utf-8'));
  const diffData = JSON.parse(fs.readFileSync(diffPath, 'utf-8'));

  const duplicatedNames = Object.keys(diffData);
  const duplicatedSet = new Set(duplicatedNames);

  console.log(`Original tasks count: ${tasks.length}`);
  console.log(`Duplicated names to exclude: ${duplicatedSet.size}`);

  const filteredTasks = tasks.filter(task => !duplicatedSet.has(task.name));

  console.log(`Filtered tasks count: ${filteredTasks.length}`);
  console.log(`Excluded tasks count: ${tasks.length - filteredTasks.length}`);

  fs.writeFileSync(tasksPath, JSON.stringify(filteredTasks, null, 2), 'utf-8');
  console.log(`Successfully updated ${tasksPath}`);
}

run();
