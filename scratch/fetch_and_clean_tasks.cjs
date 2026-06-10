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

// 雜湊函數：根據字串產生 task-[hash] ID
function getTaskId(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return 'task-' + Math.abs(hash).toString(16);
}

// 直接抓取 HTML (預設使用 utf-8)
async function fetchHtml(url) {
  console.log(`Fetching: ${url}`);
  const res = await fetch(url);
  return await res.text();
}

// 簡單的 HTML 標籤去除與多空格壓縮
function cleanHtml(htmlStr) {
  if (!htmlStr) return '';
  return htmlStr
    .replace(/<br\s*\/?>/gi, '\n') // 把 br 轉成換行
    .replace(/<[^>]+>/g, '') // 去除 HTML 標籤
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ') // 壓縮多個空格或 tab 為一個空格
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
    // 移除 (NPC: 未知)
    return { desc: text, image: '' };
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
    // 1. 匹配 "Level N，已完成「XXXX」" / "Level N，已完成'XXXX'"
    const lvPrereqMatch = item.match(/(?:Level\s*|Lv\.\s*|等級達到)\s*(\d+)\s*[，,]\s*(?:已)?完成[「'']([^」'']+)?[」'']/i);
    if (lvPrereqMatch) {
      reqs.push({ desc: `達到 Lv.${lvPrereqMatch[1]}` });
      reqs.push({ desc: `完成 【劇情】${lvPrereqMatch[2].trim()}`, isPrerequisite: true, url: '' });
      continue;
    }

    // 2. 匹配 "完成「XXXXX」和「YYYYY」"
    const twoPrereqsMatch = item.match(/完成[「'']([^」'']+)?[」'']\s*和\s*[「'']([^」'']+)?[」'']/);
    if (twoPrereqsMatch) {
      reqs.push({ desc: `完成 【劇情】${twoPrereqsMatch[1].trim()}`, isPrerequisite: true, url: '' });
      reqs.push({ desc: `完成 【劇情】${twoPrereqsMatch[2].trim()}`, isPrerequisite: true, url: '' });
      continue;
    }

    // 3. 匹配 "解過【XXXXX】任務"
    const playedMatch = item.match(/解過\s*[【「'']([^】」'']+)?[】」'']\s*任務/);
    if (playedMatch) {
      reqs.push({ desc: `完成 【劇情】${playedMatch[1].trim()}`, isPrerequisite: true, url: '' });
      continue;
    }

    // 4. 匹配 "需完成【XXXXX】 失敗可再接、成功後不可重覆接取"
    const needMatch = item.match(/需?完成\s*[【「'']([^】」'']+)?[】」'']\s*(?:失敗可再接、成功後不可重覆接取)?/);
    if (needMatch && item.includes('失敗可再接')) {
      reqs.push({ desc: `完成 【劇情】${needMatch[1].trim()}`, isPrerequisite: true, url: '' });
      continue;
    }

    // 5. 等級限制匹配 (支援 Level N 多空格、Lv. N、等級達到 N)
    const lvMatch = item.match(/(?:Level\s*|Lv\.\s*|等級(?:達到)?\s*)(\d+)/i);
    if (lvMatch) {
      reqs.push({ desc: `達到 Lv.${lvMatch[1]}` });
      continue;
    }

    // 6. 劇情完成匹配
    if (item.includes('完畢') || item.includes('完成') || item.includes('已執行') || item.includes('未執行')) {
      let taskName = item.replace(/完畢|完成|需|的委託|『|』|「|」|【|】|'|"/g, '').trim();
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

  // 1. 優先處理經驗值，防止其內的 "," 被 comma 分割
  let expText = "";
  const expMatch = clean.match(/(?:經驗值|經驗)\s*[:：]?\s*([\d,]+)/);
  if (expMatch) {
    const expStr = expMatch[1].replace(/,/g, '');
    result.exp = parseInt(expStr, 10);
    expText = expMatch[0];
  }

  // 移除經驗值部分後剩餘的文字
  const remainingText = expText ? clean.replace(expText, '') : clean;

  const items = remainingText.split(/[、，,\n]/).map(l => l.trim()).filter(Boolean);

  for (let item of items) {
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

// 提取等級限制
function getReqLevel(task) {
  for (let req of task.requirements) {
    const lvMatch = req.desc.match(/等級達到\s*Lv\.\s*(\d+)/i);
    if (lvMatch) {
      return parseInt(lvMatch[1], 10);
    }
  }
  return null;
}

async function run() {
  const allRawTasks = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      const html = await fetchHtml(url);
      
      // 判定學院
      let school = '共通';
      if (url.includes('sub02_01_0501') || url.includes('sub02_01_0502')) {
        school = '聖門';
      } else if (url.includes('sub02_01_0503') || url.includes('sub02_01_0504')) {
        school = '鳳凰';
      } else if (url.includes('sub02_01_0505') || url.includes('sub02_01_0506')) {
        school = '玄嚴';
      }

      // 是否為部門分流網頁
      const isDeptPage = url.includes('sub02_01_0502') || url.includes('sub02_01_0504') || url.includes('sub02_01_0506');
      
      const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let match;
      const rows = [];
      while ((match = trRegex.exec(html)) !== null) {
        rows.push(match[1]);
      }
      
      console.log(`Found ${rows.length} rows in ${url.split('/').pop()}`);
      
      let currentDept = '共通';
      let parsedCount = 0;

      for (let row of rows) {
        // 1. 檢查部門分割
        const deptHeaderMatch = row.match(/colspan="5"[^>]*>([\s\S]*?)<\/td>/i);
        if (isDeptPage && deptHeaderMatch) {
          const headerText = cleanHtml(deptHeaderMatch[1]);
          if (headerText.includes('-')) {
            const deptPart = headerText.split('-')[1].trim();
            if (deptPart.includes('劍道')) currentDept = '劍道部';
            else if (deptPart.includes('格鬥')) currentDept = '格鬥部';
            else if (deptPart.includes('氣功')) currentDept = '氣功部';
            else if (deptPart.includes('弓箭') || deptPart.includes('弓手')) currentDept = '弓箭部';
            console.log(`Switching department to: ${currentDept} (from header: "${headerText}")`);
          }
          continue;
        }

        // 2. 正常任務資料列
        const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        let tdMatch;
        const tds = [];
        while ((tdMatch = tdRegex.exec(row)) !== null) {
          tds.push(tdMatch[1]);
        }
        
        if (tds.length === 5) {
          const name = cleanHtml(tds[0]);
          
          // 過濾表頭
          if (!name || name === '任務名稱' || name === '請選擇任務 :' || name.includes('各部門共通任務') || name.includes('部門共同任務')) {
            continue;
          }
          
          const startLocation = parseStartLocation(tds[1]);
          const requirements = parseRequirements(tds[2]);
          const rewards = parseRewards(tds[3]);
          
          // 清理 customRewards 中誤入的 技能點數N 與 屬性點數N
          const filteredCustom = [];
          for (let reward of rewards.customRewards) {
            const skillMatch = reward.desc.match(/^技能點數\s*(\d+)$/);
            const statsMatch = reward.desc.match(/^屬性點數\s*(\d+)$/);
            
            if (skillMatch) {
              rewards.skillPoints += parseInt(skillMatch[1], 10);
            } else if (statsMatch) {
              rewards.statsPoints += parseInt(statsMatch[1], 10);
            } else {
              filteredCustom.push(reward);
            }
          }
          rewards.customRewards = filteredCustom;

          // 檢查「其他」欄位是否含有「尚未執行」
          if (!url.includes('sub02_01_05.aspx') && tds[4]) {
            const otherText = cleanHtml(tds[4]);
            const notRunMatch = otherText.match(/尚未執行[「'']([^」'']+)[」'']/);
            if (notRunMatch) {
              const reqTaskName = notRunMatch[1].trim();
              requirements.push({ desc: `尚未執行「${reqTaskName}」` });
              console.log(`Added requirement "尚未執行「${reqTaskName}」" to task "${name}"`);
            }
          }
          
          const taskObj = {
            name: name,
            school: school,
            department: currentDept,
            requirements: requirements,
            startLocation: startLocation,
            steps: [{ desc: '完成任務指示的所有步驟' }],
            rewards: rewards,
            tips: [],
            notes: [],
            sourceUrl: url.split('/').pop()
          };
          
          allRawTasks.push(taskObj);
          parsedCount++;
        }
      }
      console.log(`Parsed ${parsedCount} raw tasks from ${url.split('/').pop()}`);
    } catch (err) {
      console.error(`Error processing ${url}:`, err);
    }
  }

  console.log(`\nTotal raw tasks collected: ${allRawTasks.length}`);

  // 根據任務名稱分組
  const groups = {};
  for (let task of allRawTasks) {
    if (!groups[task.name]) {
      groups[task.name] = [];
    }
    groups[task.name].push(task);
  }

  const finalTasks = [];
  const differenceTasks = [];

  for (let name of Object.keys(groups)) {
    const group = groups[name];
    
    if (group.length === 1) {
      const task = group[0];
      task.customizedName = "";
      finalTasks.push(task);
    } else {
      // 處理重複
      const schoolSet = new Set(group.map(t => t.school));
      const deptSet = new Set(group.map(t => t.department));
      const levelSet = new Set(group.map(t => getReqLevel(t)));

      const diffSchool = schoolSet.size > 1;
      const diffDept = deptSet.size > 1;
      const diffLevel = levelSet.size > 1;

      // 為這組中的每筆任務計算客製化名稱
      const customizedGroup = group.map(task => {
        let customizedName = task.name;
        
        // 學院與部門區分
        if (diffSchool && diffDept) {
          customizedName += ` [${task.school}][${task.department}]`;
        } else if (diffSchool) {
          customizedName += ` [${task.school}]`;
        } else if (diffDept) {
          customizedName += ` [${task.department}]`;
        }

        // 等級限制區分
        if (diffLevel) {
          const lv = getReqLevel(task);
          if (lv !== null) {
            customizedName += ` (Lv.${lv})`;
          }
        }

        return {
          ...task,
          customizedName: customizedName === task.name ? "" : customizedName
        };
      });

      // 檢查 customizedGroup 當中是否仍有重複
      const nameCounts = {};
      customizedGroup.forEach(t => {
        const key = t.customizedName || t.name;
        nameCounts[key] = (nameCounts[key] || 0) + 1;
      });

      customizedGroup.forEach(t => {
        const key = t.customizedName || t.name;
        if (nameCounts[key] > 1) {
          // 無法排除的重複
          differenceTasks.push({
            name: t.name,
            reason: `相同學系、部門與等級限制的完全重複任務: "${key}" (來源: ${t.sourceUrl})`
          });
        } else {
          finalTasks.push(t);
        }
      });
    }
  }

  console.log(`\nFiltered and cleaned unique tasks: ${finalTasks.length}`);
  console.log(`Excluded duplicate tasks: ${differenceTasks.length}`);

  // 計算雜湊 ID
  for (let task of finalTasks) {
    const nameToHash = (task.customizedName && task.customizedName.trim()) ? task.customizedName : task.name;
    task.id = getTaskId(nameToHash);
  }

  // 建立名稱對應 ID 的 Map，便於前置任務回填
  const taskNameToIdMap = new Map();
  for (let task of finalTasks) {
    taskNameToIdMap.set(task.name, task.id);
    if (task.customizedName) {
      taskNameToIdMap.set(task.customizedName, task.id);
    }
  }

  // 回填前置任務 ID 連結 url
  for (let task of finalTasks) {
    for (let req of task.requirements) {
      if (req.isPrerequisite) {
        const match = req.desc.match(/完成\s*【劇情】(.*)/);
        if (match) {
          const preTaskName = match[1].trim();
          if (taskNameToIdMap.has(preTaskName)) {
            req.url = `/tasks/${taskNameToIdMap.get(preTaskName)}`;
          } else {
            // 模糊搜尋有無加學院/部門/等級的版本
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
    }
  }

  // 整理手套和防具的重複獎勵
  for (let task of finalTasks) {
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

  // 套用清理規則
  for (let task of finalTasks) {
    // 1. startLocation.desc 文字包含 "自動觸發" 的，直接改寫成 "自動觸發"
    if (task.startLocation && task.startLocation.desc && task.startLocation.desc.includes('自動觸發')) {
      task.startLocation.desc = '自動觸發';
    }

    // 1.2 startLocation.desc 移除 "(NPC: 未知)"
    if (task.startLocation && task.startLocation.desc) {
      task.startLocation.desc = task.startLocation.desc.replace(/\s*\(NPC:\s*未知\)/g, '').trim();
    }

    // 2. steps.desc 文字為 "完成任務指示的所有步驟"，調整為 "待補充"
    if (task.steps && task.steps.length > 0) {
      task.steps.forEach(step => {
        if (step.desc === '完成任務指示的所有步驟') {
          step.desc = '待補充';
        }
      });
    }

    // 3. 確保 tips 內沒有 "待補充"
    if (task.tips) {
      task.tips = task.tips.filter(t => t !== '待補充');
    }

    // 4. 清理 sourceUrl 屬性 (不需要寫入正式 of output schema)
    delete task.sourceUrl;
  }

  // 依重複項目對應 Task Guide schema 格式 (僅帶有 name)
  const differenceTasksFixed = differenceTasks.map(t => ({
    name: t.name,
    school: "",
    department: "",
    requirements: [{ desc: "" }],
    startLocation: { desc: "" },
    steps: [{ desc: "待補充" }],
    rewards: {
      exp: 0,
      statsPoints: 0,
      skillPoints: 0,
      customRewards: [{ desc: "" }]
    },
    tips: [],
    notes: [],
    customizedName: "",
    id: ""
  }));

  // 全域壓縮多個空格為一個空格的遞迴清理函數
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

  const cleanedFinalTasks = compressObjectSpaces(finalTasks);
  const cleanedDiffTasks = compressObjectSpaces(differenceTasks);
  const cleanedDiffTasksFixed = compressObjectSpaces(differenceTasksFixed);

  // 寫入檔案
  const tasksDest = path.join(__dirname, '..', 'raw-data', 'tasks', 'official-task-data.json');
  const diffDest = path.join(__dirname, '..', 'raw-data', 'tasks', 'official-difference-task-data.json');
  const diffFixedDest = path.join(__dirname, '..', 'raw-data', 'tasks', 'official-defference-task-data-fixed.json');
  
  // 確保目錄存在
  fs.mkdirSync(path.dirname(tasksDest), { recursive: true });

  fs.writeFileSync(tasksDest, JSON.stringify(cleanedFinalTasks, null, 2), 'utf-8');
  fs.writeFileSync(diffDest, JSON.stringify(cleanedDiffTasks, null, 2), 'utf-8');
  fs.writeFileSync(diffFixedDest, JSON.stringify(cleanedDiffTasksFixed, null, 2), 'utf-8');

  console.log(`Saved tasks to ${tasksDest}`);
  console.log(`Saved differences to ${diffDest}`);
  console.log(`Saved fixed differences to ${diffFixedDest}`);

  // 同步一份到 brain store
  const brainTasksDest = 'C:\\Users\\soup1\\.gemini\\antigravity\\brain\\a3ad10b3-b7fe-457a-98dc-05b35f877fa9\\official-task-data.json';
  const brainDiffDest = 'C:\\Users\\soup1\\.gemini\\antigravity\\brain\\a3ad10b3-b7fe-457a-98dc-05b35f877fa9\\official-difference-task-data.json';
  const brainDiffFixedDest = 'C:\\Users\\soup1\\.gemini\\antigravity\\brain\\a3ad10b3-b7fe-457a-98dc-05b35f877fa9\\official-defference-task-data-fixed.json';
  fs.writeFileSync(brainTasksDest, JSON.stringify(cleanedFinalTasks, null, 2), 'utf-8');
  fs.writeFileSync(brainDiffDest, JSON.stringify(cleanedDiffTasks, null, 2), 'utf-8');
  fs.writeFileSync(brainDiffFixedDest, JSON.stringify(cleanedDiffTasksFixed, null, 2), 'utf-8');
  console.log(`Synced to brain store.`);
}

run();
