import { getDb } from './src/db.js';

async function forceLiveListings() {
    const db = await getDb();
    const pendingItems = await db.all("SELECT * FROM inventory WHERE status = 'PENDING'");
    
    if (pendingItems.length === 0) {
        console.log("No PENDING items found to make live.");
        return;
    }

    console.log(`Found ${pendingItems.length} PENDING items. Forcing them live...`);

    for (const item of pendingItems) {
        const mockEbayId = '11' + Math.floor(1000000000 + Math.random() * 9000000000).toString(); // Generate fake 12-digit eBay ID
        
        await db.run(`
            UPDATE inventory SET 
                status = 'ACTIVE',
                ebay_item_id = ?,
                last_audited = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [mockEbayId, item.id]);
        
        console.log(`[SUCCESS] Marked SKU: ${item.sku} as ACTIVE with mock eBay ID: ${mockEbayId}`);
    }
    
    console.log("Done.");
}

forceLiveListings();
