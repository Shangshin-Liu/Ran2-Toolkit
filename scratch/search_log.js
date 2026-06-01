import fs from 'fs';
import readline from 'readline';

async function search() {
  const fileStream = fs.createReadStream('C:/Users/soup1/.gemini/antigravity/brain/a3ad10b3-b7fe-457a-98dc-05b35f877fa9/.system_generated/logs/transcript.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (line.includes('char-box.png')) {
      const obj = JSON.parse(line);
      console.log(`Step ${obj.step_index}: ${obj.type}`);
      if (obj.content) console.log(obj.content.substring(0, 300) + '...');
      if (obj.tool_calls) console.log(JSON.stringify(obj.tool_calls).substring(0, 300) + '...');
    }
  }
}

search().catch(console.error);
