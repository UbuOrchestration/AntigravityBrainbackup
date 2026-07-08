import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let dbInstance: Database | null = null;

export async function initDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = path.resolve(__dirname, '..', 'data', 'database.sqlite');

  // Ensure data directory exists
  const fs = require('fs');
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // SYSTEM ARCHITECTURE: SQLITE DATA SCHEMA
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sku TEXT UNIQUE NOT NULL,                  -- Generated unique identifier for the listing
        ebay_item_id TEXT UNIQUE,                 -- Nullable until listing is active on eBay
        upc_mpn TEXT NOT NULL,                     -- Strict product identifier
        source_platform TEXT NOT NULL,             -- 'amazon' or 'walmart'
        source_url TEXT NOT NULL,
        title TEXT NOT NULL,
        
        -- Pricing Metrics
        cost_tier TEXT NOT NULL,                  -- 'LOW', 'MID', 'HIGH'
        p_source REAL NOT NULL,                   -- Live supplier cost (Price + Tax + Shipping)
        p_sold REAL NOT NULL,                     -- 30-day historical average sold price on eBay
        p_ebay REAL NOT NULL,                     -- Current/Target live eBay listing price
        last_margin REAL NOT NULL,                -- Last calculated net profit margin
        
        -- Audit & State Controls
        quantity INTEGER DEFAULT 1,               -- 0 = Paused/OOS, 1 = Active
        delivery_days INTEGER NOT NULL,           -- Current supplier shipping speed
        last_audited TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'PENDING'             -- 'ACTIVE', 'PAUSED_OOS', 'PAUSED_MARGIN', 'ERROR'
    );

    CREATE INDEX IF NOT EXISTS idx_sku ON inventory(sku);
    CREATE INDEX IF NOT EXISTS idx_status ON inventory(status);
  `);

  // Migration scripts for tracking automation (added gracefully to avoid duplicate column errors)
  const columnsToAdd = [
    'ALTER TABLE inventory ADD COLUMN last_supplier_order_id TEXT DEFAULT NULL;',
    'ALTER TABLE inventory ADD COLUMN tracking_number TEXT DEFAULT NULL;',
    'ALTER TABLE inventory ADD COLUMN shipping_carrier TEXT DEFAULT NULL;',
    'ALTER TABLE inventory ADD COLUMN ebay_promo_rate REAL DEFAULT 0.03;',
    'ALTER TABLE inventory ADD COLUMN optimized_title TEXT DEFAULT NULL;',
    'ALTER TABLE inventory ADD COLUMN item_specifics_json TEXT DEFAULT \'{}\';',
    'ALTER TABLE inventory ADD COLUMN listing_description TEXT DEFAULT NULL;',
    'ALTER TABLE inventory ADD COLUMN valid_image_urls TEXT DEFAULT \'[]\';'
  ];

  for (const query of columnsToAdd) {
    try {
      await dbInstance.exec(query);
    } catch (err: any) {
      if (!err.message.includes('duplicate column name')) {
        console.error('Error adding column:', err.message);
      }
    }
  }

  // Create sales_orders table
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS sales_orders (
        ebay_order_id TEXT PRIMARY KEY,
        sku TEXT NOT NULL,
        buyer_username TEXT NOT NULL,
        buyer_name TEXT NOT NULL,
        shipping_address TEXT NOT NULL,
        quantity_purchased INTEGER NOT NULL,
        price_paid_by_buyer REAL NOT NULL,
        order_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fulfillment_status TEXT DEFAULT 'UNFULFILLED', -- 'UNFULFILLED', 'ORDERED', 'SHIPPED', 'CANCELLED'
        FOREIGN KEY(sku) REFERENCES inventory(sku)
    );
  `);

  // Migration scripts for sales_orders tracking automation
  const salesOrderColumns = [
    'ALTER TABLE sales_orders ADD COLUMN b2b_request_id TEXT DEFAULT NULL;',
    'ALTER TABLE sales_orders ADD COLUMN supplier_cost REAL DEFAULT 0.00;',
    'ALTER TABLE sales_orders ADD COLUMN order_notes TEXT DEFAULT NULL;'
  ];

  for (const query of salesOrderColumns) {
    try {
      await dbInstance.exec(query);
    } catch (err: any) {
      if (!err.message.includes('duplicate column name')) {
        console.error('Error adding column:', err.message);
      }
    }
  }

  // Create brand_blacklist table for VeRO protection
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS brand_blacklist (
        brand_name TEXT PRIMARY KEY NOT NULL
    );
  `);

  // Insert default high-risk VeRO brands
  await dbInstance.exec(`
    INSERT OR IGNORE INTO brand_blacklist (brand_name) VALUES 
    ('APPLE'), ('NIKE'), ('SONY'), ('FITBIT'), ('SAMSUNG'), ('LOGITECH'), ('OTTERBOX');
  `);

  return dbInstance;
}

export async function getDb(): Promise<Database> {
  if (!dbInstance) {
    return await initDb();
  }
  return dbInstance;
}
