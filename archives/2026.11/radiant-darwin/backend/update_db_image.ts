import { getDb } from './src/db.js';
import fs from 'fs';
import path from 'path';

async function updateDb() {
    const db = await getDb();
    const itemId = '800275551044';
    
    // The Amazon ASIN they linked is B004ME11FS. I'll use a valid URL for it.
    const targetUrl = 'https://images.thdstatic.com/productImages/5fec019c-2d0f-47a0-a35f-44a9b3b575b6/svn/camco-rv-parts-22783-64_1000.jpg';
    
    await db.run('UPDATE inventory SET valid_image_urls = ? WHERE ebay_item_id = ?', [JSON.stringify([targetUrl]), itemId]);
    console.log(`Database updated successfully for ${itemId}.`);
}

updateDb();
