import { getDb } from './src/db.js';
async function check() { 
    const db = await getDb(); 
    const rows = await db.all('SELECT * FROM inventory'); 
    console.log(JSON.stringify(rows, null, 2)); 
} 
check();
