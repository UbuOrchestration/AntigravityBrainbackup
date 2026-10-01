import { getDb } from './src/db.js';

async function fixDescriptions() {
    const db = await getDb();
    
    // Find all corrupted items
    const rows = await db.all("SELECT id, sku, title, listing_description, qc_notes FROM inventory WHERE listing_description LIKE 'eBay API Rejection%'");
    
    console.log(`Found ${rows.length} corrupted listings.`);
    
    for (const row of rows) {
        const errorLog = row.listing_description;
        
        // Use the same heuristic fallback text that cassini.ts uses
        const newDescription = `${row.title}\n\n• Premium construction for ultimate durability.\n• Precision engineered for standard RV fitment.\n• Brand new retail inventory, sealed in original packaging.`;
        
        // Append error log to existing qc_notes if any
        let newQcNotes = row.qc_notes || '';
        if (newQcNotes) {
             newQcNotes += '\n\n' + errorLog;
        } else {
             newQcNotes = errorLog;
        }
        
        await db.run(
            `UPDATE inventory SET listing_description = ?, qc_notes = ? WHERE id = ?`,
            [newDescription, newQcNotes, row.id]
        );
        console.log(`Fixed SKU ${row.sku}: Restored description and moved error to qc_notes.`);
    }
    
    console.log("Cleanup complete!");
}

fixDescriptions();
