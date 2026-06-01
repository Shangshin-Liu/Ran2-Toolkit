import { Jimp } from 'jimp';

async function checkBorder() {
  const img = await Jimp.read('./sample/首頁素材/char-box.png');
  let maxR = 0, maxG = 0, maxB = 0;
  
  for (let x = 0; x < img.bitmap.width; x++) {
    const idx = x * 4;
    maxR = Math.max(maxR, img.bitmap.data[idx]);
    maxG = Math.max(maxG, img.bitmap.data[idx+1]);
    maxB = Math.max(maxB, img.bitmap.data[idx+2]);
  }
  console.log(`Max RGB on top border: RGB(${maxR}, ${maxG}, ${maxB})`);
}

checkBorder().catch(console.error);
