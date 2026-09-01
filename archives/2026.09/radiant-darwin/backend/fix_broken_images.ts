import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
import { getDb } from './src/db.js';
import { harvestProductAssets } from './src/image_fetcher.js';

async function fixBrokenImages() {
    console.log('[QC FIX] Beginning batch image repair operation...');
    const db = await getDb();
    const rows = await db.all('SELECT id, sku, source_url, upc_mpn, source_platform, title, valid_image_urls FROM inventory');
    
    let fixedCount = 0;

    for (const row of rows) {
        let isBroken = false;
        
        if (!row.valid_image_urls) {
            isBroken = true;
        } else {
            try {
                const urls = JSON.parse(row.valid_image_urls);
                if (!Array.isArray(urls) || urls.length === 0) {
                    isBroken = true;
                } else {
                    for (const url of urls) {
                        if (url.includes('example.com') || url.includes('placeholder')) {
                            isBroken = true;
                        }
                    }
                }
            } catch (e) {
                isBroken = true;
            }
        }

        if (isBroken) {
            console.log(`[QC FIX] Repairing image for SKU: ${row.sku}`);
            const verifiedImages = await harvestProductAssets(row.sku, row.source_url, row.upc_mpn, row.source_platform, row.title);
            
            await db.run('UPDATE inventory SET valid_image_urls = ? WHERE id = ?', [JSON.stringify(verifiedImages), row.id]);
            fixedCount++;
        }
    }
    
    console.log(`[QC FIX] Complete. Repaired ${fixedCount} listings with genuine fallback images.`);
}

fixBrokenImages().catch(console.error);
