"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTrackerState = getTrackerState;
exports.logActivity = logActivity;
exports.calculateTargetPrice = calculateTargetPrice;
exports.runRepricerIteration = runRepricerIteration;
exports.startTracker = startTracker;
exports.stopTracker = stopTracker;
const config_js_1 = require("./config.js");
const db_js_1 = require("./db.js");
const scraper_js_1 = require("./scraper.js");
const ebayApi_js_1 = require("./ebayApi.js");
const qc_agent_js_1 = require("./qc_agent.js");
let isRunning = false;
let lastRunTime = null;
let timerId = null;
const activityLogs = [];
function getTrackerState() {
    return {
        isRunning,
        lastRunTime,
        logs: activityLogs.slice(-100) // Return last 100 logs
    };
}
function logActivity(itemId, title, type, message) {
    const logEntry = {
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
function calculateTargetPrice(sourceCost, targetRoiPercent, // Legacy param, overridden by matrix
minProfit = 15.00, // Legacy param, overridden by matrix
shippingCost = 0, shippingCharged = 0, ebayFeePercent = 13.25, // Standard eBay FVF (approx)
ebayFixedFee = 0.30, completedSalesAvg = null) {
    // SYSTEM INSTRUCTION: TIERED MARGIN MATRIX
    let activeRoiPercent = targetRoiPercent;
    let activeMinProfit = minProfit;
    if (sourceCost <= 20.00) {
        // LOW TIER
        activeRoiPercent = 30;
        activeMinProfit = 5.00;
    }
    else if (sourceCost <= 75.00) {
        // MID TIER
        activeRoiPercent = 20;
        activeMinProfit = 0; // Strictly 20%
    }
    else {
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
async function runRepricerIteration() {
    const config = (0, config_js_1.loadConfig)();
    const db = await (0, db_js_1.getDb)();
    const rows = await db.all('SELECT * FROM inventory');
    const itemIds = rows.map(r => r.ebay_item_id).filter(id => id);
    if (itemIds.length === 0) {
        logActivity('', 'System', 'info', 'No mapped listings to scan. Add mappings to start repricing.');
        return;
    }
    logActivity('', 'System', 'info', `Starting repricing iteration for ${itemIds.length} listings...`);
    if (!config.refreshToken) {
        logActivity('', 'System', 'error', 'eBay accounts is not connected. Skipping repricing run.');
        return;
    }
    for (const row of rows) {
        const itemId = row.ebay_item_id;
        if (!itemId)
            continue;
        try {
            logActivity(itemId, row.title, 'info', `Scanning source product at ${row.source_url}...`);
            // RUN QC AGENT (mocked map object for qc agent)
            const mapObj = {
                itemId: row.ebay_item_id,
                title: row.title,
                sourceUrl: row.source_url,
                status: row.status,
                currentPrice: row.p_ebay
            };
            const qcResult = (0, qc_agent_js_1.runQC)(mapObj);
            if (!qcResult.passed) {
                logActivity(itemId, row.title, 'error', `QC FAILED: ${qcResult.reason}`);
                if (row.status !== qcResult.statusFlag) {
                    logActivity(itemId, row.title, 'warning', `Risk detected. Zeroing eBay inventory to prevent sales.`);
                    await (0, ebayApi_js_1.updateListingInventory)(itemId, row.p_ebay, 0, config);
                    await db.run('UPDATE inventory SET status = ?, quantity = 0 WHERE ebay_item_id = ?', [qcResult.statusFlag || 'Error', itemId]);
                }
                else {
                    logActivity(itemId, row.title, 'info', `Item is already suspended for risk: ${qcResult.statusFlag}.`);
                }
                continue; // Skip further repricing for this dangerous item
            }
            const sourceData = await (0, scraper_js_1.scrapeSourceProduct)(row.source_url, row.sku);
            const p_source = sourceData.price;
            const lastChecked = new Date().toISOString();
            const targetRoi = config.targetRoi;
            const minProfit = config.minProfit;
            const shippingCost = 0; // Or grab from db if added
            const shippingCharged = 0;
            let completedSalesAvg = null;
            if (sourceData.price < 25.00) {
                logActivity(itemId, row.title, 'info', `Low-cost item detected ($${sourceData.price}). Checking eBay completed sales...`);
                completedSalesAvg = await (0, ebayApi_js_1.getCompletedSales)(row.title, sourceData.price);
                if (completedSalesAvg) {
                    logActivity(itemId, row.title, 'info', `Average eBay Sold Price: $${completedSalesAvg}`);
                }
            }
            const calculatedPrice = calculateTargetPrice(sourceData.price, targetRoi, minProfit, shippingCost, shippingCharged, 13.25, 0.30, completedSalesAvg);
            let priceChanged = Math.abs(row.p_ebay - calculatedPrice) > 0.05;
            // Stock rule logic & Reconiliation Audit
            let newQuantity = undefined;
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
                }
                else if (deliveryTooLong) {
                    newQuantity = 0;
                    newStatus = 'PAUSED_OOS';
                    suspensionReason = `Delivery takes ${sourceData.deliveryDays} days (exceeds ${maxDelivery} max).`;
                }
                else {
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
                logActivity(itemId, row.title, 'warning', `Price mismatch detected. eBay: $${row.p_ebay.toFixed(2)} vs Target: $${calculatedPrice.toFixed(2)} (Source: $${sourceData.price.toFixed(2)}). Updating...`);
                // Call eBay to update
                await (0, ebayApi_js_1.updateListingInventory)(itemId, calculatedPrice, newQuantity, config);
                p_ebay = calculatedPrice;
                newStatus = 'ACTIVE';
                logActivity(itemId, row.title, 'success', `Price successfully updated to $${calculatedPrice.toFixed(2)}`);
            }
            else if (newQuantity === 0 && autoStock) {
                logActivity(itemId, row.title, 'warning', `Suspending listing: ${suspensionReason}`);
                await (0, ebayApi_js_1.updateListingInventory)(itemId, row.p_ebay, 0, config);
                logActivity(itemId, row.title, 'success', 'Stock set to 0 on eBay.');
            }
            else {
                newStatus = sourceData.inStock ? 'ACTIVE' : 'PAUSED_OOS';
                if (newStatus === 'ACTIVE') {
                    logActivity(itemId, row.title, 'info', `Price is healthy ($${row.p_ebay.toFixed(2)}). No updates needed.`);
                }
            }
            await db.run(`
        UPDATE inventory SET 
          p_source = ?, p_ebay = ?, p_sold = ?, quantity = ?, status = ?, last_audited = CURRENT_TIMESTAMP
        WHERE ebay_item_id = ?
      `, [p_source, p_ebay, completedSalesAvg || 0, newQuantity !== undefined ? newQuantity : row.quantity, newStatus, itemId]);
        }
        catch (err) {
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
function startTracker(intervalMinutes = 10) {
    if (isRunning)
        return;
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
function stopTracker() {
    if (!isRunning)
        return;
    isRunning = false;
    if (timerId) {
        clearInterval(timerId);
        timerId = null;
    }
    logActivity('', 'Repricer Service', 'info', 'Background repricer stopped.');
}
