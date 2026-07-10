import { loadConfig } from './config.js';
import { getDb } from './db.js';
import { scrapeSourceProduct } from './scraper.js';
import { updateListingInventory, getCompletedSales, updateListingImage } from './ebayApi.js';
import { runQC } from './qc_agent.js';

export interface ActivityLog {
  timestamp: string;
  itemId: string;
  title: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

let isRunning = false;
let lastRunTime: string | null = null;
let timerId: NodeJS.Timeout | null = null;
const activityLogs: ActivityLog[] = [];

export function getTrackerState() {
  return {
    isRunning,
    lastRunTime,
    logs: activityLogs.slice(-100) // Return last 100 logs
  };
}

export function logActivity(itemId: string, title: string, type: ActivityLog['type'], message: string) {
  const logEntry: ActivityLog = {
    timestamp: new Date().toISOString(),
    itemId,
    title,
    type,
    message
  };
  activityLogs.push(logEntry);
  if (activityLogs.length > 500) {
    activityLogs.shift();
  }
  console.log(`[REPRICER] [${type.toUpperCase()}] ${title || itemId}: ${message}`);
}

/**
 * Calculates exact target selling price based on cost, target ROI, shipping, and eBay fees.
 * S = (Cost * (1 + ROI/100) + FixedFee + Shipping) / (1 - FeePercent)
 */
export function calculateTargetPrice(
  sourceCost: number,
  targetRoiPercent: number, // Legacy param, overridden by matrix
  minProfit: number = 15.00, // Legacy param, overridden by matrix
  shippingCost: number = 0,
  shippingCharged: number = 0,
  ebayFeePercent: number = 13.25, // Standard eBay FVF (approx)
  ebayFixedFee: number = 0.30,
  completedSalesAvg: number | null = null
): number {
  // SYSTEM INSTRUCTION: TIERED MARGIN MATRIX
  let activeRoiPercent = targetRoiPercent;
  let activeMinProfit = minProfit;

  if (sourceCost <= 20.00) {
    // LOW TIER
    activeRoiPercent = 30;
    activeMinProfit = 5.00;
  } else if (sourceCost <= 75.00) {
    // MID TIER
    activeRoiPercent = 15;
    activeMinProfit = 0; // Strictly 15%
  } else {
    // HIGH TIER
    activeRoiPercent = 15;
    activeMinProfit = 0; // Strictly 15%
  }

  const targetProfit = Math.max(sourceCost * (activeRoiPercent / 100), activeMinProfit);
  const revenueRequired = sourceCost + targetProfit + ebayFixedFee + shippingCost;
  const standardTargetPrice = (revenueRequired / (1 - (ebayFeePercent / 100))) - shippingCharged;
  
  // Competitive Alignment Logic for low-cost items (Legacy/Adjusted)
  // We can still try to align if it clears the matrix floor, but if the user wants strict logic, 
  // we just return standardTargetPrice and let the caller handle uncompetitiveness.
  // The system instruction says: "If P_ebay exceeds P_sold by >10%... abort".
  // This means P_ebay should be the true calculated standardTargetPrice.
  
  return parseFloat(standardTargetPrice.toFixed(2));
}

/**
 * Run a single iteration of the repricing logic across all mapped listings.
 */
export async function runRepricerIteration(): Promise<void> {
  const config = loadConfig();
  const db = await getDb();
  
  const rows = await db.all('SELECT * FROM inventory');
  const itemIds = rows.map(r => r.ebay_item_id).filter(id => id);

  if (itemIds.length === 0) {
    logActivity('', 'System', 'info', 'No mapped listings to scan. Add mappings to start repricing.');
    return;
  }

  logActivity('', 'System', 'info', `Starting repricing iteration for ${itemIds.length} listings...`);
  
  // if (!config.refreshToken) {
  //   logActivity('', 'System', 'error', 'eBay accounts is not connected. Skipping repricing run.');
  //   return;
  // }

  for (const row of rows) {
    const itemId = row.ebay_item_id;
    // Allow processing of PENDING items that lack an itemId so they get their initial p_ebay
    if (!itemId && row.status !== 'PENDING') continue;

    try {
      if (row.image_sync_pending === 1 && itemId) {
        logActivity(itemId, row.title, 'info', `Image sync pending. Pushing valid_image_urls to eBay...`);
        try {
          let validImages = [];
          if (row.valid_image_urls) {
             validImages = JSON.parse(row.valid_image_urls);
          }
          if (validImages.length > 0) {
             await updateListingImage(itemId, validImages[0], config);
             await db.run('UPDATE inventory SET image_sync_pending = 0 WHERE ebay_item_id = ?', [itemId]);
             logActivity(itemId, row.title, 'success', `Image sync complete.`);
          }
        } catch (err: any) {
          logActivity(itemId, row.title, 'error', `Image sync failed: ${err.message}`);
        }
      }

      logActivity(itemId || 'PENDING', row.title, 'info', `Scanning source product at ${row.source_url}...`);
      
      // RUN QC AGENT (mocked map object for qc agent)
      const mapObj = {
        itemId: row.ebay_item_id,
        title: row.title,
        sourceUrl: row.source_url,
        status: row.status,
        currentPrice: row.p_ebay
      };

      const qcResult = runQC(mapObj as any);
      if (!qcResult.passed) {
        logActivity(itemId, row.title, 'error', `QC FAILED: ${qcResult.reason}`);
        if (row.status !== qcResult.statusFlag) {
          logActivity(itemId, row.title, 'warning', `Risk detected. Zeroing eBay inventory to prevent sales.`);
          await updateListingInventory(itemId, row.p_ebay, 0, config);
          await db.run('UPDATE inventory SET status = ?, quantity = 0 WHERE ebay_item_id = ?', [qcResult.statusFlag || 'Error', itemId]);
        } else {
          logActivity(itemId, row.title, 'info', `Item is already suspended for risk: ${qcResult.statusFlag}.`);
        }
        continue; // Skip further repricing for this dangerous item
      }
      
      const sourceData = await scrapeSourceProduct(row.source_url, row.sku);
      
      const p_source = sourceData.price;
      const lastChecked = new Date().toISOString();

      const targetRoi = config.targetRoi;
      const minProfit = config.minProfit;
      const shippingCost = 0; // Or grab from db if added
      const shippingCharged = 0;
      
      let completedSalesAvg: number | null = null;
      if (sourceData.price < 25.00) {
        logActivity(itemId, row.title, 'info', `Low-cost item detected ($${sourceData.price}). Checking eBay completed sales...`);
        completedSalesAvg = await getCompletedSales(row.title, sourceData.price);
        if (completedSalesAvg) {
          logActivity(itemId, row.title, 'info', `Average eBay Sold Price: $${completedSalesAvg}`);
        }
      }

      const calculatedPrice = calculateTargetPrice(
        sourceData.price, 
        targetRoi, 
        minProfit, 
        shippingCost, 
        shippingCharged,
        13.25,
        0.30,
        completedSalesAvg
      );
      
      let priceChanged = Math.abs(row.p_ebay - calculatedPrice) > 0.05;
      
      // Stock rule logic & Reconiliation Audit
      let newQuantity: number | undefined = undefined;
      let suspensionReason = '';
      let newStatus = 'PENDING';
      
      const autoStock = true; // Based on mapping

      if (autoStock) {
        // 1. INVENTORY CHECK (STOCKOUT GUARD)
        const maxDelivery = config.maxDeliveryDays || 7;
        const deliveryTooLong = sourceData.deliveryDays !== undefined && sourceData.deliveryDays > maxDelivery;
        
        if (!sourceData.inStock) {
          newQuantity = 0; // Mark out of stock on eBay
          newStatus = 'PAUSED_OOS';
          suspensionReason = 'Source is out of stock.';
        } else if (deliveryTooLong) {
          newQuantity = 0;
          newStatus = 'PAUSED_OOS';
          suspensionReason = `Delivery takes ${sourceData.deliveryDays} days (exceeds ${maxDelivery} max).`;
        } else {
          newQuantity = 1; // Standard listing quantity
          newStatus = 'ACTIVE';
        }

        // 2. PRICE FLUCTUATION AUDIT (COMPETITIVENESS)
        // If we must raise our eBay price to recover margin, check if it's too high above completed sales.
        if (newQuantity !== 0 && completedSalesAvg !== null) {
          const tolerance = (config.competitivenessTolerancePercent || 15) / 100;
          const maxAllowedPrice = completedSalesAvg * (1 + tolerance);
          if (calculatedPrice > maxAllowedPrice) {
            newQuantity = 0;
            newStatus = 'PAUSED_MARGIN';
            suspensionReason = `Target price $${calculatedPrice.toFixed(2)} exceeds competitive ceiling $${maxAllowedPrice.toFixed(2)}.`;
          }
        }
      }

      const autoPrice = true;
      let p_ebay = row.p_ebay;

      if (priceChanged && autoPrice && newQuantity !== 0) {
        logActivity(
          itemId || 'PENDING',
          row.title,
          'warning',
          `Price mismatch detected. eBay: $${row.p_ebay.toFixed(2)} vs Target: $${calculatedPrice.toFixed(2)} (Source: $${sourceData.price.toFixed(2)}). Updating...`
        );

        // Call eBay to update ONLY if it is actively listed
        if (itemId) {
            await updateListingInventory(itemId, calculatedPrice, newQuantity, config);
        }
        
        p_ebay = calculatedPrice;
        newStatus = itemId ? 'ACTIVE' : 'PENDING';
        logActivity(itemId || 'PENDING', row.title, 'success', `Price successfully updated to $${calculatedPrice.toFixed(2)}`);
      } else if (newQuantity === 0 && autoStock) {
        logActivity(itemId || 'PENDING', row.title, 'warning', `Suspending listing: ${suspensionReason}`);
        if (itemId) {
            await updateListingInventory(itemId, row.p_ebay, 0, config);
        }
        logActivity(itemId || 'PENDING', row.title, 'success', 'Stock set to 0 on eBay.');
      } else {
        newStatus = sourceData.inStock ? (itemId ? 'ACTIVE' : 'PENDING') : 'PAUSED_OOS';
        if (newStatus === 'ACTIVE' || newStatus === 'PENDING') {
            logActivity(itemId || 'PENDING', row.title, 'info', `Price is healthy ($${row.p_ebay.toFixed(2)}). No updates needed.`);
        }
      }

      await db.run(`
        UPDATE inventory SET 
          p_source = ?, p_ebay = ?, p_sold = ?, quantity = ?, status = ?, last_audited = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [p_source, p_ebay, completedSalesAvg || 0, newQuantity !== undefined ? newQuantity : row.quantity, newStatus, row.id]);

    } catch (err: any) {
      logActivity(itemId, row.title, 'error', `Failed to reprice listing: ${err.message}`);
      await db.run('UPDATE inventory SET status = ? WHERE ebay_item_id = ?', ['ERROR', itemId]);
    }
  }

  lastRunTime = new Date().toISOString();
  logActivity('', 'System', 'success', 'Finished repricing iteration.');
}

/**
 * Start the background polling loop.
 */
export function startTracker(intervalMinutes: number = 10): void {
  if (isRunning) return;
  isRunning = true;
  logActivity('', 'Repricer Service', 'success', `Background repricer started. Running every ${intervalMinutes} minutes.`);
  
  // Run immediately on startup
  runRepricerIteration().catch(err => {
    console.error('Error running initial repricer iteration:', err);
  });

  // Set interval
  timerId = setInterval(() => {
    runRepricerIteration().catch(err => {
      console.error('Error running repricer iteration:', err);
    });
  }, intervalMinutes * 60 * 1000);
}

/**
 * Stop the background polling loop.
 */
export function stopTracker(): void {
  if (!isRunning) return;
  isRunning = false;
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  logActivity('', 'Repricer Service', 'info', 'Background repricer stopped.');
}
