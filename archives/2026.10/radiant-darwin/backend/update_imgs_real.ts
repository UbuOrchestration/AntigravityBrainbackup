import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
import { getDb } from './src/db.js';

async function updateRealImages() {
    console.log('[IMAGES] Injecting real production-grade local artifacts into the DB for active items...');
    const db = await getDb();
    
    // Leveling blocks
    await db.run(
        `UPDATE inventory SET valid_image_urls = ? WHERE sku LIKE '%RV-011%'`, 
        ['["C:/Users/Ubu/.gemini/antigravity/brain/480448e1-a537-4204-9b4f-cb5bfda403c3/rv_leveling_blocks_ready_to_ship_1782925687901.jpg"]']
    );

    // Water filter
    await db.run(
        `UPDATE inventory SET valid_image_urls = ? WHERE sku LIKE '%RV-008%' OR sku LIKE '%RV-001%'`, 
        ['["C:/Users/Ubu/.gemini/antigravity/brain/480448e1-a537-4204-9b4f-cb5bfda403c3/rv_water_filter_ready_to_ship_1782943892512.jpg"]']
    );
    
    // Sewer hose
    await db.run(
        `UPDATE inventory SET valid_image_urls = ? WHERE sku LIKE '%RV-002%' OR sku LIKE '%RV-004%' OR sku LIKE '%RV-100%'`, 
        ['["C:/Users/Ubu/.gemini/antigravity/brain/480448e1-a537-4204-9b4f-cb5bfda403c3/rv_sewer_hose_ready_to_ship_1782943899335.jpg"]']
    );
    
    console.log('[IMAGES] Success.');
}

updateRealImages().catch(console.error);
