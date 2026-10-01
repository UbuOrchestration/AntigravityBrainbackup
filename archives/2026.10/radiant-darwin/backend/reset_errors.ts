import { getDb } from './src/db.js';

async function run() {
    const db = await getDb();
    
    // Reset ERROR items so tracker will re-evaluate them
    await db.run("UPDATE inventory SET status = 'ACTIVE' WHERE status = 'ERROR'");
    console.log("Reset ERROR items to ACTIVE for repricer sweep.");
}

run().catch(console.error);
