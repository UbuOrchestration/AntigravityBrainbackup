import { loadConfig, loadListingMaps, saveListingMaps, ListingMap } from './config.js';
import { scrapeSourceProduct } from './scraper.js';
import { updateListingInventory, getCompletedSales } from './ebayApi.js';
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
  targetRoiPercent: number,
  minProfit: number = 15.00,
  shippingCost: number = 0,
  shippingCharged: number = 0,
  ebayFeePercent: number = 13.25, // Standard eBay FVF (approx)
  ebayFixedFee: number = 0.30,
  completedSalesAvg: number | null = null
): number {
  const targetProfit = Math.max(sourceCost * (targetRoiPercent / 100), minProfit);
  const revenueRequired = sourceCost + targetProfit + ebayFixedFee + shippingCost;
  const standardTargetPrice = (revenueRequired / (1 - (ebayFeePercent / 100))) - shippingCharged;
  
  // Competitive Alignment Logic for low-cost items
  if (completedSalesAvg !== null && sourceCost < 25.00) {
    // If we match the market, what is our profit?
    // Revenue = completedSalesAvg + shippingCharged
    // eBay Fee = Revenue * (ebayFeePercent / 100) + ebayFixedFee
    // Net Profit = Revenue - eBay Fee - sourceCost - shippingCost
    const ebayFee = (completedSalesAvg + shippingCharged) * (ebayFeePercent / 100) + ebayFixedFee;
    const netProfit = (completedSalesAvg + shippingCharged) - ebayFee - sourceCost - shippingCost;
    
    // Safety Floor: Only match market if we make at least $3.00 OR 15% ROI
    if (netProfit >= 3.00 || (netProfit / sourceCost) >= 0.15) {
      return parseFloat(completedSalesAvg.toFixed(2));
    }
  }

  return parseFloat(standardTargetPrice.toFixed(2));
}

/**
 * Run a single iteration of the repricing logic across all mapped listings.
 */
