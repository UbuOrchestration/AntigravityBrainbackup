import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
import { getDb } from './src/db.js';
import { runDispatcher } from './src/dispatcher.js';

async function execute() {
    console.log("[MANUAL OVERRIDE] Clearing today's velocity limit tally...");
    const db = await getDb();
    
    // Shift the audit timestamp back by 1 day for today's active items to bypass the 10/day limit
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

execute().catch(console.error);
