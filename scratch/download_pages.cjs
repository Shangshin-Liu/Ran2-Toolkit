const fs = require('fs');
const path = require('path');

const urls = [
  'https://www.ran2.com.tw/gamesite/event/20110712_action/page06.aspx',
  'https://www.ran2.com.tw/gamesite/event/20110119_action/page2.aspx',
  'https://www.ran2.com.tw/gamesite/event/20120423_action/tech-1.aspx',
  'https://www.ran2.com.tw/gamesite/event/20120423_action/tech-2.aspx',
  'https://www.ran2.com.tw/gamesite/event/20120423_action/tech-3.aspx',
  'https://www.ran2.com.tw/gamesite/event/20110524_action/p03.aspx'
];

async function run() {
  const outputDir = path.join(__dirname, 'html_dumps');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const filename = url.replace(/https?:\/\//, '').replace(/\//g, '_');
    const outputPath = path.join(outputDir, filename);

    console.log(`Fetching ${url} -> ${outputPath}`);
    try {
      const res = await fetch(url);
      const text = await res.text();
      fs.writeFileSync(outputPath, text, 'utf-8');
      console.log(`Saved ${filename}`);
    } catch (err) {
      console.error(`Failed to fetch ${url}:`, err);
    }
  }
}

run();
