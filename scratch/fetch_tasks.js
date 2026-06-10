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

// 專門解碼 Big5 並抓取 HTML
async function fetchHtml(url) {
  console.log(`Fetching: ${url}`);
  const res = await fetch(url);
  const arrayBuffer = await res.arrayBuffer();
  const decoder = new TextDecoder('big5');
  return decoder.decode(arrayBuffer);
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

  // 如果只有一行
  if (lines.length === 1) {
    const text = lines[0];
    if (text.includes('自動觸發') || text.includes('自動接取')) {
      return { desc: `${text} (NPC: 自動接取)`, image: '' };
    }
    return { desc: `${text} (NPC: 未知)`, image: '' };
  }

  // 如果有複數行，通常第一行是 NPC，後面是地點/座標
  // 例如:
  // 商洞警察
  // 【商洞】
  // 座標(X:121,Y:89)
  const firstLine = lines[0];
  const remaining = lines.slice(1).join(' ');

  // 判斷第一行是不是地圖名（如【商洞】或《中洞》之類）
  if (firstLine.startsWith('【') || firstLine.startsWith('《') || firstLine.startsWith('在') || firstLine.includes('確認')) {
    // 第一行就是地點了，那就當作自動接取或沒有明確 NPC
    return { desc: `${lines.join(' ')} (NPC: 自動接取)`, image: '' };
  }

  // 第一行是 NPC 名字
  return { desc: `${remaining} (NPC: ${firstLine})`, image: '' };
}

// 解析限制條件
function parseRequirements(rawText) {
  const clean = cleanHtml(rawText);
  if (!clean) return [];

  const items = clean.split('\n').map(l => l.trim()).filter(Boolean);
  const reqs = [];

  for (let item of items) {
    // 處理 Level / Lv.
    // 例如 Level__130, Lv.140, 等級達到28以上
    const lvMatch = item.match(/(?:Level__?|Lv\.|等級(?:達到)?\s*)(\d+)/i);
    if (lvMatch) {
      reqs.push({ desc: `等級達到 Lv. ${lvMatch[1]}` });
      continue;
    }

    // 處理任務完成前置
    // 例如：聖財團私立監獄完畢, 檢舉逃犯, 尋找朋友完畢, 需完成「武器店長」
    if (item.includes('完畢') || item.includes('完成') || item.includes('已執行') || item.includes('未執行')) {
      let taskName = item.replace(/完畢|完成|需|的委託|『|』|「|」/g, '').trim();
      reqs.push({ desc: `完成 【劇情】${taskName}`, isPrerequisite: true, url: '' });
      continue;
    }

    // 其他限制直接保留描述
    reqs.push({ desc: item });
  }

  return reqs;
}

// 解析獎勵
function parseRewards(rawText) {
  const clean = cleanHtml(rawText);
  const result = {
    statsPoints: 0,
    skillPoints: 0,
    customRewards: []
  };

  if (!clean) return result;

  // 用、或，或逗號或換行切割
  const items = clean.split(/[、，,\n]/).map(l => l.trim()).filter(Boolean);

  for (let item of items) {
    // 檢查屬性點/能力點
    const statsMatch = item.match(/(?:屬性|能力點?)\s*[:：]?\s*(\d+)/);
    if (statsMatch) {
      result.statsPoints += parseInt(statsMatch[1], 10);
      continue;
    }

    // 檢查技能點
    const skillMatch = item.match(/(?:技能點?)\s*[:：]?\s*(\d+)/);
    if (skillMatch) {
      result.skillPoints += parseInt(skillMatch[1], 10);
      continue;
    }

    // 經驗值或其他自訂獎勵
    result.customRewards.push({ desc: item, url: '' });
  }

  return result;
}

// 合併重複任務
function mergeTasks(existing, incoming, differencesLog) {
  const name = existing.name;
  if (!differencesLog[name]) {
    differencesLog[name] = [];
  }

  const diffs = [];

  // 1. 比較接取地點
  if (existing.startLocation.desc !== incoming.startLocation.desc) {
    diffs.push(`接取地點不同: "${existing.startLocation.desc}" vs "${incoming.startLocation.desc}"`);
    // 合併地點，如果其中一個是自動接取，用另一個；否則用 ' 或 ' 連接
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
    // 合併 requirements
    for (let req of incoming.requirements) {
      if (!existingReqs.includes(req.desc)) {
        existing.requirements.push(req);
      }
    }
  }

  // 3. 比較屬性點/技能點
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
    
    // 合併 customRewards (如果類似，可以合併，例如 C級精鋼武道手套 與 C級精鋼劍士手套)
    // 這裡我們直接做去重聯接，後續手動優化或在程式中列出
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
  let taskIdCounter = 1001; // 從 task-1001 開始，避免與現有 task-1 ~ task-4 衝突

  for (let url of urls) {
    try {
      const html = await fetchHtml(url);
      
      // 正則表達式抓取所有 <tr> 區塊
      const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let match;
      const rows = [];
      
      while ((match = trRegex.exec(html)) !== null) {
        rows.push(match[1]);
      }
      
      console.log(`Found ${rows.length} rows in ${url.split('/').pop()}`);
      
      let parsedCount = 0;
      for (let row of rows) {
        // 抓取 <td>
        const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        let tdMatch;
        const tds = [];
        while ((tdMatch = tdRegex.exec(row)) !== null) {
          tds.push(tdMatch[1]);
        }
        
        // 任務表欄位數為 5 (任務名稱, 接任務地點, 條件限制, 獎勵內容, 任務描述)
        if (tds.length === 5) {
          const name = cleanHtml(tds[0]);
          
          // 過濾掉表頭
          if (!name || name === '任務名稱' || name === '請選擇任務 :' || name.includes('各部門共通任務') || name.includes('部門共同任務')) {
            continue;
          }
          
          const startLocation = parseStartLocation(tds[1]);
          const requirements = parseRequirements(tds[2]);
          const rewards = parseRewards(tds[3]);
          
          const taskObj = {
            id: `task-${taskIdCounter++}`,
            name: name,
            requirements: requirements,
            startLocation: startLocation,
            steps: [{ desc: '完成任務指示的所有步驟' }],
            rewards: rewards,
            tips: [],
            notes: []
          };
          
          if (allTasksMap.has(name)) {
            // 重複的任務進行合併並記錄差異
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

  const tasksList = Array.from(allTasksMap.values());

  // 第二階段：回填 url (若前置任務在我們解析出來的清單中，補上任務連結)
  const taskNameToIdMap = new Map(tasksList.map(t => [t.name, t.id]));
  for (let task of tasksList) {
    for (let req of task.requirements) {
      if (req.isPrerequisite) {
        // 提取前置任務名稱，例如 "完成 【劇情】檢舉逃犯" -> "檢舉逃犯"
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

  // 將重複任務的客製化獎勵進行收斂優化，讓資料看起來乾淨
  // 例如：如果 customRewards 同時有 C級精鋼武道手套, C級精鋼劍士手套, C級精鋼氣功手套，可以簡化為一個
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

  // 寫入 JSON 檔案
  const outputPath = path.join(__dirname, 'official_tasks.json');
  fs.writeFileSync(outputPath, JSON.stringify(tasksList, null, 2), 'utf-8');
  console.log(`Saved ${tasksList.length} unique tasks to ${outputPath}`);

  // 寫入差異日誌
  const diffLogPath = path.join(__dirname, 'task_differences.json');
  fs.writeFileSync(diffLogPath, JSON.stringify(differencesLog, null, 2), 'utf-8');
  console.log(`Differences logged to ${diffLogPath}`);
}

run();
