const fs = require('fs');
const path = require('path');

const tasksPath = path.join(__dirname, '..', 'raw-data', 'tasks', 'official_tasks.json');
const tasks = JSON.parse(fs.readFileSync(tasksPath, 'utf8'));

console.log(`Loaded ${tasks.length} tasks.`);

const schoolStats = { '共通': 0, '聖門': 0, '鳳凰': 0, '玄嚴': 0 };
const deptStats = { '共通': 0, '劍道部': 0, '格鬥部': 0, '氣功部': 0, '弓箭部': 0 };

const updatedTasks = tasks.map(task => {
  // 將任務的所有相關文字拼接起來做搜尋
  const allText = [
    task.name || '',
    (task.requirements || []).map(r => r.desc).join(' '),
    task.startLocation?.desc || '',
    (task.steps || []).map(s => s.desc).join(' '),
    (task.tips || []).join(' '),
    (task.notes || []).join(' ')
  ].join(' ').toLowerCase();

  // 判定學院
  let school = '共通';
  if (allText.includes('聖門')) {
    school = '聖門';
  } else if (allText.includes('鳳凰')) {
    school = '鳳凰';
  } else if (allText.includes('玄嚴') || allText.includes('玄巖') || allText.includes('玄岩')) {
    school = '玄嚴';
  }

  // 判定部門
  let department = '共通';
  if (allText.includes('劍道') || allText.includes('劍道部')) {
    department = '劍道部';
  } else if (allText.includes('格鬥') || allText.includes('格鬥部')) {
    department = '格鬥部';
  } else if (allText.includes('氣功') || allText.includes('氣功部')) {
    department = '氣功部';
  } else if (allText.includes('弓箭') || allText.includes('弓箭部') || allText.includes('弓手') || allText.includes('弓部')) {
    department = '弓箭部';
  }

  schoolStats[school]++;
  deptStats[department]++;

  return {
    ...task,
    school,
    department
  };
});

console.log('School stats:', schoolStats);
console.log('Department stats:', deptStats);

// 寫回
fs.writeFileSync(tasksPath, JSON.stringify(updatedTasks, null, 2), 'utf8');
console.log('Done updating official_tasks.json!');
