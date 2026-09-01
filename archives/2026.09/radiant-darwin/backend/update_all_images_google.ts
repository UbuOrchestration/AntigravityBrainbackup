import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
import { getDb } from './src/db.js';
import { harvestProductAssets } from './src/image_fetcher.js';

async function populateGenuineGoogleImages() {
    console.log('[UPDATE] Batch sourcing 2-4 genuine photos from Google Images for all inventory items...');
    const db = await getDb();
    const rows = await db.all('SELECT id, sku, source_url, upc_mpn, source_platform, title, valid_image_urls FROM inventory');
    
    let processedCount = 0;

    for (const row of rows) {
        console.log(`[UPDATE] Sourcing images for SKU: ${row.sku}`);
        const verifiedImages = await harvestProductAssets(row.sku, row.source_url, row.upc_mpn, row.source_platform, row.title);
        
        await db.run('UPDATE inventory SET valid_image_urls = ? WHERE id = ?', [JSON.stringify(verifiedImages), row.id]);
        processedCount++;
        
        // Brief sleep to avoid hitting rate limits on googlethis
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`[UPDATE] Complete. Sourced genuine images for ${processedCount} listings.`);
}

populateGenuineGoogleImages().catch(console.error);
