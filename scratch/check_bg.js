import { Jimp } from 'jimp';

async function checkBackground() {
  const img = await Jimp.read('./sample/首頁素材/char-box.png');
  const idx = 0; // (0,0)
  const r = img.bitmap.data[0];
  const g = img.bitmap.data[1];
  const b = img.bitmap.data[2];
  console.log(`Top-left pixel: RGB(${r}, ${g}, ${b})`);
}

checkBackground().catch(console.error);
