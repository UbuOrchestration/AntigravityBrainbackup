import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
import { getDb } from './src/db.js';

async function fixDuplicate() {
    const db = await getDb();
    // B000BUQOEQ is a duplicate of B004809YOC
    await db.run("UPDATE inventory SET status = 'PAUSED_DUPLICATE' WHERE sku = 'B000BUQOEQ'");
    console.log('[CLEANUP] Duplicate leveling blocks paused.');
}

fixDuplicate().catch(console.error);
