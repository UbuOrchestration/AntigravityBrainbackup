import { getDb } from './src/db.js';
import { harvestProductAssets } from './src/image_fetcher.js';

async function fix() {
    const db = await getDb();
    const rows = await db.all(`SELECT id, sku, source_url, upc_mpn, source_platform, title, valid_image_urls FROM inventory WHERE valid_image_urls = '[]' OR valid_image_urls IS NULL`);
    console.log('Missing items:', rows.length);
    for (const row of rows) {
        console.log(`Fixing SKU: ${row.sku} (${row.title})`);
        const imgs = await harvestProductAssets(row.sku, row.source_url, row.upc_mpn, row.source_platform, row.title);
        console.log(`Fetched ${imgs.length} images`);
        if (imgs.length > 0) {
            await db.run('UPDATE inventory SET valid_image_urls = ? WHERE id = ?', [JSON.stringify(imgs), row.id]);
        }
    }
}
fix().catch(console.error);
