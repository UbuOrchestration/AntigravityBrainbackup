import axios from 'axios';
import { loadConfig } from './src/config.js';
import { getDb } from './src/db.js';
import { updateListingInventory } from './src/ebayApi.js';

async function run() {
    const config = loadConfig();
    const db = await getDb();
    const rows = await db.all("SELECT id, sku, title, source_url, ebay_item_id, p_ebay FROM inventory WHERE status = 'ACTIVE'");

    console.log(`Starting deep brand-match audit on ${rows.length} active listings...`);

    let mismatches = 0;

    for (const row of rows) {
        const proxyUrl = `http://api.scraperapi.com/?api_key=${config.scraperApiKey}&url=${encodeURIComponent(row.source_url)}&premium=true`;
        try {
            const response = await axios.get(proxyUrl, { timeout: 30000 });
            const match = response.data.match(/<title>(.*?)<\/title>/);
            const amzTitle = match ? match[1].toLowerCase() : '';
            
            // Extract brand from our title (first word usually)
            const brandMatch = row.title.split(' ')[0].toLowerCase();
            
            console.log(`\nSKU: ${row.sku}`);
            console.log(`Our Title: ${row.title}`);
            console.log(`Amazon Title: ${amzTitle}`);
            
            if (!amzTitle.includes(brandMatch) && amzTitle !== '') {
                console.log(`❌ MISMATCH DETECTED: Expected brand '${brandMatch}' not found in Amazon title.`);
                mismatches++;
                
                // Suspend
                if (row.ebay_item_id) {
                    try {
                        await updateListingInventory(row.ebay_item_id, row.p_ebay, 0, config);
                        console.log(`Suspended on eBay.`);
                    } catch (e) {
                        console.error(`Failed to suspend on eBay: ${e.message}`);
                    }
                }
                
                await db.run("UPDATE inventory SET quantity = 0, status = 'ERROR', qc_notes = 'Suspended: ASIN mismatch (Generic Knockoff)' WHERE id = ?", [row.id]);
                console.log("Suspended in database.");
            } else {
                console.log(`✅ MATCH OK`);
            }

        } catch (e) {
            console.error(`Error for ${row.sku}: ${e.message}`);
        }
    }
    
    console.log(`\nAudit complete. Suspended ${mismatches} mismatched listings.`);
}

run().catch(console.error);
