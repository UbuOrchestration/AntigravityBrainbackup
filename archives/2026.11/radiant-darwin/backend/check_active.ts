import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
import { getDb } from './src/db.js';

async function check() { 
    const db = await getDb(); 
    const rows = await db.all('SELECT sku, source_url, status FROM inventory WHERE status = "ACTIVE" LIMIT 5'); 
    console.log(rows); 
} 
check();
