import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
import { getDb } from './src/db.js';

async function checkImages() {
    const db = await getDb();
    const rows = await db.all('SELECT sku, status, valid_image_urls FROM inventory');
    
    let brokenCount = 0;
    let okCount = 0;
    let missingCount = 0;

    for (const row of rows) {
        if (!row.valid_image_urls) {
            missingCount++;
            continue;
        }

        try {
            const urls = JSON.parse(row.valid_image_urls);
            if (!Array.isArray(urls) || urls.length === 0) {
                missingCount++;
                continue;
            }

            let hasBroken = false;
            for (const url of urls) {
                // Determine if it's broken based on known bad domains or local paths that don't exist
                if (url.includes('example.com') || url.includes('placeholder')) {
                    hasBroken = true;
                }
            }

            if (hasBroken) {
                brokenCount++;
            } else {
                okCount++;
            }
        } catch (e) {
            brokenCount++;
        }
    }

    console.log(`[QC RESULTS] OK: ${okCount} | Broken: ${brokenCount} | Missing: ${missingCount}`);
}

checkImages().catch(console.error);
