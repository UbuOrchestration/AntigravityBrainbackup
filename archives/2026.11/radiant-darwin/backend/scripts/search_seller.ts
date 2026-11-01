import fs from 'fs';
import path from 'path';

function searchDir(dir: string, term: string) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
        if (f === 'node_modules' || f === '.git') continue;
        const full = path.join(dir, f);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
            searchDir(full, term);
        } else if (f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.json') || f.endsWith('.md') || f.endsWith('.env') || f.endsWith('.txt')) {
            try {
                const content = fs.readFileSync(full, 'utf8');
                if (content.toLowerCase().includes(term.toLowerCase())) {
                    console.log(`Found in: ${full}`);
                }
            } catch {}
        }
    }
}

searchDir('C:/Users/Ubu/Documents/antigravity/radiant-darwin', 'kenna');
searchDir('C:/Users/Ubu/Documents/antigravity/radiant-darwin', 'ebay.com/usr');
searchDir('C:/Users/Ubu/Documents/antigravity/radiant-darwin', 'seller');
