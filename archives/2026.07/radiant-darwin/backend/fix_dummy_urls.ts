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
            // Search Amazon for the title
            const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(row.title)}`;
            const proxyUrl = `http://api.scraperapi.com/?api_key=${apiKey}&url=${encodeURIComponent(searchUrl)}&country_code=us&premium=true`;

            const response = await axios.get(proxyUrl, { timeout: 45000 });
            const html = response.data;
            
            // Extract first non-empty data-asin that matches B0...
            const match = html.match(/data-asin="(B0[a-zA-Z0-9]{8})"/);
            if (match && match[1]) {
                const asin = match[1];
                const realUrl = `https://www.amazon.com/dp/${asin}`;
                console.log(`   -> Found ASIN: ${asin}`);
                
                await db.run("UPDATE inventory SET source_url = ?, upc_mpn = ?, status = 'ACTIVE' WHERE id = ?", [realUrl, asin, row.id]);
            } else {
                console.log(`   -> Failed to find ASIN in search results.`);
            }
        } catch (e: any) {
            console.error(`   -> Search failed: ${e.message}`);
        }
    }
}

run().catch(console.error);
