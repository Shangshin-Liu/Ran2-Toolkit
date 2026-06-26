const fs = require('fs');
const path = require('path');

const srcDir = "c:\\Project\\Ran2-Toolkit\\src";
const imageNames = [
    "bg-city.png",
    "char-box.png",
    "char-qigong.png",
    "char-snipper.png",
    "char-warrior.png",
    "logo.jpg",
    "ran2-logo.jpg",
    "ran2_favicon.png",
    "no-image.png"
];

function walk(dir, results = []) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            walk(fullPath, results);
        } else {
            results.push(fullPath);
        }
    });
    return results;
}

const vueFiles = walk(srcDir).filter(f => f.endsWith('.vue') || f.endsWith('.js') || f.endsWith('.css'));

vueFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    imageNames.forEach(img => {
        if (content.includes(img)) {
            console.log(`Found ${img} in ${path.relative(srcDir, file)}`);
            const lines = content.split('\n');
            lines.forEach((line, idx) => {
                if (line.includes(img)) {
                    console.log(`  Line ${idx + 1}: ${line.trim()}`);
                }
            });
        }
    });
});
