import fs from 'fs';
import path from 'path';

const brainDir = 'C:/Users/Ubu/.gemini/antigravity/brain';
const convs = fs.readdirSync(brainDir);

for (const c of convs) {
    const tFile = path.join(brainDir, c, '.system_generated', 'logs', 'transcript.jsonl');
    if (fs.existsSync(tFile)) {
        try {
            const lines = fs.readFileSync(tFile, 'utf8').split('\n');
            for (const line of lines) {
                if (!line) continue;
                if (line.includes('browser') && (line.includes('open') || line.includes('launch') || line.includes('http://localhost'))) {
                    const parsed = JSON.parse(line);
                    if (parsed.tool_calls) {
                        for (const tc of parsed.tool_calls) {
                            if (tc.name === 'run_command' && tc.args?.CommandLine) {
                                if (tc.args.CommandLine.includes('start') || tc.args.CommandLine.includes('open') || tc.args.CommandLine.includes('chrome') || tc.args.CommandLine.includes('browser')) {
                                    console.log(`Conv ${c}: ${tc.args.CommandLine}`);
                                }
                            }
                        }
                    }
                }
            }
        } catch (e) {}
    }
}
