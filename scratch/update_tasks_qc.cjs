const fs = require('fs');
const path = require('path');

function run() {
  const yamlPath = path.join(__dirname, '..', 'raw-data', 'no-name-master.yaml');
  const taskDataPath = path.join(__dirname, '..', 'raw-data', 'tasks', 'official-task-data.json');
  const diffDest = path.join(__dirname, '..', 'raw-data', 'tasks', 'official-difference-task-data.json');
  const diffFixedDest = path.join(__dirname, '..', 'raw-data', 'tasks', 'official-defference-task-data-fixed.json');

  if (!fs.existsSync(yamlPath)) {
    console.error(`File not found: ${yamlPath}`);
    return;
  }

  // 1. 解析 YAML 檔案
  const yamlLines = fs.readFileSync(yamlPath, 'utf-8').split(/\r?\n/);
  const noNameMap = new Map();

  let currentCategory = '';
  let currentNpc = '';

  yamlLines.forEach(line => {
    if (!line.trim()) return;

    if (line.startsWith('  - ')) {
      // 第3層: 任務名稱
      const taskName = line.substring(4).trim();
      noNameMap.set(taskName, {
        category: currentCategory,
        npc: currentNpc
      });
    } else if (line.startsWith(' - ')) {
      // 第2層: NPC
      currentNpc = line.substring(3).trim();
    } else if (line.startsWith('- ')) {
      // 第1層: category
      currentCategory = line.substring(2).trim();
    }
  });

  console.log(`Parsed YAML entries: ${noNameMap.size}`);

  // 2. 處理 JSON 檔案
  const updateJson = (filePath) => {
    if (!fs.existsSync(filePath)) return;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    let matchCount = 0;

    const updated = data.map(task => {
      const name = task.name ? task.name.trim() : '';
      if (noNameMap.has(name)) {
        matchCount++;
        const match = noNameMap.get(name);
        return {
          ...task,
          isQc10726: true,
          qc10726: {
            category: match.category,
            npc: match.npc
          }
        };
      } else {
        return {
          ...task,
          isQc10726: false,
          qc10726: null
        };
      }
    });

    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8');
    console.log(`Updated ${filePath}: matched ${matchCount} / ${data.length} tasks`);

    // 同步到 brain store
    const fileName = path.basename(filePath);
    const brainDest = path.join('C:\\Users\\soup1\\.gemini\\antigravity\\brain\\a3ad10b3-b7fe-457a-98dc-05b35f877fa9', fileName);
    try {
      fs.writeFileSync(brainDest, JSON.stringify(updated, null, 2), 'utf-8');
      console.log(`Synced ${fileName} to brain store`);
    } catch (err) {
      console.error(`Failed to sync ${fileName} to brain store:`, err);
    }
  };

  updateJson(taskDataPath);
  updateJson(diffDest);
  updateJson(diffFixedDest);
}

run();
