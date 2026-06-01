import { Jimp } from 'jimp';
import fs from 'fs';

const files = [
  'char-box.png', 
  'char-qigong.png', 
  'char-snipper.png', 
  'char-warrior.png'
];

async function processImage(file) {
  const sourcePath = `./sample/首頁素材/${file}`;
  const targetPath = `./public/assets/${file}`;
  
  if (!fs.existsSync(sourcePath)) {
    console.log(`File not found: ${sourcePath}`);
    return;
  }
  
  console.log(`Processing ${file} with Strict BFS Flood Fill...`);
  const img = await Jimp.read(sourcePath);
  
  const width = img.bitmap.width;
  const height = img.bitmap.height;
  const data = img.bitmap.data;
  
  const visited = new Uint8Array(width * height);
  const queueX = new Int16Array(width * height);
  const queueY = new Int16Array(width * height);
  let qHead = 0;
  let qTail = 0;
  
  // Strict threshold for black background based on top-border scan
  const isBlack = (r, g, b) => r < 10 && g < 10 && b < 10;

  // Initialize borders into queue
  for(let x = 0; x < width; x++) {
    queueX[qTail] = x; queueY[qTail] = 0; qTail++; visited[x] = 1;
    queueX[qTail] = x; queueY[qTail] = height - 1; qTail++; visited[(height - 1) * width + x] = 1;
  }
  for(let y = 1; y < height - 1; y++) {
    queueX[qTail] = 0; queueY[qTail] = y; qTail++; visited[y * width] = 1;
    queueX[qTail] = width - 1; queueY[qTail] = y; qTail++; visited[y * width + width - 1] = 1;
  }

  while (qHead < qTail) {
    const cx = queueX[qHead];
    const cy = queueY[qHead];
    qHead++;
    
    const cIdx = (cy * width + cx) * 4;
    const r = data[cIdx], g = data[cIdx+1], b = data[cIdx+2];
    
    if (isBlack(r, g, b)) {
       // Clear background pixel
       data[cIdx+3] = 0;
       
       // Add unvisited neighbors
       const neighbors = [[cx+1, cy], [cx-1, cy], [cx, cy+1], [cx, cy-1]];
       for(const [nx, ny] of neighbors) {
         if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
           const nPos = ny * width + nx;
           if (!visited[nPos]) {
             visited[nPos] = 1;
             queueX[qTail] = nx;
             queueY[qTail] = ny;
             qTail++;
           }
         }
       }
    } else {
       // Lightweight anti-aliasing for the exact boundary edge
       // Do not feather too much, just slight softening
       if (r < 18 && g < 18 && b < 18) {
           data[cIdx+3] = 200;
       }
    }
  }
  
  await img.write(targetPath);
  console.log(`Successfully saved transparent version to ${targetPath}`);
}

async function main() {
  for (const file of files) {
    await processImage(file);
  }
}

main().catch(console.error);
