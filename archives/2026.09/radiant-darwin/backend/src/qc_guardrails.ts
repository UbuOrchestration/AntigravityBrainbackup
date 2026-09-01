import { getDb } from './db.js';

export async function checkDuplicateListing(title: string, sku: string): Promise<boolean> {
    const db = await getDb();
    
    // Check if there is another ACTIVE listing with the exact same title
    const row = await db.get(
        `SELECT sku FROM inventory WHERE title = ? AND sku != ? AND status = 'ACTIVE'`, 
        [title, sku]
    );
    
    return !!row;
}
