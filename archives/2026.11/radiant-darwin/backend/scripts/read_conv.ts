import fs from 'fs';
import path from 'path';

const tFile = 'C:/Users/Ubu/.gemini/antigravity/brain/18405f46-6c4d-4db7-b10f-f18f6958203f/.system_generated/logs/transcript.jsonl';
if (fs.existsSync(tFile)) {
    const lines = fs.readFileSync(tFile, 'utf8').split('\n');
    for (const line of lines) {
        if (!line) continue;
        if (line.includes('leclairegeoservices.com') || line.includes('Start-Process')) {
            const p = JSON.parse(line);
            console.log(p.type, p.content?.slice(0, 200), p.tool_calls?.[0]?.name, p.tool_calls?.[0]?.args);
        }
    }
}
