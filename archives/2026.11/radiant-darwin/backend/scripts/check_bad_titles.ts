import { getDb } from '../src/db.js';

async function run() {
    const db = await getDb();
    const rows = await db.all("SELECT sku, title, source_url, p_ebay FROM inventory WHERE title LIKE '%Choice%' OR title LIKE '%Amazon%'");
    console.log(`Found ${rows.length} items with Amazon/Choice in title:`);
    for (const r of rows) {
        console.log(`- ${r.sku}: ${r.title} | ${r.source_url}`);
    }
}

run().catch(console.error);
