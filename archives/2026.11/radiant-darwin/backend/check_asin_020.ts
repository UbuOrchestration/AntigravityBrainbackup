import axios from 'axios';
import { loadConfig } from './src/config.js';
import { getDb } from './src/db.js';

async function run() {
    const config = loadConfig();
    const db = await getDb();
    const rows = await db.all("SELECT sku, title, source_url FROM inventory WHERE status = 'ACTIVE' LIMIT 5");

    for (const row of rows) {
        const proxyUrl = `http://api.scraperapi.com/?api_key=${config.scraperApiKey}&url=${encodeURIComponent(row.source_url)}&premium=true`;
        try {
            const response = await axios.get(proxyUrl, { timeout: 30000 });
            const match = response.data.match(/<title>(.*?)<\/title>/);
            console.log(`\nSKU: ${row.sku}`);
            console.log(`Our Title: ${row.title}`);
            console.log(`Amazon Title: ${match ? match[1] : 'Not Found'}`);
        } catch (e) {
            console.error(`Error for ${row.sku}: ${e.message}`);
        }
    }
}

run().catch(console.error);
