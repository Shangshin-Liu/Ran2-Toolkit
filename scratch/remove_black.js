import { Jimp } from 'jimp';
import fs from 'fs';

const files = [
  'char-box.png', 
  'char-qigong.png', 
  'char-snipper.png', 
  'char-warrior.png'
];

async function processImage(file) {
  const path = `./public/assets/${file}`;
  
  if (!fs.existsSync(path)) {
    console.log(`File not found: ${path}`);
    return;
  }
  
  console.log(`Processing ${file}...`);
  const img = await Jimp.read(path);
  
  img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    
    // threshold for pure black background
    if (r < 25 && g < 25 && b < 25) {
      this.bitmap.data[idx + 3] = 0;
    } else if (r < 40 && g < 40 && b < 40) {
      // feathering edge
      this.bitmap.data[idx + 3] = 120;
    }
  });
  
  await img.write(path);
  console.log(`Successfully saved transparent version of ${file}`);
}

async function main() {
  for (const file of files) {
    await processImage(file);
  }
}

main().catch(console.error);
