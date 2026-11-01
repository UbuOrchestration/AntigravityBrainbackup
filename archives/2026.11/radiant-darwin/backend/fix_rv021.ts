import { getDb } from './src/db.js';
import { updateListingInventory } from './src/ebayApi.js';
import { loadConfig } from './src/config.js';

async function run() {
    const db = await getDb();
    
    // Set stock to 0 to be safe since the images on eBay are wrong and the API token was invalid for revising images right now
    await updateListingInventory('800315497988', 135.04, 0, loadConfig());
    
    // Update DB with correct title and image URL so the nightly syncs will repair the listing
    await db.run("UPDATE inventory SET title = 'Valterra Surgeminder 30Amp Smart RV Surge Protector A10-30SMSP', optimized_title = 'Valterra Surgeminder 30Amp Smart RV Surge Protector A10-30SMSP', valid_image_urls = '[\"https://m.media-amazon.com/images/I/71C7v52S02L._AC_SL1500_.jpg\"]' WHERE sku = 'ARB-AMAZON-RV-021'");
    
    console.log("Updated ARB-AMAZON-RV-021 in DB and suspended stock on eBay.");
}

run().catch(console.error);
