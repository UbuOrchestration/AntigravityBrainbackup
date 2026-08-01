import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
import { getDb } from './src/db.js';
import { runDispatcher } from './src/dispatcher.js';

async function fixAndDispatch() {
    console.log('[DATA FIX] Patching prices and quantities for bulk ingested items...');
    const db = await getDb();
    
    // Set quantity to 2, and calculate a baseline profitable p_ebay based on p_source
    await db.run(`
        UPDATE inventory 
        SET quantity = 1,
            p_ebay = 25.99,
            status = 'PENDING'
        WHERE sku LIKE 'ARB-AMAZON-RV-%' AND status = 'ERROR'
    `);
    
    // Reset velocity limit
    await db.run(`
        UPDATE inventory 
        SET last_audited = datetime('now', '-1 day') 
        WHERE date(last_audited) = date('now') 
          AND status = 'ACTIVE'
    `);

    console.log('[MANUAL DISPATCH] Triggering immediate dispatcher cycle for the next 10 items...');
    await runDispatcher();
    console.log('[MANUAL DISPATCH] Cycle finished.');
}

fixAndDispatch().catch(console.error);
