const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

function getTaskId(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return 'task-' + Math.abs(hash).toString(16);
}

function cleanText(txt) {
  if (!txt) return '';
  return txt.replace(/&nbsp;/g, ' ')
            .replace(/[ \t]+/g, ' ')
            .replace(/\n\s*\n+/g, '\n')
            .trim();
}

const allTasks = [];

// ==========================================
// 1. 解析 page06.aspx (20110712_action)
// ==========================================
function parsePage06() {
  const filePath = path.join(__dirname, 'html_dumps', 'www.ran2.com.tw_gamesite_event_20110712_action_page06.aspx');
  if (!fs.existsSync(filePath)) return;
  const html = fs.readFileSync(filePath, 'utf-8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // 找尋所有 table
  const tables = doc.querySelectorAll('table.tab');
  tables.forEach((table, tableIdx) => {
    // 第一個是主線任務，第二個是支線_封印隊任務
    const isMain = tableIdx === 0;
    const rows = table.querySelectorAll('tr');
    
    rows.forEach((row, rowIdx) => {
      if (rowIdx === 0) return; // 跳過標頭
      const tds = row.querySelectorAll('td');
      if (tds.length < 4) return;

      const name = cleanText(tds[0].textContent);
      const reqText = cleanText(tds[1].textContent);
      const npcText = cleanText(tds[2].textContent);
      const rewardText = cleanText(tds[3].textContent);

      // 解析學系/部門
      let school = '共通';
      let dept = '共通';
      if (name.includes('[聖門]')) {
        school = '聖門';
      } else if (name.includes('[玄巖]')) {
        school = '玄巖';
      } else if (name.includes('[鳳凰]')) {
        school = '鳳凰';
      }

      // 解析承接地點與 NPC
      let startLocation = { desc: npcText };
      const locMatch = npcText.match(/([\s\S]*?)\[(.*?)\]\s*\((.*?)\)/);
      if (locMatch) {
        const npcName = cleanText(locMatch[1]);
        const mapName = cleanText(locMatch[2]);
        const coord = cleanText(locMatch[3]);
        startLocation.desc = `【${mapName}】 座標(${coord}) (NPC: ${npcName})`;
      } else {
        // 如果沒有匹配到，但有 br
        const lines = npcText.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length > 1) {
          const npcName = lines[0];
          const rem = lines.slice(1).join(' ');
          startLocation.desc = `${rem} (NPC: ${npcName})`;
        }
      }

      // 解析接取條件
      const requirements = [];
      const reqLines = reqText.split('\n').map(l => l.trim()).filter(Boolean);
      reqLines.forEach(line => {
        if (line.includes('等級') && line.includes('以上')) {
          const lvMatch = line.match(/等級\s*(\d+)\s*級以上/);
          if (lvMatch) {
            requirements.push({ desc: `達到 Lv.${lvMatch[1]}` });
            return;
          }
        }
        if (line.includes('需完成任務')) {
          const preMatch = line.match(/需完成任務[「'']([^」'']+)?[」'']/);
          if (preMatch) {
            requirements.push({ desc: `完成 【劇情】${preMatch[1].trim()}`, isPrerequisite: true, url: '' });
            return;
          }
        }
        if (line.includes('需完成') && (line.includes('【') || line.includes('「'))) {
          const preMatch = line.match(/需完成\s*[【「]([^】」]+)[】」]/);
          if (preMatch) {
            requirements.push({ desc: `完成 【劇情】${preMatch[1].trim()}`, isPrerequisite: true, url: '' });
            return;
          }
        }
        if (line.includes('需為') && line.includes('學院')) {
          const schMatch = line.match(/需為\s*(\S+)\s*學院/);
          if (schMatch) {
            school = schMatch[1];
          }
          requirements.push({ desc: line });
          return;
        }
        requirements.push({ desc: line });
      });

      // 解析獎勵
      const rewards = { exp: 0, statsPoints: 0, skillPoints: 0, customRewards: [] };
      const expMatch = rewardText.match(/經驗值\s*([\d,]+)/);
      if (expMatch) {
        rewards.exp = parseInt(expMatch[1].replace(/,/g, ''), 10);
      } else {
        rewards.customRewards.push({ desc: rewardText, url: '' });
      }

      allTasks.push({
        name,
        school,
        department: dept,
        requirements,
        startLocation,
        steps: [{ desc: '完成任務指示的所有步驟' }],
        rewards,
        tips: [],
        notes: [],
        customizedName: ''
      });
    });
  });
}

