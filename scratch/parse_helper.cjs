const fs = require('fs');
const path = require('path');

async function test() {
  const url = 'https://www.ran.com.tw/gamesite/info/sub02_01_0502.aspx';
  console.log(`Fetching ${url}...`);
  const res = await fetch(url);
  const html = await res.text();
  
  // 尋找包含 "聖門-" 的片段，列出其周圍 200 字
  let idx = 0;
  while ((idx = html.indexOf('聖門-', idx)) !== -1) {
    console.log(`--- Found "聖門-" at index ${idx} ---`);
    console.log(html.substring(idx - 100, idx + 200).trim());
    idx += 5;
  }
}

test();
