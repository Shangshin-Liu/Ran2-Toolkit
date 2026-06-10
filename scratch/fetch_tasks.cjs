const fs = require('fs');
const path = require('path');

const urls = [
  'https://www.ran.com.tw/gamesite/info/sub02_01_05.aspx',
  'https://www.ran.com.tw/gamesite/info/sub02_01_0501.aspx',
  'https://www.ran.com.tw/gamesite/info/sub02_01_0502.aspx',
  'https://www.ran.com.tw/gamesite/info/sub02_01_0503.aspx',
  'https://www.ran.com.tw/gamesite/info/sub02_01_0504.aspx',
  'https://www.ran.com.tw/gamesite/info/sub02_01_0505.aspx',
  'https://www.ran.com.tw/gamesite/info/sub02_01_0506.aspx'
];

// 雜湊函數：根據任務名稱產生唯一的 task-[hash] ID
function getTaskId(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0; // 轉為 32 位元整數
  }
  return 'task-' + Math.abs(hash).toString(16);
}

// 直接抓取 HTML (預設使用 utf-8)
async function fetchHtml(url) {
  console.log(`Fetching: ${url}`);
  const res = await fetch(url);
  return await res.text();
}

// 簡單的 HTML 標籤去除
function cleanHtml(htmlStr) {
  if (!htmlStr) return '';
  return htmlStr
    .replace(/<br\s*\/?>/gi, '\n') // 把 br 轉成換行
    .replace(/<[^>]+>/g, '') // 去除 HTML 標籤
    .replace(/&nbsp;/g, ' ')
    .trim();
}

// 解析接取地點與 NPC
function parseStartLocation(rawText) {
  const clean = cleanHtml(rawText);
  if (!clean) return { desc: '自動接取 (NPC: 自動接取)', image: '' };

  const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);
  
  if (lines.length === 0) {
    return { desc: '自動接取 (NPC: 自動接取)', image: '' };
  }

  if (lines.length === 1) {
    const text = lines[0];
    if (text.includes('自動觸發') || text.includes('自動接取')) {
      return { desc: `${text} (NPC: 自動接取)`, image: '' };
    }
    return { desc: `${text} (NPC: 未知)`, image: '' };
  }

  const firstLine = lines[0];
  const remaining = lines.slice(1).join(' ');

  if (firstLine.startsWith('【') || firstLine.startsWith('《') || firstLine.startsWith('在') || firstLine.includes('確認')) {
    return { desc: `${lines.join(' ')} (NPC: 自動接取)`, image: '' };
  }

  return { desc: `${remaining} (NPC: ${firstLine})`, image: '' };
}

// 解析限制條件
function parseRequirements(rawText) {
  const clean = cleanHtml(rawText);
  if (!clean) return [];

  const items = clean.split('\n').map(l => l.trim()).filter(Boolean);
  const reqs = [];

  for (let item of items) {
    const lvMatch = item.match(/(?:Level__?|Lv\.|等級(?:達到)?\s*)(\d+)/i);
    if (lvMatch) {
      reqs.push({ desc: `等級達到 Lv. ${lvMatch[1]}` });
      continue;
    }

    if (item.includes('完畢') || item.includes('完成') || item.includes('已執行') || item.includes('未執行')) {
      let taskName = item.replace(/完畢|完成|需|的委託|『|』|「|」/g, '').trim();
      reqs.push({ desc: `完成 【劇情】${taskName}`, isPrerequisite: true, url: '' });
      continue;
    }

    reqs.push({ desc: item });
  }

  return reqs;
}

// 解析獎勵
function parseRewards(rawText) {
  const clean = cleanHtml(rawText);
  const result = {
    exp: 0,
    statsPoints: 0,
    skillPoints: 0,
    customRewards: []
  };

  if (!clean) return result;

  const items = clean.split(/[、，,\n]/).map(l => l.trim()).filter(Boolean);

  for (let item of items) {
    // 檢查經驗值
    const expMatch = item.match(/(?:經驗值|經驗)\s*[:：]?\s*(\d+)/);
    if (expMatch) {
      result.exp += parseInt(expMatch[1], 10);
      continue;
    }

    const statsMatch = item.match(/(?:屬性|能力點?)\s*[:：]?\s*(\d+)/);
    if (statsMatch) {
      result.statsPoints += parseInt(statsMatch[1], 10);
      continue;
    }

    const skillMatch = item.match(/(?:技能點?)\s*[:：]?\s*(\d+)/);
    if (skillMatch) {
      result.skillPoints += parseInt(skillMatch[1], 10);
      continue;
    }

    result.customRewards.push({ desc: item, url: '' });
  }

  return result;
}

