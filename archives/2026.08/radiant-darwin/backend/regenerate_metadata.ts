import { getDb } from './src/db.js';
import { generateCassiniMetadata } from './src/cassini_agent.js';

async function regenerateMetadata() {
    const db = await getDb();
    const rows = await db.all("SELECT id, sku, title FROM inventory WHERE status = 'ACTIVE'");
    
    console.log(`Found ${rows.length} active listings. Regenerating metadata...`);
    
    let count = 0;
    for (const row of rows) {
        // Pass a mock productData payload with the info we have
        const productData = {
            title: row.title,
            brand: 'Unbranded'
        };
        
        console.log(`\nProcessing ${row.sku}...`);
        const metadata = await generateCassiniMetadata(productData);
        
        await db.run(
            `UPDATE inventory SET title = ?, item_specifics_json = ?, listing_description = ? WHERE id = ?`,
            [metadata.optimized_title || row.title, metadata.item_specifics_json, metadata.listing_description, row.id]
        );
        
        count++;
        console.log(`[${count}/${rows.length}] Updated metadata for ${row.sku}`);
        
        // Sleep to avoid ratelimiting the Gemini API
        await new Promise(r => setTimeout(r, 1000));
    }
    
    console.log("\nMetadata Regeneration Complete!");
}

regenerateMetadata().catch(console.error);
