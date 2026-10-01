import { getDb } from './src/db.js';
import { updateListingImage } from './src/ebayApi.js';
import { loadConfig } from './src/config.js';

async function run() {
    const config = loadConfig();
    try {
        await updateListingImage('800315497988', 'https://m.media-amazon.com/images/I/71C7v52S02L._AC_SL1500_.jpg', config);
        console.log(`✅ SUCCESS: Image updated for 800315497988`);
    } catch (e: any) {
        console.error(`Error: ${e.message}`);
    }
}

run().catch(console.error);
