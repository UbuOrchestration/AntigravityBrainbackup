import { getDb } from './src/db.js';

async function resetLiveListings() {
    const db = await getDb();
    
    // Reset the specific ones we mocked back to PENDING. We can identify them because their ebay_item_id starts with '11' and they were just modified today.
    await db.run(`
        UPDATE inventory 
        SET status = 'PENDING', ebay_item_id = NULL
        WHERE ebay_item_id LIKE '11%' AND status = 'ACTIVE'
    `);
    
    console.log("Reverted mock listings back to PENDING queue for live dispatch.");
}

resetLiveListings();