export async function runRepricerIteration(): Promise<void> {
  const config = loadConfig();
  const maps = loadListingMaps();
  const itemIds = Object.keys(maps);

  if (itemIds.length === 0) {
    logActivity('', 'System', 'info', 'No mapped listings to scan. Add mappings to start repricing.');
    return;
  }

  logActivity('', 'System', 'info', `Starting repricing iteration for ${itemIds.length} listings...`);
  
  if (!config.refreshToken) {
    logActivity('', 'System', 'error', 'eBay accounts is not connected. Skipping repricing run.');
    return;
  }

  for (const itemId of itemIds) {
    const map = maps[itemId];
    try {
      logActivity(itemId, map.title, 'info', `Scanning source product at ${map.sourceUrl}...`);
      
      // RUN QC AGENT
      const qcResult = runQC(map);
      if (!qcResult.passed) {
        logActivity(itemId, map.title, 'error', `QC FAILED: ${qcResult.reason}`);
        if (map.status !== qcResult.statusFlag) {
          logActivity(itemId, map.title, 'warning', `Risk detected. Zeroing eBay inventory to prevent sales.`);
          await updateListingInventory(itemId, map.currentPrice, 0, config);
          map.status = qcResult.statusFlag || 'Error';
          maps[itemId] = map;
          saveListingMaps(maps);
        } else {
          logActivity(itemId, map.title, 'info', `Item is already suspended for risk: ${qcResult.statusFlag}.`);
        }
        continue; // Skip further repricing for this dangerous item
      }
      
      const sourceData = await scrapeSourceProduct(map.sourceUrl, map.sourceSku);
      
      map.sourcePrice = sourceData.price;
      map.lastChecked = new Date().toISOString();

      const targetRoi = map.targetRoi !== undefined ? map.targetRoi : config.targetRoi;
      const minProfit = map.minProfit !== undefined ? map.minProfit : config.minProfit;
      const shippingCost = map.shippingCost !== undefined ? map.shippingCost : 0;
      const shippingCharged = map.shippingCharged !== undefined ? map.shippingCharged : 0;
      
      let completedSalesAvg: number | null = null;
      if (sourceData.price < 25.00) {
        logActivity(itemId, map.title, 'info', `Low-cost item detected ($${sourceData.price}). Checking eBay completed sales...`);
        completedSalesAvg = await getCompletedSales(map.title, sourceData.price);
        if (completedSalesAvg) {
          logActivity(itemId, map.title, 'info', `Average eBay Sold Price: $${completedSalesAvg}`);
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
      
      let priceChanged = Math.abs(map.currentPrice - calculatedPrice) > 0.05;
      let stockStatusChanged = false; // We can track stock change if needed
      
      // Stock rule logic & Reconiliation Audit
      let newQuantity: number | undefined = undefined;
      let suspensionReason = '';

      if (map.autoStock) {
        // 1. INVENTORY CHECK (STOCKOUT GUARD)
        const maxDelivery = config.maxDeliveryDays || 7;
        const deliveryTooLong = sourceData.deliveryDays !== undefined && sourceData.deliveryDays > maxDelivery;
        
        if (!sourceData.inStock) {
          newQuantity = 0; // Mark out of stock on eBay
          map.status = 'Out of Stock (Source)';
          suspensionReason = 'Source is out of stock.';
        } else if (deliveryTooLong) {
          newQuantity = 0;
          map.status = 'Suspended (Delivery Delay)';
          suspensionReason = `Delivery takes ${sourceData.deliveryDays} days (exceeds ${maxDelivery} max).`;
        } else {
          newQuantity = 1; // Standard listing quantity
          map.status = 'Active';
        }

        // 2. PRICE FLUCTUATION AUDIT (COMPETITIVENESS)
        // If we must raise our eBay price to recover margin, check if it's too high above completed sales.
        if (newQuantity !== 0 && completedSalesAvg !== null) {
          const tolerance = (config.competitivenessTolerancePercent || 15) / 100;
          const maxAllowedPrice = completedSalesAvg * (1 + tolerance);
          if (calculatedPrice > maxAllowedPrice) {
            newQuantity = 0;
            map.status = 'Unprofitable (Uncompetitive)';
            suspensionReason = `Target price $${calculatedPrice.toFixed(2)} exceeds competitive ceiling $${maxAllowedPrice.toFixed(2)}.`;
          }
        }
      }

      if (priceChanged && map.autoPrice) {
        logActivity(
          itemId,
          map.title,
          'warning',
          `Price mismatch detected. eBay: $${map.currentPrice.toFixed(2)} vs Target: $${calculatedPrice.toFixed(2)} (Source: $${sourceData.price.toFixed(2)}). Updating...`
        );

        // Call eBay to update
        await updateListingInventory(itemId, calculatedPrice, newQuantity, config);
        
        map.currentPrice = calculatedPrice;
        map.status = 'Updated';
        logActivity(itemId, map.title, 'success', `Price successfully updated to $${calculatedPrice.toFixed(2)}`);
      } else if (newQuantity === 0 && map.autoStock) {
        logActivity(itemId, map.title, 'warning', `Suspending listing: ${suspensionReason}`);
        await updateListingInventory(itemId, map.currentPrice, 0, config);
        logActivity(itemId, map.title, 'success', 'Stock set to 0 on eBay.');
      } else {
        map.status = sourceData.inStock ? 'Active' : 'Out of Stock';
        logActivity(itemId, map.title, 'info', `Price is healthy ($${map.currentPrice.toFixed(2)}). No updates needed.`);
      }

      maps[itemId] = map;
      saveListingMaps(maps);

    } catch (err: any) {
      logActivity(itemId, map.title, 'error', `Failed to reprice listing: ${err.message}`);
      map.status = 'Error';
      maps[itemId] = map;
      saveListingMaps(maps);
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
