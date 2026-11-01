import * as fs from 'fs';
import { getDb } from '../src/db.js';

async function fixRemaining8() {
    const db = await getDb();
    const filePath = 'C:/Users/Ubu/.gemini/antigravity/brain/480448e1-a537-4204-9b4f-cb5bfda403c3/profitable_rv_products.md';
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    const titleMap: Record<string, string> = {};

    for (const line of lines) {
        if (line.trim().startsWith('| **RV-') && line.includes('|')) {
            const parts = line.split('|').map(p => p.trim());
            if (parts.length >= 3) {
                const id = parts[1].replace(/[*_]/g, ''); // RV-019
                const name = parts[2];
                titleMap[id] = name;
                titleMap[`ARB-AMAZON-${id}`] = name;
            }
        }
    }

    const badSkus = [
        'ARB-AMAZON-RV-019',
        'ARB-AMAZON-RV-052',
        'ARB-AMAZON-RV-064',
        'ARB-AMAZON-RV-072',
        'ARB-AMAZON-RV-073',
        'ARB-AMAZON-RV-078',
        'ARB-AMAZON-RV-079',
        'ARB-AMAZON-RV-081'
    ];

    for (const sku of badSkus) {
        const id = sku.replace('ARB-AMAZON-', '');
        const realTitle = titleMap[sku] || titleMap[id];
        if (realTitle) {
            console.log(`Fixing ${sku} -> "${realTitle}"`);
            await db.run("UPDATE inventory SET title = ?, optimized_title = ? WHERE sku = ?", [realTitle, realTitle, sku]);
        } else {
            console.warn(`No mapping for ${sku}`);
        }
    }
}

fixRemaining8().catch(console.error);
