import { getDb } from './src/db.js';

async function run() {
    const db = await getDb();
    const invalidUrls = await db.all("SELECT sku, source_url FROM inventory WHERE source_url NOT LIKE '%amazon.com/dp/B0%' AND source_url NOT LIKE '%walmart.com%'");
    console.log("Invalid URLs found:", invalidUrls);
}

run().catch(console.error);
