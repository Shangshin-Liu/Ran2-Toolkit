const fs = require('fs');
const path = require('path');

async function test() {
  const url = 'https://www.ran.com.tw/gamesite/info/sub02_01_0502.aspx';
  const res = await fetch(url);
  const html = await res.text();
  
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;
  let count = 0;
  while ((match = trRegex.exec(html)) !== null) {
    const trContent = match[1];
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let tdMatch;
    const tds = [];
    while ((tdMatch = tdRegex.exec(trContent)) !== null) {
      tds.push(tdMatch[1].trim());
    }
    
    // 如果有 5 個 td 且包含 "任務名稱"
    if (tds.length === 5 && tds[0].includes('任務名稱')) {
      console.log('--- Table Header ---');
      tds.forEach((td, i) => console.log(`td[${i}]: ${td.replace(/<[^>]+>/g, '').trim()}`));
    }
    
    // 印出前兩筆任務資料
    if (tds.length === 5 && !tds[0].includes('任務名稱') && !tds[0].includes('各部門共通任務') && count < 2) {
      console.log(`--- Task Data ${count} ---`);
      tds.forEach((td, i) => console.log(`td[${i}]: ${td.replace(/<[^>]+>/g, '').trim()}`));
      count++;
    }
  }
}

test();
