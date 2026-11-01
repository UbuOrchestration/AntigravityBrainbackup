import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
import { getDb } from './src/db.js';

async function checkDuplicates() {
    console.log('[DUPLICATE CHECK] Scanning for identical SKUs, UPCs, or Titles in active/pending listings...');
    const db = await getDb();
    
    const duplicateSkus = await db.all(`
        SELECT sku, COUNT(*) as count 
        FROM inventory 
        GROUP BY sku 
        HAVING COUNT(*) > 1
    `);
    
    const duplicateTitles = await db.all(`
        SELECT title, COUNT(*) as count 
        FROM inventory 
        GROUP BY title 
        HAVING COUNT(*) > 1
    `);

    const duplicateUPCs = await db.all(`
        SELECT upc_mpn, COUNT(*) as count 
        FROM inventory 
        WHERE upc_mpn != 'DOES NOT APPLY' AND upc_mpn IS NOT NULL
        GROUP BY upc_mpn 
        HAVING COUNT(*) > 1
    `);

    console.log('--- Duplicate SKUs ---');
    console.log(duplicateSkus);
    console.log('--- Duplicate Titles ---');
    console.log(duplicateTitles);
    console.log('--- Duplicate UPCs/MPNs ---');
    console.log(duplicateUPCs);
}

checkDuplicates().catch(console.error);
