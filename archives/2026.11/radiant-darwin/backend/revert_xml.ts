import { getDb } from './src/db.js';

async function resetFailedXML() {
    const db = await getDb();
    
    await db.run(`
        UPDATE inventory 
        SET status = 'PENDING'
        WHERE status = 'ERROR'
    `);
    
    console.log("Reverted all ERROR items to PENDING.");
}

resetFailedXML();
