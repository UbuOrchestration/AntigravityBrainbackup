const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function migrate() {
  const mapPath = path.join(__dirname, 'config', 'listings_metadata.json');
  const dbPath = path.join(__dirname, 'data', 'database.sqlite');
  
  if (!fs.existsSync(mapPath)) {
    console.log('No listings_metadata.json found. Skipping migration.');
    return;
  }

  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sku TEXT UNIQUE NOT NULL,
        ebay_item_id TEXT UNIQUE,
        upc_mpn TEXT NOT NULL,
        source_platform TEXT NOT NULL,
        source_url TEXT NOT NULL,
        title TEXT NOT NULL,
        cost_tier TEXT NOT NULL,
        p_source REAL NOT NULL,
        p_sold REAL NOT NULL,
        p_ebay REAL NOT NULL,
        last_margin REAL NOT NULL,
        quantity INTEGER DEFAULT 1,
        delivery_days INTEGER NOT NULL,
        last_audited TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'PENDING'
    );
  `);

  const maps = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  const itemIds = Object.keys(maps);
  
  let migrated = 0;
  for (const itemId of itemIds) {
    const map = maps[itemId];
    
    const sku = map.sourceSku || `MIGRATE-${itemId}`;
    const ebay_item_id = map.itemId;
    const upc_mpn = 'DOES NOT APPLY';
    const source_platform = map.sourceUrl.includes('walmart') ? 'walmart' : 'amazon';
    const source_url = map.sourceUrl;
    const title = map.title || 'Migrated Listing';
    const p_source = map.sourcePrice || 0;
    
    let cost_tier = 'MID';
    if (p_source <= 20) cost_tier = 'LOW';
    else if (p_source > 75) cost_tier = 'HIGH';

    const p_sold = 0; // Legacy data doesn't have this, it will update on next audit
    const p_ebay = map.currentPrice || 0;
    const last_margin = 0;
    const quantity = map.status === 'Active' ? 1 : 0;
    const delivery_days = 3; // Placeholder until next audit
    const status = map.status === 'Active' ? 'ACTIVE' : 'PAUSED_OOS';

    try {
      await db.run(`
        INSERT INTO inventory (
          sku, ebay_item_id, upc_mpn, source_platform, source_url, title, 
          cost_tier, p_source, p_sold, p_ebay, last_margin, quantity, 
          delivery_days, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(sku) DO NOTHING
      `, [
        sku, ebay_item_id, upc_mpn, source_platform, source_url, title,
        cost_tier, p_source, p_sold, p_ebay, last_margin, quantity,
        delivery_days, status
      ]);
      migrated++;
    } catch (err) {
      console.error(`Error migrating item ${itemId}:`, err.message);
    }
  }

  console.log(`Successfully migrated ${migrated} items to SQLite.`);
}

migrate().catch(console.error);
