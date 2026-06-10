const fs = require('fs');
const path = require('path');

async function test() {
  const url = 'https://www.ran.com.tw/gamesite/info/sub02_01_0502.aspx';
  console.log(`Fetching ${url}...`);
  const res = await fetch(url);
  const html = await res.text();
  
  // 找出所有 tr 的內容
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;
  let count = 0;
  while ((match = trRegex.exec(html)) !== null && count < 25) {
    const trContent = match[1];
    console.log(`--- TR ${count} ---`);
    console.log(trContent.substring(0, 300).trim());
    count++;
  }
}

test();
