"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDb = initDb;
exports.getDb = getDb;
const sqlite3_1 = __importDefault(require("sqlite3"));
const sqlite_1 = require("sqlite");
const path_1 = __importDefault(require("path"));
let dbInstance = null;
async function initDb() {
    if (dbInstance) {
        return dbInstance;
    }
    const dbPath = path_1.default.resolve(__dirname, '..', 'data', 'database.sqlite');
    // Ensure data directory exists
    const fs = require('fs');
    const dataDir = path_1.default.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    dbInstance = await (0, sqlite_1.open)({
        filename: dbPath,
        driver: sqlite3_1.default.Database
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
    return dbInstance;
}
async function getDb() {
    if (!dbInstance) {
        return await initDb();
    }
    return dbInstance;
}
