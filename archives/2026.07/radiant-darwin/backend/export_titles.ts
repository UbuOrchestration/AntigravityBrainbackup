import { getDb } from './src/db.js';
import * as fs from 'fs';

async function exportTitles() {
    const db = await getDb();
    const rows = await db.all("SELECT id, sku, title FROM inventory WHERE status = 'ACTIVE'");
    
    fs.writeFileSync('titles.json', JSON.stringify(rows, null, 2));
    console.log(`Exported ${rows.length} titles to titles.json`);
}

exportTitles().catch(console.error);