// ==========================================
// 2. 解析 page2.aspx (20110119_action)
// ==========================================
function parsePage2() {
  const filePath = path.join(__dirname, 'html_dumps', 'www.ran2.com.tw_gamesite_event_20110119_action_page2.aspx');
  if (!fs.existsSync(filePath)) return;
  const html = fs.readFileSync(filePath, 'utf-8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const table = doc.querySelector('table.tab');
  if (!table) return;

  const rows = table.querySelectorAll('tr');
  rows.forEach((row, rowIdx) => {
    if (rowIdx === 0) return; // 跳過標頭
    const tds = row.querySelectorAll('td');
    if (tds.length < 4) return;

    const name = cleanText(tds[0].textContent);
    const reqText = cleanText(tds[1].textContent);
    const npcText = cleanText(tds[2].textContent);
    const rewardText = cleanText(tds[3].textContent);

    let school = '共通';
    let dept = '共通';
    if (name.includes('_聖門')) {
      school = '聖門';
    } else if (name.includes('_玄巖')) {
      school = '玄巖';
    } else if (name.includes('_鳳凰')) {
      school = '鳳凰';
    }

    // 解析承接地點與 NPC
    let startLocation = { desc: npcText };
    const locMatch = npcText.match(/([\s\S]*?)\[(.*?)\]\s*\((.*?)\)/);
    if (locMatch) {
      const npcName = cleanText(locMatch[1]);
      const mapName = cleanText(locMatch[2]);
      const coord = cleanText(locMatch[3]);
      startLocation.desc = `【${mapName}】 座標(${coord}) (NPC: ${npcName})`;
    } else {
      const lines = npcText.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length > 1) {
        const npcName = lines[0];
        const rem = lines.slice(1).join(' ');
        startLocation.desc = `${rem} (NPC: ${npcName})`;
      }
    }

    // 解析限制條件
    const requirements = [];
    const reqLines = reqText.split('\n').map(l => l.trim()).filter(Boolean);
    reqLines.forEach(line => {
      if (line.includes('大於或等於')) {
        const lvMatch = line.match(/大於或等於\s*(\d+)/);
        if (lvMatch) {
          requirements.push({ desc: `達到 Lv.${lvMatch[1]}` });
          return;
        }
      }
      if (line.includes('需完成') && (line.includes('「') || line.includes('【'))) {
        const preMatch = line.match(/需完成(?:任務)?\s*[【「]([^】」]+)[】」]/);
        if (preMatch) {
          requirements.push({ desc: `完成 【劇情】${preMatch[1].trim()}`, isPrerequisite: true, url: '' });
          return;
        }
      }
      if (line.includes('需為') && line.includes('學院')) {
        const schMatch = line.match(/需為\s*(\S+)\s*學院/);
        if (schMatch) {
          school = schMatch[1];
        }
        requirements.push({ desc: line });
        return;
      }
      if (line.includes('200以下')) {
        requirements.push({ desc: '達到 Lv.200以下' });
        return;
      }
      requirements.push({ desc: line });
    });

    // 解析獎勵
    const rewards = { exp: 0, statsPoints: 0, skillPoints: 0, customRewards: [] };
    const rewardLines = rewardText.split('\n').map(l => l.trim()).filter(Boolean);
    rewardLines.forEach(line => {
      const expMatch = line.match(/EXP\s*([\d,]+)/i);
      if (expMatch) {
        rewards.exp = parseInt(expMatch[1].replace(/,/g, ''), 10);
        return;
      }
      const statsMatch = line.match(/能力點\s*(\d+)/);
      if (statsMatch) {
        rewards.statsPoints = parseInt(statsMatch[1], 10);
        return;
      }
      const skillMatch = line.match(/技能點\s*(\d+)/);
      if (skillMatch) {
        rewards.skillPoints = parseInt(skillMatch[1], 10);
        return;
      }
      rewards.customRewards.push({ desc: line, url: '' });
    });

    allTasks.push({
      name,
      school,
      department: dept,
      requirements,
      startLocation,
      steps: [{ desc: '完成任務指示的所有步驟' }],
      rewards,
      tips: [],
      notes: [],
      customizedName: ''
    });
  });
}