// 合併重複任務，並記錄在 differencesLog 中
function mergeTasks(existing, incoming, differencesLog) {
  const name = existing.name;
  if (!differencesLog[name]) {
    differencesLog[name] = [];
  }

  const diffs = [];

  // 1. 比較接取地點
  if (existing.startLocation.desc !== incoming.startLocation.desc) {
    diffs.push(`接取地點不同: "${existing.startLocation.desc}" vs "${incoming.startLocation.desc}"`);
    if (existing.startLocation.desc.includes('自動接取') && !incoming.startLocation.desc.includes('自動接取')) {
      existing.startLocation.desc = incoming.startLocation.desc;
    } else if (!existing.startLocation.desc.includes('自動接取') && incoming.startLocation.desc.includes('自動接取')) {
      // 保持不變
    } else if (!existing.startLocation.desc.includes(incoming.startLocation.desc) && !incoming.startLocation.desc.includes(existing.startLocation.desc)) {
      existing.startLocation.desc += ` 或 ${incoming.startLocation.desc}`;
    }
  }

  // 2. 比較限制條件
  const existingReqs = existing.requirements.map(r => r.desc);
  const incomingReqs = incoming.requirements.map(r => r.desc);
  const reqDiffs = incomingReqs.filter(r => !existingReqs.includes(r));
  if (reqDiffs.length > 0) {
    diffs.push(`限制條件不同: 額外限制 [${reqDiffs.join(', ')}]`);
    for (let req of incoming.requirements) {
      if (!existingReqs.includes(req.desc)) {
        existing.requirements.push(req);
      }
    }
  }

  // 3. 比較經驗值、屬性點/技能點
  if (existing.rewards.exp !== incoming.rewards.exp) {
    diffs.push(`經驗值不同: ${existing.rewards.exp} vs ${incoming.rewards.exp}`);
    existing.rewards.exp = Math.max(existing.rewards.exp, incoming.rewards.exp);
  }
  if (existing.rewards.statsPoints !== incoming.rewards.statsPoints) {
    diffs.push(`屬性點不同: ${existing.rewards.statsPoints} vs ${incoming.rewards.statsPoints}`);
    existing.rewards.statsPoints = Math.max(existing.rewards.statsPoints, incoming.rewards.statsPoints);
  }
  if (existing.rewards.skillPoints !== incoming.rewards.skillPoints) {
    diffs.push(`技能點不同: ${existing.rewards.skillPoints} vs ${incoming.rewards.skillPoints}`);
    existing.rewards.skillPoints = Math.max(existing.rewards.skillPoints, incoming.rewards.skillPoints);
  }

  // 4. 比較自訂獎勵
  const existingCustom = existing.rewards.customRewards.map(c => c.desc);
  const incomingCustom = incoming.rewards.customRewards.map(c => c.desc);
  const customDiffs = incomingCustom.filter(c => !existingCustom.includes(c));
  if (customDiffs.length > 0) {
    diffs.push(`獎勵內容不同: 額外獎勵 [${customDiffs.join(', ')}]`);
    for (let reward of incoming.rewards.customRewards) {
      if (!existingCustom.includes(reward.desc)) {
        existing.rewards.customRewards.push(reward);
      }
    }
  }

  if (diffs.length > 0) {
    differencesLog[name].push(...diffs);
  }
}

