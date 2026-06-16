import fs from 'fs';

const path = 'C:\\Users\\soup1\\.gemini\\antigravity\\brain\\a3ad10b3-b7fe-457a-98dc-05b35f877fa9\\official_tasks.json';

function main() {
  if (fs.existsSync(path)) {
    const data = JSON.parse(fs.readFileSync(path, 'utf-8'));
    console.log("備份任務總數：", data.length);
    data.forEach(t => {
      if (t.name && (t.name.includes("打倒冰凍可滷") || t.name.includes("冰凍可滷"))) {
        console.log("Found in backup:", t.id, "| Name:", t.name, "| CustomizedName:", t.customizedName);
      }
    });
  } else {
    console.log("備份檔案不存在");
  }
}

main();