// ==========================================
// 3. 解析 tech-1.aspx (20120423_action)
// ==========================================
function parseTech1() {
  const filePath = path.join(__dirname, 'html_dumps', 'www.ran2.com.tw_gamesite_event_20120423_action_tech-1.aspx');
  if (!fs.existsSync(filePath)) return;
  const html = fs.readFileSync(filePath, 'utf-8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // 取得承接 NPC 與地點
  // NPC: 人人有功練
  // 地點: 《學院廣場》 座標(28_14)
  const startLocationDesc = '《學院廣場》 座標(28_14) (NPC: 人人有功練)';

  // 找尋表格中的資料列。每一列都是一個 table，包含 9 個 td。
  // 我們可以找到所有屬性包含 background="images/tech/table-bg.jpg" 並且裡面含有 td 數量符合的 row 或者是 table。
  const tables = doc.querySelectorAll('table');
  tables.forEach(table => {
    const tds = table.querySelectorAll('td');
    // 我們要找內容行，tds 的長度應該是 9 (包含 spacer td)
    if (tds.length === 9) {
      const name = cleanText(tds[0].textContent);
      if (name === '任務名稱' || name.includes('地點') || name === '') return;

      const lvText = cleanText(tds[2].textContent);
      const timeLimit = cleanText(tds[4].textContent);
      const stepsText = cleanText(tds[6].textContent);
      const rewardText = cleanText(tds[8].textContent);

      // 解析接取條件
      const requirements = [];
      if (lvText.includes('達') && lvText.includes('級')) {
        const lvMatch = lvText.match(/達\s*(\d+)\s*級/);
        if (lvMatch) {
          requirements.push({ desc: `達到 Lv.${lvMatch[1]}` });
        }
      } else if (lvText.includes('~')) {
        requirements.push({ desc: `等級限制: ${lvText}` });
      } else {
        requirements.push({ desc: lvText });
      }

      if (timeLimit) {
        requirements.push({ desc: `限時 ${timeLimit}` });
      }

      // 解析步驟
      const steps = stepsText.split('\n').map(l => l.replace(/^[　\s]*[□\-\*•]?\s*/, '').trim()).filter(Boolean).map(desc => ({ desc }));
      
      // 解析獎勵
      const rewards = { exp: 0, statsPoints: 0, skillPoints: 0, customRewards: [] };
      const rewardLines = rewardText.split('\n').map(l => l.trim()).filter(Boolean);
      rewardLines.forEach(line => {
        const statsMatch = line.match(/(?:屬性|能力點數)\s*[:：]?\s*(\d+)/);
        if (statsMatch) {
          rewards.statsPoints = parseInt(statsMatch[1], 10);
          return;
        }
        const skillMatch = line.match(/技能點數\s*[:：]?\s*(\d+)/);
        if (skillMatch) {
          rewards.skillPoints = parseInt(skillMatch[1], 10);
          return;
        }
        // 解析禮盒
        rewards.customRewards.push({ desc: line.replace(/^[　\s]*/, ''), url: '' });
      });

      allTasks.push({
        name: name.replace(/^[　\s]*/, ''),
        school: '共通',
        department: '共通',
        requirements,
        startLocation: { desc: startLocationDesc },
        steps,
        rewards,
        tips: [],
        notes: [],
        customizedName: ''
      });
    }
  });
}

// ==========================================
// 4. 解析 tech-2.aspx (20120423_action)
// ==========================================
function parseTech2() {
  const filePath = path.join(__dirname, 'html_dumps', 'www.ran2.com.tw_gamesite_event_20120423_action_tech-2.aspx');
  if (!fs.existsSync(filePath)) return;
  const html = fs.readFileSync(filePath, 'utf-8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const startLocationDesc = '《學院廣場》 座標(34_15) (NPC: 黑衣人-阿恰)';

  // 尋找所有的表格，判斷任務限制區段
  // 任務限制大標題是寫在 <tr> 裡面的 colspan="6" 中
  const trs = doc.querySelectorAll('tr');
  let currentLimit = '';
  
  trs.forEach(tr => {
    const limitTd = tr.querySelector('td[colspan="6"]');
    if (limitTd) {
      currentLimit = cleanText(limitTd.textContent); // 例如 "任務限制 60~120級"
      return;
    }

    const tds = tr.querySelectorAll('td');
    if (tds.length === 7) {
      const name = cleanText(tds[0].textContent);
      if (name === '任務名稱' || name === '') return;

      const flowText = cleanText(tds[2].textContent);
      const mapText = cleanText(tds[4].textContent);
      const expText = cleanText(tds[6].textContent);

      const requirements = [];
      if (currentLimit) {
        requirements.push({ desc: currentLimit });
      }

      // 解析流程為 steps
      const steps = flowText.split('\n').map(l => l.replace(/^[　\s]*[□\-\*•]?\s*/, '').trim()).filter(Boolean).map(desc => ({ desc }));
      
      const rewards = { exp: 0, statsPoints: 0, skillPoints: 0, customRewards: [] };
      if (expText) {
        rewards.exp = parseInt(expText.replace(/,/g, ''), 10);
      }

      allTasks.push({
        name: name.replace(/^[　\s]*/, ''),
        school: '共通',
        department: '共通',
        requirements,
        startLocation: { desc: startLocationDesc },
        steps,
        rewards,
        tips: [ `任務地圖: ${mapText}` ],
        notes: [ '每日一次性任務' ],
        customizedName: ''
      });
    }
  });
}

// ==========================================
// 5. 解析 tech-3.aspx (20120423_action)
// ==========================================
function parseTech3() {
  const filePath = path.join(__dirname, 'html_dumps', 'www.ran2.com.tw_gamesite_event_20120423_action_tech-3.aspx');
  if (!fs.existsSync(filePath)) return;
  const html = fs.readFileSync(filePath, 'utf-8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const startLocationDesc = '《聖門學院》座標(60,7) / 《鳳凰學院》座標(102,11) / 《玄巖學院》座標(70,10) (NPC: 功夫女孩)';

  const tables = doc.querySelectorAll('table');
  tables.forEach(table => {
    const tds = table.querySelectorAll('td');
    if (tds.length === 9) {
      const name = cleanText(tds[0].textContent);
      if (name === '任務名稱' || name.includes('地點') || name === '') return;

      const condText = cleanText(tds[2].textContent);
      const stepsText = cleanText(tds[4].textContent);
      const typeText = cleanText(tds[6].textContent);
      const rewardText = cleanText(tds[8].textContent);

      const requirements = [{ desc: condText }];

      // 解析步驟
      const steps = stepsText.split('\n').map(l => l.replace(/^[　\s]*[□\-\*•]?\s*/, '').trim()).filter(Boolean).map(desc => ({ desc }));

      const rewards = { exp: 0, statsPoints: 0, skillPoints: 0, customRewards: [] };
      const expMatch = rewardText.match(/EXP\s*[:：]?\s*([\d,]+)/i);
      if (expMatch) {
        rewards.exp = parseInt(expMatch[1].replace(/,/g, ''), 10);
      } else {
        rewards.customRewards.push({ desc: rewardText.replace(/^[　\s]*/, ''), url: '' });
      }

      allTasks.push({
        name: name.replace(/^[　\s]*/, ''),
        school: '共通',
        department: '共通',
        requirements,
        startLocation: { desc: startLocationDesc },
        steps,
        rewards,
        tips: [ `任務類型: ${typeText}` ],
        notes: [],
        customizedName: ''
      });
    }
  });
}

// ==========================================
// 6. 解析 p03.aspx (20110524_action)
// ==========================================
function parseP03() {
  const filePath = path.join(__dirname, 'html_dumps', 'www.ran2.com.tw_gamesite_event_20110524_action_p03.aspx');
  if (!fs.existsSync(filePath)) return;
  const html = fs.readFileSync(filePath, 'utf-8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // 對照 NPC 地點與座標
  const npcCoords = {
    '史詩': '【聖門洞】 座標(68,102)',
    '倖存者-鳳恩星': '【聖門洞】 座標(126,117)',
    '倖存者-車仁景': '【聖門洞】 座標(126,115)',
    '倖存者-潘智英': '【聖門洞】 座標(127,115)',
    '倖存者-宗恩哲': '【聖門洞】 座標(127,117)',
    '海潔王': '【綜合碼頭】 座標(69,126)',
    '各學院學生主任': '各學院本館 (NPC: 學生主任)'
  };

  // 共有 16 個任務 table，依序屬於：
  // 1-4: 劍道部 (車仁景)
  // 5-8: 弓箭部 (鳳恩星)
  // 9-12: 格鬥部 (宗恩哲)
  // 13-16: 氣功部 (潘智英)
  const departments = [
    { dept: '劍道部', startIdx: 0, endIdx: 3 },
    { dept: '弓箭部', startIdx: 4, endIdx: 7 },
    { dept: '格鬥部', startIdx: 8, endIdx: 11 },
    { dept: '氣功部', startIdx: 12, endIdx: 15 }
  ];

  const tables = doc.querySelectorAll('table.tab');
  tables.forEach((table, idx) => {
    const rows = table.querySelectorAll('tr');
    let taskName = '';
    const th = table.querySelector('th');
    if (th) {
      taskName = cleanText(th.textContent).replace(/^[=\s]+|[=\s]+$/g, '');
    }

    let reqText = '';
    let npcText = '';
    let flowText = '';
    let rewardText = '';

    rows.forEach(row => {
      const tds = row.querySelectorAll('td');
      if (tds.length === 2) {
        const title = cleanText(tds[0].textContent);
        const val = cleanText(tds[1].textContent);
        if (title === '任務限制') reqText = val;
        else if (title === '接取任務NPC') npcText = val.replace(/[『』'"]/g, '');
        else if (title === '任務流程') flowText = val;
        else if (title === '任務完成取得物品') rewardText = val;
      }
    });

    // 確定部門與學系
    let dept = '共通';
    departments.forEach(d => {
      if (idx >= d.startIdx && idx <= d.endIdx) {
        dept = d.dept;
      }
    });

    const startLocationDesc = npcCoords[npcText] ? `${npcCoords[npcText]} (NPC: ${npcText})` : `NPC: ${npcText}`;

    // 解析限制條件
    const requirements = [];
    if (reqText.includes('等級需滿')) {
      const lvMatch = reqText.match(/等級需滿\s*(\d+)/);
      if (lvMatch) {
        requirements.push({ desc: `達到 Lv.${lvMatch[1]}` });
      }
    } else if (reqText.includes('前置任務─')) {
      const preName = reqText.replace('前置任務─', '').trim();
      requirements.push({ desc: `完成 【劇情】${preName}`, isPrerequisite: true, url: '' });
    } else {
      requirements.push({ desc: reqText });
    }

    // 解析流程為 steps
    const steps = flowText.split('\n').map(l => l.replace(/^[　\s]*[□\-\*•]?\s*/, '').trim()).filter(Boolean).map(desc => ({ desc }));

    const rewards = { exp: 0, statsPoints: 0, skillPoints: 0, customRewards: [{ desc: rewardText, url: '' }] };

    allTasks.push({
      name: taskName,
      school: '共通',
      department: dept,
      requirements,
      startLocation: { desc: startLocationDesc },
      steps,
      rewards,
      tips: [],
      notes: [],
      customizedName: ''
    });
  });
}

// 執行所有解析
parsePage06();
parsePage2();
parseTech1();
parseTech2();
parseTech3();
parseP03();

console.log(`\nParsed all tasks! Total count: ${allTasks.length}`);

// ==========================================
// 7. 重複處理規則與 ID 計算
// ==========================================
const nameGroups = {};
allTasks.forEach(task => {
  if (!nameGroups[task.name]) {
    nameGroups[task.name] = [];
  }
  nameGroups[task.name].push(task);
});

const finalTasks = [];

for (let name of Object.keys(nameGroups)) {
  const group = nameGroups[name];
  if (group.length === 1) {
    const task = group[0];
    task.customizedName = '';
    finalTasks.push(task);
  } else {
    // 檢查如何區分重複
    const schoolSet = new Set(group.map(t => t.school));
    const deptSet = new Set(group.map(t => t.department));
    const levelSet = new Set(group.map(t => {
      const req = t.requirements[0];
      return req ? req.desc : '';
    }));

    const diffSchool = schoolSet.size > 1;
    const diffDept = deptSet.size > 1;
    const diffLevel = levelSet.size > 1;

    group.forEach(task => {
      let customizedName = task.name;
      const qualifiers = [];

      if (diffSchool) qualifiers.push(task.school);
      if (diffDept && task.department !== '共通') qualifiers.push(task.department);
      
      const req = task.requirements[0];
      if (diffLevel && req) {
        const cleanReq = req.desc.replace(/達到|等級限制:|接取條件:/g, '').trim();
        qualifiers.push(cleanReq);
      }

      if (qualifiers.length > 0) {
        customizedName += ` [${qualifiers.join('][')}]`;
      }

      task.customizedName = customizedName === task.name ? '' : customizedName;
      finalTasks.push(task);
    });
  }
}

// 加上 ID 與回填 URL 連結
const taskNameToIdMap = new Map();
finalTasks.forEach(task => {
  const nameToHash = (task.customizedName && task.customizedName.trim()) ? task.customizedName : task.name;
  task.id = getTaskId(nameToHash);
  taskNameToIdMap.set(task.name, task.id);
  if (task.customizedName) {
    taskNameToIdMap.set(task.customizedName, task.id);
  }
});

// URL 回填
finalTasks.forEach(task => {
  task.requirements.forEach(req => {
    if (req.isPrerequisite) {
      const match = req.desc.match(/完成\s*【劇情】(.*)/);
      if (match) {
        const preTaskName = match[1].trim();
        if (taskNameToIdMap.has(preTaskName)) {
          req.url = `/tasks/${taskNameToIdMap.get(preTaskName)}`;
        } else {
          // 模糊比對
          let matchedId = null;
          for (let [key, id] of taskNameToIdMap.entries()) {
            if (key.startsWith(preTaskName) && key !== preTaskName) {
              matchedId = id;
              break;
            }
          }
          if (matchedId) {
            req.url = `/tasks/${matchedId}`;
          }
        }
      }
    }
  });
});

// 全域壓縮空格
function compressObjectSpaces(obj) {
  if (typeof obj === 'string') {
    return obj.replace(/[ \t]+/g, ' ').trim();
  }
  if (Array.isArray(obj)) {
    return obj.map(compressObjectSpaces);
  }
  if (typeof obj === 'object' && obj !== null) {
    const newObj = {};
    for (let key of Object.keys(obj)) {
      newObj[key] = compressObjectSpaces(obj[key]);
    }
    return newObj;
  }
  return obj;
}

const cleanedTasks = compressObjectSpaces(finalTasks);

// 寫入檔案
const newTasksPath = path.join(__dirname, '..', 'raw-data', 'tasks', 'new-task-data.json');
fs.writeFileSync(newTasksPath, JSON.stringify(cleanedTasks, null, 2), 'utf-8');
console.log(`Saved new tasks to ${newTasksPath}`);

const brainNewTasksPath = 'C:\\Users\\soup1\\.gemini\\antigravity\\brain\\a3ad10b3-b7fe-457a-98dc-05b35f877fa9\\new-task-data.json';
fs.writeFileSync(brainNewTasksPath, JSON.stringify(cleanedTasks, null, 2), 'utf-8');
console.log(`Synced to brain store.`);
