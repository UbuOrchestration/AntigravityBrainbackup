import { getDb } from './src/db.js';
import { runRepricerIteration } from './src/tracker.js';

async function testSync() {
    const db = await getDb();
    const itemId = '800275551044'; // Use the same item we just fixed
    
    console.log(`Setting image_sync_pending = 1 for item ${itemId}...`);
    await db.run('UPDATE inventory SET image_sync_pending = 1 WHERE ebay_item_id = ?', [itemId]);
    
    console.log("Triggering repricer iteration...");
    await runRepricerIteration();
    
    const row = await db.get('SELECT image_sync_pending FROM inventory WHERE ebay_item_id = ?', [itemId]);
    console.log(`Final image_sync_pending state: ${row.image_sync_pending} (Expected: 0)`);
}
testSync();
