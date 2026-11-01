import fs from 'fs';

const tFile = 'C:/Users/Ubu/.gemini/antigravity/brain/84cc2a6d-0077-46fa-8317-17bfee969fdf/.system_generated/logs/transcript.jsonl';
if (fs.existsSync(tFile)) {
    const lines = fs.readFileSync(tFile, 'utf8').split('\n');
    for (const line of lines) {
        if (!line) continue;
        const p = JSON.parse(line);
        if (p.tool_calls) {
            for (const tc of p.tool_calls) {
                console.log(`Tool: ${tc.name} | args: ${JSON.stringify(tc.args).slice(0, 150)}`);
            }
        }
    }
}
