import { getDb } from './db.js';
import { generateCassiniMetadata } from './cassini_agent.js';
import { addFixedPriceItem } from './ebayApi.js';
import { loadConfig } from './config.js';

const DISPATCH_LIMIT_PER_DAY = 10;

/**
 * Main dispatcher logic loop.
 */
export async function runDispatcher() {
  console.log(`[DISPATCHER] Starting daily staged dispatch logic...`);
  
  const db = await getDb();
  
  // STEP 1: VELOCITY CONTROL FILTERING
  // Check how many items were successfully pushed today.
  const todayRow = await db.get(`
    SELECT COUNT(*) as count 
    FROM inventory 
    WHERE status = 'ACTIVE' 
      AND date(last_audited) = date('now') 
      AND ebay_item_id IS NOT NULL
  `);
  
  const pushedToday = todayRow ? todayRow.count : 0;
  
  if (pushedToday >= DISPATCH_LIMIT_PER_DAY) {
    console.log(`[DISPATCHER] Velocity limit reached. Pushed ${pushedToday}/${DISPATCH_LIMIT_PER_DAY} today. Skipping cycle to protect account.`);
    return;
  }
  
  const itemsToPush = DISPATCH_LIMIT_PER_DAY - pushedToday;
  console.log(`[DISPATCHER] Dispatch limit healthy. Pushing up to ${itemsToPush} items this cycle.`);

  // STEP 2: PRE-FLIGHT PAYLOAD BUILD
  // Get top items pending optimization
  const pendingRows = await db.all(`
    SELECT * FROM inventory 
    WHERE status = 'PENDING' 
      AND optimized_title IS NULL
    LIMIT ?
  `, [itemsToPush]);

  if (pendingRows.length === 0) {
    console.log(`[DISPATCHER] No pending un-optimized items found.`);
    return;
  }

  const config = loadConfig();

  for (const row of pendingRows) {
    console.log(`[DISPATCHER] Pre-flighting SKU: ${row.sku} (${row.title})`);
    
    // In the new architecture, Cassini Metadata is generated upfront during batch staging.
    // If for some reason it's missing, skip it and let a health-check fix it later, or log a warning.
    if (!row.optimized_title || !row.item_specifics_json || !row.listing_description) {
      console.warn(`[DISPATCHER] Missing Cassini metadata for SKU: ${row.sku}. Skipping.`);
      continue;
    }

    // STEP 3: API TRANSMISSION
    console.log(`[DISPATCHER] Transmitting AddFixedPriceItem to eBay API for SKU: ${row.sku}`);
    try {
      let imageUrls: string[] = [];
      try {
        imageUrls = JSON.parse(row.valid_image_urls || '[]');
      } catch (e) {
        console.warn(`[DISPATCHER] Failed to parse valid_image_urls for ${row.sku}. Falling back to default.`);
      }

      if (imageUrls.length === 0) {
        // Fallback or skip
        console.warn(`[DISPATCHER] SKU ${row.sku} has no valid images. Skipping transmission.`);
        continue;
      }
      
      const itemId = await addFixedPriceItem(
        row.optimized_title,
        row.listing_description,
        row.item_specifics_json,
        row.p_ebay,
        row.quantity,
        imageUrls,
        config
      );
      
      console.log(`[DISPATCHER] SUCCESS! eBay ID: ${itemId}`);
      await db.run(`
        UPDATE inventory SET 
          ebay_item_id = ?, 
          status = 'ACTIVE',
          last_audited = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [itemId, row.id]);

    } catch (err: any) {
      console.error(`[DISPATCHER] API Failure for ${row.sku}:`, err.message);
      await db.run(`
        UPDATE inventory SET 
          status = 'ERROR'
        WHERE id = ?
      `, [row.id]);
    }
  }

  console.log(`[DISPATCHER] Dispatch cycle complete.`);
}

let dispatcherInterval: NodeJS.Timeout | null = null;

export function startDispatcher(intervalMinutes = 24 * 60) {
  if (dispatcherInterval) {
    console.log('Dispatcher is already running.');
    return;
  }
  
  console.log(`[DISPATCHER] Starting background dispatcher. Interval: ${intervalMinutes} minutes.`);
  runDispatcher(); // run immediately on startup
  
  dispatcherInterval = setInterval(runDispatcher, intervalMinutes * 60 * 1000);
}
