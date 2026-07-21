import { getDb } from './src/db.js';
import * as fs from 'fs';

async function run() {
    const db = await getDb();
    const dummyItems = await db.all("SELECT sku, title, source_url FROM inventory WHERE source_url LIKE '%MOCK%' OR source_url = 'https://amazon.com' OR source_url LIKE '%amazon.com'");
    
    if (dummyItems.length > 0) {
        console.error(`QC FAILED: Found ${dummyItems.length} items with dummy URLs.`);
        console.log(dummyItems);
        process.exit(1);
    }

    const errorItems = await db.all("SELECT sku, qc_notes FROM inventory WHERE status = 'ERROR'");
    if (errorItems.length > 0) {
        console.error(`QC WARNING: Found ${errorItems.length} items with status ERROR.`);
        console.log(errorItems);
    }
    
    console.log("QC PASSED: No dummy URLs remain.");
}

run().catch(console.error);