// 主執行流程
async function run() {
  const allTasksMap = new Map();
  const differencesLog = {};

  for (let url of urls) {
    try {
      const html = await fetchHtml(url);
      
      const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let match;
      const rows = [];
      
      while ((match = trRegex.exec(html)) !== null) {
        rows.push(match[1]);
      }
      
      console.log(`Found ${rows.length} rows in ${url.split('/').pop()}`);
      
      let parsedCount = 0;
      for (let row of rows) {
        const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        let tdMatch;
        const tds = [];
        while ((tdMatch = tdRegex.exec(row)) !== null) {
          tds.push(tdMatch[1]);
        }
        
        if (tds.length === 5) {
          const name = cleanHtml(tds[0]);
          
          if (!name || name === '任務名稱' || name === '請選擇任務 :' || name.includes('各部門共通任務') || name.includes('部門共同任務')) {
            continue;
          }
          
          const startLocation = parseStartLocation(tds[1]);
          const requirements = parseRequirements(tds[2]);
          const rewards = parseRewards(tds[3]);
          
          // 偵測學院與部門
          let school = '共通';
          let department = '共通';
          
          if (url.includes('sub02_01_0501') || url.includes('sub02_01_0502')) {
            school = '聖門';
          } else if (url.includes('sub02_01_0503') || url.includes('sub02_01_0504')) {
            school = '鳳凰';
          } else if (url.includes('sub02_01_0505') || url.includes('sub02_01_0506')) {
            school = '玄嚴';
          }
          
          if (url.includes('sub02_01_0502') || url.includes('sub02_01_0504') || url.includes('sub02_01_0506')) {
            const reqText = (requirements.map(r => r.desc).join(' ') + ' ' + name).toLowerCase();
            if (reqText.includes('格鬥')) department = '格鬥部';
            else if (reqText.includes('劍道')) department = '劍道部';
            else if (reqText.includes('氣功')) department = '氣功部';
            else if (reqText.includes('弓箭') || reqText.includes('弓手')) department = '弓箭部';
          }
          
          const taskObj = {
            id: getTaskId(name),
            name: name,
            school: school,
            department: department,
            requirements: requirements,
            startLocation: startLocation,
            steps: [{ desc: '完成任務指示的所有步驟' }],
            rewards: rewards,
            tips: [],
            notes: []
          };
          
          if (allTasksMap.has(name)) {
            mergeTasks(allTasksMap.get(name), taskObj, differencesLog);
          } else {
            allTasksMap.set(name, taskObj);
          }
          parsedCount++;
        }
      }
      console.log(`Parsed ${parsedCount} tasks from this page.`);
    } catch (err) {
      console.error(`Error processing ${url}:`, err);
    }
  }

  // 將 map 轉換為陣列，並過濾排除出現在 differencesLog 中的重複任務
  const duplicatedSet = new Set(Object.keys(differencesLog));
  console.log(`Excluding ${duplicatedSet.size} duplicated tasks.`);
  
  const tasksList = Array.from(allTasksMap.values()).filter(t => !duplicatedSet.has(t.name));
  console.log(`Remaining unique and filtered tasks: ${tasksList.length}`);

  // 第二階段：回填 url (這時的對應 id 都已經是雜湊 id 了)
  const taskNameToIdMap = new Map(tasksList.map(t => [t.name, t.id]));
  for (let task of tasksList) {
    for (let req of task.requirements) {
      if (req.isPrerequisite) {
        const match = req.desc.match(/完成\s*【劇情】(.*)/);
        if (match) {
          const preTaskName = match[1].trim();
          if (taskNameToIdMap.has(preTaskName)) {
            req.url = `/tasks/${taskNameToIdMap.get(preTaskName)}`;
          }
        }
      }
    }
  }

  // 整理手套和衣服的重複選項
  for (let task of tasksList) {
    const rewards = task.rewards.customRewards;
    const gloves = rewards.filter(r => r.desc.includes('C級精鋼') && r.desc.includes('手套'));
    if (gloves.length >= 3) {
      task.rewards.customRewards = rewards.filter(r => !(r.desc.includes('C級精鋼') && r.desc.includes('手套')));
      task.rewards.customRewards.push({ desc: 'C級精鋼手套(+5) ╳1 (依社團職業獲得對應手套)', url: '' });
    }

    const suits = rewards.filter(r => r.desc.includes('C級精鋼') && (r.desc.includes('服') || r.desc.includes('褲') || r.desc.includes('裙')));
    if (suits.length >= 4) {
      task.rewards.customRewards = rewards.filter(r => !(r.desc.includes('C級精鋼') && (r.desc.includes('服') || r.desc.includes('褲') || r.desc.includes('裙'))));
      task.rewards.customRewards.push({ desc: 'C級精鋼社團防具一套 (依社團職業獲得對應衣服與下衣)', url: '' });
    }
  }

  // 套用使用者指定的提示與 NPC 規則 (最新規格)
  for (let task of tasksList) {
    // 1. startLocation.desc 文字包含 "自動觸發" 的，直接改寫成 "自動觸發"
    if (task.startLocation && task.startLocation.desc && task.startLocation.desc.includes('自動觸發')) {
      task.startLocation.desc = '自動觸發';
    }

    // 2. steps.desc 文字為 "完成任務指示的所有步驟"，調整為 "待補充"
    if (task.steps && task.steps.length > 0) {
      task.steps.forEach(step => {
        if (step.desc === '完成任務指示的所有步驟') {
          step.desc = '待補充';
        }
      });
    }

    // 3. 確保 tips 內沒有 "待補充" 內容 (保持為空陣列)
    if (task.tips) {
      task.tips = task.tips.filter(t => t !== '待補充');
    }
  }

  // 寫入專案內的 raw-data/tasks/
  const outputPath = path.join(__dirname, '..', 'raw-data', 'tasks', 'official_tasks.json');
  fs.writeFileSync(outputPath, JSON.stringify(tasksList, null, 2), 'utf-8');
  console.log(`Saved tasks to ${outputPath}`);

  // 寫入專案內的 raw-data/tasks/ 的差異日誌
  const diffLogPath = path.join(__dirname, '..', 'raw-data', 'tasks', 'task_differences.json');
  fs.writeFileSync(diffLogPath, JSON.stringify(differencesLog, null, 2), 'utf-8');
  console.log(`Differences logged to ${diffLogPath}`);
}

run();
