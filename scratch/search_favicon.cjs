const fs = require('fs');
const path = require('path');

const rootDir = "c:\\Project\\Ran2-Toolkit";
const targets = ["favicon.png", "ran2_favicon.png"];

function walk(dir, results = []) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        if (file === 'node_modules' || file === '.git' || file === 'dist' || file === '.firebase') {
            return;
        }
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            walk(fullPath, results);
        } else {
            results.push(fullPath);
        }
    });
    return results;
}

const files = walk(rootDir).filter(f => {
    const ext = path.extname(f);
    return ['.vue', '.js', '.json', '.html', '.css', '.md'].includes(ext);
});

targets.forEach(target => {
    console.log(`\n=== Searching for "${target}" ===`);
    let found = false;
    files.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes(target)) {
            found = true;
            console.log(`Found in: ${path.relative(rootDir, file)}`);
            const lines = content.split('\n');
            lines.forEach((line, idx) => {
                if (line.includes(target)) {
                    console.log(`  Line ${idx + 1}: ${line.trim()}`);
                }
            });
        }
    });
    if (!found) {
        console.log(`No references found for "${target}"`);
    }
});
