import { getDb } from './src/db.js';
import { updateListingInventory } from './src/ebayApi.js';
import { loadConfig } from './src/config.js';

async function run() {
    const db = await getDb();
    const config = loadConfig();
    
    // Find items that likely have a mock price (usually over $100 unless they are big items)
    // Actually, let's just find anything where source_platform = 'amazon' and p_source > 99
    const rows = await db.all("SELECT id, sku, ebay_item_id, title, p_source FROM inventory WHERE p_source > 50");
    
    console.log(`Found ${rows.length} potentially corrupted items.`);
    
    for (const row of rows) {
        console.log(`Auditing: ${row.sku} - ${row.title} - Source Cost: $${row.p_source}`);
        
        // Some real items DO cost > $50 (e.g. RV-071 Backup Camera, RV-024 Surge Protector)
        // Let's filter out known high-ticket items.
        const knownHighTicketSkus = [
            'ARB-AMAZON-RV-071', // Backup camera $125
            'ARB-AMAZON-RV-074', // GPS $180
            'ARB-AMAZON-RV-077', // TPMS $89
            'ARB-AMAZON-RV-082', // Fridge $149
            'ARB-AMAZON-RV-083', // Cookware $89
            'ARB-AMAZON-RV-036', // Weight distribution hitch $240
            'ARB-AMAZON-RV-034', // Tongue jack $115
            'ARB-AMAZON-RV-024', // 50-Amp Protector $210
            'ARB-AMAZON-RV-021', // 30-Amp protector $58
            'ARB-AMAZON-RV-026', // Solar panel $75
            'ARB-AMAZON-RV-028', // Transfer switch $68
            'ARB-AMAZON-RV-051', // Buddy heater $74
            'ARB-AMAZON-RV-055', // Mattress $85
            'ARB-AMAZON-RV-076', // Brake controller $65
            'B015Y9A1Z8' // Surge Protector $58
        ];
        
        if (knownHighTicketSkus.includes(row.sku)) {
            console.log(`-> Skipping ${row.sku} (Known High Ticket)`);
            continue;
        }
        
        console.log(`-> SUSPENDING ${row.sku}`);
        if (row.ebay_item_id) {
            try {
                await updateListingInventory(row.ebay_item_id, row.p_source * 1.5, 0, config);
            } catch (e: any) {
                console.error(`Failed to suspend ${row.sku} on eBay:`, e.message);
            }
        }
        
        await db.run("UPDATE inventory SET quantity = 0, status = 'ERROR', qc_notes = 'Suspended during manual audit for hallucinatory price' WHERE sku = ?", [row.sku]);
    }
}

run().catch(console.error);
