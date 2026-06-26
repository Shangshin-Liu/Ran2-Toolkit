const fs = require('fs');

const appVue = fs.readFileSync("c:\\Project\\Ran2-Toolkit\\src\\App.vue", 'utf8');
const homeVue = fs.readFileSync("c:\\Project\\Ran2-Toolkit\\src\\views\\Home.vue", 'utf8');
const shareVue = fs.readFileSync("c:\\Project\\Ran2-Toolkit\\src\\views\\Share.vue", 'utf8');

function printBlock(content, keyword, linesCount = 20) {
    const lines = content.split('\n');
    const idx = lines.findIndex(line => line.includes(keyword));
    if (idx !== -1) {
        console.log(`=== Found "${keyword}" ===`);
        for (let i = Math.max(0, idx - 2); i < Math.min(lines.length, idx + linesCount); i++) {
            console.log(`${i+1}: ${lines[i]}`);
        }
    } else {
        console.log(`"${keyword}" not found`);
    }
}

// 1. App.vue .header-logo
printBlock(appVue, ".header-logo {", 10);

// 2. Home.vue .neon-card 和 .char-img 和 background
printBlock(homeVue, ".neon-card {", 15);
printBlock(homeVue, ".char-img {", 15);
printBlock(homeVue, "bg-city.png", 10);

// 3. Share.vue 尋找 .history-img 或類似顯示 no-image 的 CSS
printBlock(shareVue, "historyDetailImgSrc", 10);
printBlock(shareVue, "detailImgSrc", 10);

// 我們也搜尋 Share.vue 的 style block 來看看圖片元件的寬高
const shareStyles = shareVue.split('\n').filter(line => line.includes('width:') || line.includes('height:'));
console.log("=== Share.vue width/height rules ===");
shareVue.split('\n').forEach((line, idx) => {
    if (line.includes('width') || line.includes('height') || line.includes('img') || line.includes('avatar')) {
        if (idx > 2200) { // style block 通常在後面
            console.log(`${idx+1}: ${line.trim()}`);
        }
    }
});
