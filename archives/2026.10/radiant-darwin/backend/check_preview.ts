import { getDb } from './src/db.js';

async function check() {
    const db = await getDb();
    const rows = await db.all("SELECT id, sku, title, listing_description FROM inventory WHERE status = 'ACTIVE'");
    for (const item of rows) {
        const preview = item.listing_description.split('\n')[0];
        if (preview.includes('<') || preview.includes('```') || preview.includes('markdown') || preview.includes('json') || preview.includes('{')) {
            console.log(item.sku, preview);
        }
    }
    console.log("Done checking active items.");
}
check();
