import { Jimp } from 'jimp';

async function checkAlpha() {
  const img = await Jimp.read('./sample/首頁素材/char-box.png');
  let hasAlpha = false;
  let transparentPixels = 0;
  for (let i = 3; i < img.bitmap.data.length; i += 4) {
    if (img.bitmap.data[i] < 255) {
      hasAlpha = true;
      if (img.bitmap.data[i] === 0) {
        transparentPixels++;
      }
    }
  }
  console.log(`Original char-box.png has alpha: ${hasAlpha}`);
  console.log(`Transparent pixels: ${transparentPixels}`);
}

checkAlpha().catch(console.error);
