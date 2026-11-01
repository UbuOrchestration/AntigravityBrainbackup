import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
import { getDb } from './src/db.js';

async function check() { 
    const db = await getDb(); 
    const rows = await db.all('SELECT sku, title, optimized_title, status FROM inventory WHERE title LIKE "%wheel%" OR title LIKE "%chock%" OR title LIKE "%block%" COLLATE NOCASE'); 
    console.log(rows); 
} 
check();
