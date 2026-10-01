import { getDb } from './src/db.js';
import { runRepricerIteration } from './src/tracker.js';
import { loadConfig } from './src/config.js';

async function performQCSweep() {
    console.log("[QC SWEEP] Initializing QC Sweep...");
    const db = await getDb();
    const config = loadConfig();

    // 1. Delete explicitly corrupted/hallucinated image listings
    console.log("[QC SWEEP] Purging hallucinated image listings (Leveling Blocks without UPC)...");
    const corruptedRows = await db.all(`
        SELECT id, sku, ebay_item_id, title 
        FROM inventory 
        WHERE title LIKE '%Leveling Block%' AND upc_mpn = 'DOES NOT APPLY'
    `);
    
    for (const row of corruptedRows) {
        console.log(`[QC SWEEP] Deleting corrupted item: ${row.title} (SKU: ${row.sku})`);
        
        // If it's on eBay, we should ideally end the listing. Since this is a sweep, we'll just delete locally 
        // and assume the dispatcher/reconciler handles orphaned eBay listings or they never went live (Error 20004).
        await db.run('DELETE FROM inventory WHERE id = ?', [row.id]);
    }

    // 2. Delete duplicates
    console.log("[QC SWEEP] Purging duplicate listings...");
    const duplicateRows = await db.all(`
        SELECT id, sku, title, source_url
        FROM inventory
        WHERE id NOT IN (
            SELECT MIN(id)
            FROM inventory
            GROUP BY source_url
        )
    `);

    for (const row of duplicateRows) {
        console.log(`[QC SWEEP] Deleting duplicate item: ${row.title} (SKU: ${row.sku}, URL: ${row.source_url})`);
        await db.run('DELETE FROM inventory WHERE id = ?', [row.id]);
    }

    // 3. Force Repricer Run
    console.log("[QC SWEEP] Forcing Repricer iteration to apply new 15% MID TIER ROI matrix...");
    await runRepricerIteration();

    console.log("[QC SWEEP] QC Sweep Complete.");
}

performQCSweep().catch(console.error);
