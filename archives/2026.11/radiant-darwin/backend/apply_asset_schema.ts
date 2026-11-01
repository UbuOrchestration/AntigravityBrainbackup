import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
import { getDb } from './src/db.js';

async function applyAssetSchema() {
    console.log('[SYSTEM ARCHITECTURE] Updating asset storage schema...');
    const db = await getDb();
    
    await db.run(`
        CREATE TABLE IF NOT EXISTS asset_fingerprints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sku TEXT NOT NULL,
            image_url TEXT UNIQUE NOT NULL,
            image_hash TEXT NOT NULL,
            byte_size INTEGER NOT NULL,
            last_verified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(sku) REFERENCES inventory(sku)
        );
    `);
    
    await db.run('CREATE INDEX IF NOT EXISTS idx_asset_hash ON asset_fingerprints(image_hash);');
    
    console.log('[SYSTEM ARCHITECTURE] Asset storage schema updated successfully.');
}

applyAssetSchema().catch(console.error);
