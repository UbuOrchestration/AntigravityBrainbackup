import { getDb } from './src/db.js';
import { loadConfig } from './src/config.js';
import axios from 'axios';

async function run() {
    const db = await getDb();
    const config = loadConfig();
    const apiKey = config.scraperApiKey;

    if (!apiKey) {
        throw new Error("No ScraperAPI key found in config.");
    }

    const rows = await db.all("SELECT id, sku, title, source_url FROM inventory WHERE (source_url LIKE '%MOCK%' OR source_url = 'https://amazon.com' OR source_url LIKE '%amazon.com')");
    console.log(`Found ${rows.length} items with dummy/broken URLs.`);

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        console.log(`[${i+1}/${rows.length}] Resolving ASIN for: ${row.title}`);
        
        try {
            const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(row.title)}`;
            const proxyUrl = `http://api.scraperapi.com/?api_key=${apiKey}&url=${encodeURIComponent(searchUrl)}&country_code=us&premium=true`;

            const response = await axios.get(proxyUrl, { timeout: 45000 });
            const html = response.data;
            
            const brandMatch = row.title.split(' ')[0].toLowerCase();
            let foundAsin = null;

            // Match search result items
            const itemRegex = /data-asin="(B0[a-zA-Z0-9]{8})"[^>]*>[\s\S]*?<span class="a-size-base-plus[^>]*>(.*?)<\/span>/g;
            let match;
            while ((match = itemRegex.exec(html)) !== null) {
                const asin = match[1];
                const amzTitle = match[2].toLowerCase();
                if (amzTitle.includes(brandMatch)) {
                    foundAsin = asin;
                    break;
                }
            }
            
            // Fallback: match without HTML title if only ASIN is found, but this is unsafe.
            // Better to fail if we can't verify the brand.
            
            if (foundAsin) {
                const realUrl = `https://www.amazon.com/dp/${foundAsin}`;
                console.log(`   -> Found Verified ASIN: ${foundAsin}`);
                
                await db.run("UPDATE inventory SET source_url = ?, upc_mpn = ?, status = 'ACTIVE' WHERE id = ?", [realUrl, foundAsin, row.id]);
            } else {
                console.log(`   -> Failed to find brand-verified ASIN in search results.`);
                await db.run("UPDATE inventory SET status = 'ERROR', qc_notes = 'Failed strict brand verification' WHERE id = ?", [row.id]);
            }
        } catch (e: any) {
            console.error(`   -> Search failed: ${e.message}`);
        }
    }
}

run().catch(console.error);
