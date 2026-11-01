import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function checkOldDb() {
    const db = await open({
        filename: 'C:/Users/Ubu/Documents/antigravity/radiant-darwin/node_modules/ebay-arbitrage-backend/data/database.sqlite',
        driver: sqlite3.Database
    });

    const rows = await db.all("SELECT sku, title, source_url FROM inventory LIMIT 10");
    console.log("Found rows in node_modules db:", rows);
}

checkOldDb().catch(console.error);
