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

async function test() {
  for (let url of urls) {
    console.log(`\n================== ${url.split('/').pop()} ==================`);
    const res = await fetch(url);
    const html = await res.text();
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let match;
    let headersFound = 0;
    while ((match = trRegex.exec(html)) !== null && headersFound < 3) {
      const trContent = match[1];
      const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      let tdMatch;
      const tds = [];
      while ((tdMatch = tdRegex.exec(trContent)) !== null) {
        tds.push(tdMatch[1].replace(/<[^>]+>/g, '').trim());
      }
      
      if (tds.some(td => td.includes('任務名稱') || td.includes('接任務') || td.includes('任務描述'))) {
        console.log(`TR cols count = ${tds.length}: [ ${tds.join(' | ')} ]`);
        headersFound++;
      }
    }
  }
}

test();
