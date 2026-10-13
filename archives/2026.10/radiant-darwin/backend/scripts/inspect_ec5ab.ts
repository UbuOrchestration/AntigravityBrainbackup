import fs from 'fs';

const tFile = 'C:/Users/Ubu/.gemini/antigravity/brain/ec5ab720-eae8-4996-9cdc-561014e15f7a/.system_generated/logs/transcript.jsonl';
if (fs.existsSync(tFile)) {
    const lines = fs.readFileSync(tFile, 'utf8').split('\n');
    for (const line of lines) {
        if (!line) continue;
        const p = JSON.parse(line);
        console.log(`Step ${p.step_index} | Type: ${p.type} | Name: ${p.tool_calls?.[0]?.name}`);
    }
}
