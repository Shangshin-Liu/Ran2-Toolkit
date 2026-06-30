import fs from 'fs';
import path from 'path';

const dataPath = 'c:/Project/Ran2-Toolkit/src/assets/data/boxes.json';

const newBoxes = [
  {
    "name": "進階練功禮盒(7D)Lv.40",
    "sourceType": ["任務獎勵"],
    "obtains": ["完成任務【『KO』硬梆幫-薯叔】"],
    "items": [
      { "name": "歸魂修練念珠(5H)", "rate": 100 },
      { "name": "+7 亂好練武器(30D)", "rate": 100 },
      { "name": "+5 30等裝備一套(30D)", "rate": 100 }
    ],
    "note": "感謝Line大群提供的提供資訊"
  },
  {
    "name": "練功禮盒(7D)Lv.60",
    "sourceType": ["任務獎勵"],
    "obtains": ["完成任務【『KO』小狼狗】"],
    "items": [
      { "name": "歸魂修練念珠(5H)", "rate": 100 },
      { "name": "+7 亂好練武器(30D)", "rate": 100 },
      { "name": "+6 D級精良裝備一套(30D)", "rate": 100 }
    ],
    "note": "感謝Line大群提供的提供資訊"
  },
  {
    "name": "各部門結業(30D)禮盒【LV.151~200】",
    "sourceType": ["任務獎勵"],
    "obtains": ["完成任務【新手結業特別任務】"],
    "items": [
      { "name": "公車卡5T(7D)", "rate": 100 },
      { "name": "【亂好練】進階武器兌換卷", "rate": 100 },
      { "name": "+5 各部門C級精鋼裝一套(正)(30D)", "rate": 100 }
    ],
    "note": "裝備需151等才能穿上、201等會被系統強制脫落，務必在201之前找到其他裝備"
  },
  {
    "name": "練功禮盒(7D)LV.150",
    "sourceType": ["任務獎勵"],
    "obtains": ["完成任務【抑制噪音】"],
    "items": [
      { "name": "歸魂修練念珠(3D)", "rate": 100 },
      { "name": "超自然研究中心3F禮盒(1H)x14", "rate": 100 },
      { "name": "磨石x2", "rate": 100 },
      { "name": "護貝劑x2", "rate": 100 },
      { "name": "異界磨石x3", "rate": 100 },
      { "name": "高級護貝劑x3", "rate": 100 }
    ],
    "note": "感謝Line大群提供的提供資訊"
  },
  {
    "name": "高等練功禮盒(7D)LV.160",
    "sourceType": ["任務獎勵"],
    "obtains": ["完成任務【探查異變】"],
    "items": [
      { "name": "歸魂修練念珠(3D)", "rate": 100 },
      { "name": "超自然研究中心3F禮盒(1H)x14", "rate": 100 },
      { "name": "磨石x2", "rate": 100 },
      { "name": "護貝劑x2", "rate": 100 },
      { "name": "異界磨石x3", "rate": 100 },
      { "name": "高級護貝劑x3", "rate": 100 }
    ],
    "note": "感謝Line大群提供的提供資訊"
  },
  {
    "name": "終極練功禮盒(7D)LV.200",
    "sourceType": ["任務獎勵"],
    "obtains": ["完成任務【例行性訓練1】"],
    "items": [
      { "name": "歸魂修練念珠(3D)", "rate": 100 },
      { "name": "超自然研究中心4F禮盒(1H)x14", "rate": 100 }
    ],
    "note": "感謝Line大群提供的提供資訊"
  },
  {
    "name": "終極練功禮盒(7D)LV.210",
    "sourceType": ["任務獎勵"],
    "obtains": ["完成任務【例行性訓練2】"],
    "items": [
      { "name": "歸魂修練念珠(3D)", "rate": 100 },
      { "name": "超自然研究中心4F禮盒(1H)x14", "rate": 100 }
    ],
    "note": "感謝Line大群提供的提供資訊"
  },
  {
    "name": "終極練功禮盒(7D)LV.220",
    "sourceType": ["任務獎勵"],
    "obtains": ["完成任務【例行性訓練3】"],
    "items": [
      { "name": "歸魂修練念珠(3D)", "rate": 100 },
      { "name": "超自然研究中心4F禮盒(1H)x14", "rate": 100 }
    ],
    "note": "感謝Line大群提供的提供資訊"
  },
  {
    "name": "終極練功禮盒(7D)LV.230",
    "sourceType": ["任務獎勵"],
    "obtains": ["完成任務【例行性訓練4】"],
    "items": [
      { "name": "歸魂修練念珠(3D)", "rate": 100 },
      { "name": "超自然研究中心4F禮盒(1H)x14", "rate": 100 }
    ],
    "note": "感謝Line大群提供的提供資訊"
  },
  {
    "name": "終極練功禮盒(7D)LV.240",
    "sourceType": ["任務獎勵"],
    "obtains": ["完成任務【例行性訓練5】"],
    "items": [
      { "name": "3經珠(3D)", "rate": 100 },
      { "name": "228公園卡禮盒(7H)x2", "rate": 100 }
    ],
    "note": "感謝Line大群提供的提供資訊"
  },
  {
    "name": "終極練功禮盒(7D)LV.250",
    "sourceType": ["任務獎勵"],
    "obtains": ["完成任務【歲月的痕跡】"],
    "items": [
      { "name": "3經珠(3D)", "rate": 100 },
      { "name": "228公園卡禮盒(7H)x2", "rate": 100 }
    ],
    "note": "感謝Line大群提供的提供資訊"
  }
];

function merge() {
  if (!fs.existsSync(dataPath)) {
    console.error(`Error: File not found at ${dataPath}`);
    process.exit(1);
  }

  const existingBoxes = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  console.log(`目前本地有 ${existingBoxes.length} 筆禮盒資料。`);

  let addedCount = 0;
  let updatedCount = 0;

  for (const newBox of newBoxes) {
    const existingIndex = existingBoxes.findIndex(b => b.name === newBox.name);
    if (existingIndex !== -1) {
      // 覆蓋原本資料（但保留舊資料的 id 如果已經有的話）
      const oldId = existingBoxes[existingIndex].id;
      existingBoxes[existingIndex] = {
        ...newBox,
        id: oldId // 確保雜湊 ID 沒被刪除
      };
      updatedCount++;
      console.log(`更新已存在的禮盒：${newBox.name}`);
    } else {
      existingBoxes.push(newBox);
      addedCount++;
      console.log(`新增禮盒：${newBox.name}`);
    }
  }

  fs.writeFileSync(dataPath, JSON.stringify(existingBoxes, null, 2), 'utf-8');
  console.log(`合併完成！新增 ${addedCount} 筆，更新 ${updatedCount} 筆。`);
}

merge();
