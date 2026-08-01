import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
import { getDb } from './src/db.js';

async function applyIndex() {
    console.log('[SYSTEM ARCHITECTURE] Applying structural matching constraints...');
    const db = await getDb();
    
    await db.run('CREATE INDEX IF NOT EXISTS idx_inventory_upc ON inventory(upc_mpn);');
    
    console.log('[SYSTEM ARCHITECTURE] Index idx_inventory_upc created successfully.');
}

applyIndex().catch(console.error);
