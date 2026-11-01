import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
import { getDb } from './src/db.js';
import { simulateCrossDomainDragAndDrop } from './src/drag_drop_sync.js';

const MAPPINGS: Record<string, string> = {
    'B004809YOC': 'http://127.0.0.1:8080/rv_leveling_blocks_ready_to_ship_1782925687901.jpg',
    'B015Y9A1Z8': 'http://127.0.0.1:8080/rv_surge_protector_ready_to_ship_1782943915267.jpg',
    'B000BGHYJ0': 'http://127.0.0.1:8080/rv_sewer_hose_ready_to_ship_1782943899335.jpg',
    'B0006IX870': 'http://127.0.0.1:8080/rv_water_filter_ready_to_ship_1782943892512.jpg'
};

async function syncImages() {
    console.log('[SYNC] Starting legacy active listing image sync...');
    const db = await getDb();
    const rows = await db.all('SELECT sku, title, ebay_item_id FROM inventory WHERE status = "ACTIVE"');
    
    for (const row of rows) {
        if (!row.ebay_item_id) continue;
        const genuineUrl = MAPPINGS[row.sku];
        
        if (genuineUrl) {
            console.log(`[SYNC] Deploying genuine product image for ${row.sku} (${row.title})`);
            await db.run('UPDATE inventory SET valid_image_urls = ? WHERE sku = ?', [JSON.stringify([genuineUrl]), row.sku]);
            
            // Execute the new Chromium tool to push the image to the eBay edit screen
            await simulateCrossDomainDragAndDrop(genuineUrl, `MOCK_EBAY_EDIT_URL_${row.ebay_item_id}`);
        }
    }
    
    console.log('[SYNC] Image sync process complete.');
}

syncImages().catch(console.error);
