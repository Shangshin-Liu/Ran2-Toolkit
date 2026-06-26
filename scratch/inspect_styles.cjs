const fs = require('fs');

const appVue = fs.readFileSync("c:\\Project\\Ran2-Toolkit\\src\\App.vue", 'utf8');
const homeVue = fs.readFileSync("c:\\Project\\Ran2-Toolkit\\src\\views\\Home.vue", 'utf8');
const shareVue = fs.readFileSync("c:\\Project\\Ran2-Toolkit\\src\\views\\Share.vue", 'utf8');

console.log("=== App.vue (search header-logo) ===");
const logoStyles = appVue.split('\n').filter(line => line.includes('logo') || line.includes('header-logo'));
logoStyles.forEach(l => console.log(l.trim()));

console.log("\n=== Home.vue (search bg-city or char-) ===");
const homeLines = homeVue.split('\n');
homeLines.forEach((line, idx) => {
    if (line.includes('bg-city') || line.includes('char-') || line.includes('character') || line.includes('class-select') || line.includes('card')) {
        console.log(`Line ${idx+1}: ${line.trim()}`);
    }
});

console.log("\n=== Share.vue (search no-image or img) ===");
const shareLines = shareVue.split('\n');
shareLines.forEach((line, idx) => {
    if (line.includes('no-image') || line.includes('detail-img') || line.includes('history-img')) {
        console.log(`Line ${idx+1}: ${line.trim()}`);
    }
});
