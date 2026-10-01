import axios from 'axios';
import { loadConfig } from './src/config.js';
import { getDb } from './src/db.js';

async function run() {
    const config = loadConfig();
    const db = await getDb();
    const rows = await db.all("SELECT id, sku, title, ebay_item_id FROM inventory WHERE quantity = 0 AND title IS NOT NULL AND status IN ('ERROR', 'PAUSED_OOS', 'ACTIVE')");
    
    console.log(`Starting retroactive fix for ${rows.length} items...`);
    let exactMatches = 0;
    let fallbackMatches = 0;

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(row.title)}`;
        const proxyUrl = `http://api.scraperapi.com/?api_key=${config.scraperApiKey}&url=${encodeURIComponent(searchUrl)}&premium=true`;

        try {
            const response = await axios.get(proxyUrl, { timeout: 30000 });
            const html = response.data;
            const brandMatch = row.title.split(' ')[0].toLowerCase();
            
            const itemRegex = /data-asin="(B0[a-zA-Z0-9]{8})"[^>]*>[\s\S]*?<span class="a-size-base-plus[^>]*>(.*?)<\/span>/g;
            let match;
            let foundExactAsin = null;
            let firstAsin = null;
            let firstTitle = null;
            
            let count = 0;
            while ((match = itemRegex.exec(html)) !== null && count < 5) {
                const asin = match[1];
                const amzTitle = match[2];
                if (!firstAsin) {
                    firstAsin = asin;
                    firstTitle = amzTitle;
                }
                if (amzTitle.toLowerCase().includes(brandMatch)) {
                    foundExactAsin = asin;
                    break;
                }
                count++;
            }

            if (foundExactAsin) {
                // Exact match found
                const realUrl = `https://www.amazon.com/dp/${foundExactAsin}`;
                await db.run("UPDATE inventory SET source_url = ?, upc_mpn = ?, status = 'PENDING', qc_notes = 'Retroactive Fix: Exact Match' WHERE id = ?", [realUrl, foundExactAsin, row.id]);
                exactMatches++;
                console.log(`[${i+1}/${rows.length}] ${row.sku}: Exact Match Found -> ${foundExactAsin}`);
            } else if (firstAsin) {
                // Fallback: Pick a new similar item and rename our listing
                const realUrl = `https://www.amazon.com/dp/${firstAsin}`;
                // Decode HTML entities in title
                const cleanTitle = firstTitle.replace(/&amp;/g, '&').replace(/&quot;/g, '"').substring(0, 80);
                await db.run("UPDATE inventory SET title = ?, optimized_title = ?, source_url = ?, upc_mpn = ?, status = 'PENDING', qc_notes = 'Retroactive Fix: Renamed to Similar Item' WHERE id = ?", [cleanTitle, cleanTitle, realUrl, firstAsin, row.id]);
                fallbackMatches++;
                console.log(`[${i+1}/${rows.length}] ${row.sku}: No exact match. Renamed to similar item -> ${firstAsin}`);
            } else {
                console.log(`[${i+1}/${rows.length}] ${row.sku}: Search failed to find any ASINs.`);
            }

        } catch (e: any) {
            console.error(`[${i+1}/${rows.length}] ${row.sku}: Search failed - ${e.message}`);
        }
    }
    
    console.log(`\nComplete! Exact Matches: ${exactMatches}, Fallback/Renamed: ${fallbackMatches}`);
}

run().catch(console.error);
