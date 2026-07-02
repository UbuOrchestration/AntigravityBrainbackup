"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTrackerState = getTrackerState;
exports.logActivity = logActivity;
exports.calculateTargetPrice = calculateTargetPrice;
exports.runRepricerIteration = runRepricerIteration;
exports.startTracker = startTracker;
exports.stopTracker = stopTracker;
const config_js_1 = require("./config.js");
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
function calculateTargetPrice(sourceCost, targetRoiPercent, minProfit = 15.00, shippingCost = 0, shippingCharged = 0, ebayFeePercent = 13.25, // Standard eBay FVF (approx)
ebayFixedFee = 0.30, completedSalesAvg = null) {
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
async function runRepricerIteration() {
    const config = (0, config_js_1.loadConfig)();
    const maps = (0, config_js_1.loadListingMaps)();
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
            const qcResult = (0, qc_agent_js_1.runQC)(map);
            if (!qcResult.passed) {
                logActivity(itemId, map.title, 'error', `QC FAILED: ${qcResult.reason}`);
                if (map.status !== qcResult.statusFlag) {
                    logActivity(itemId, map.title, 'warning', `Risk detected. Zeroing eBay inventory to prevent sales.`);
                    await (0, ebayApi_js_1.updateListingInventory)(itemId, map.currentPrice, 0, config);
                    map.status = qcResult.statusFlag || 'Error';
                    maps[itemId] = map;
                    (0, config_js_1.saveListingMaps)(maps);
                }
                else {
                    logActivity(itemId, map.title, 'info', `Item is already suspended for risk: ${qcResult.statusFlag}.`);
                }
                continue; // Skip further repricing for this dangerous item
            }
            const sourceData = await (0, scraper_js_1.scrapeSourceProduct)(map.sourceUrl, map.sourceSku);
            map.sourcePrice = sourceData.price;
            map.lastChecked = new Date().toISOString();
            const targetRoi = map.targetRoi !== undefined ? map.targetRoi : config.targetRoi;
            const minProfit = map.minProfit !== undefined ? map.minProfit : config.minProfit;
            const shippingCost = map.shippingCost !== undefined ? map.shippingCost : 0;
            const shippingCharged = map.shippingCharged !== undefined ? map.shippingCharged : 0;
            let completedSalesAvg = null;
            if (sourceData.price < 25.00) {
                logActivity(itemId, map.title, 'info', `Low-cost item detected ($${sourceData.price}). Checking eBay completed sales...`);
                completedSalesAvg = await (0, ebayApi_js_1.getCompletedSales)(map.title, sourceData.price);
                if (completedSalesAvg) {
                    logActivity(itemId, map.title, 'info', `Average eBay Sold Price: $${completedSalesAvg}`);
                }
            }
            const calculatedPrice = calculateTargetPrice(sourceData.price, targetRoi, minProfit, shippingCost, shippingCharged, 13.25, 0.30, completedSalesAvg);
            let priceChanged = Math.abs(map.currentPrice - calculatedPrice) > 0.05;
            let stockStatusChanged = false; // We can track stock change if needed
            // Stock rule logic
            let newQuantity = undefined;
            if (map.autoStock) {
                if (!sourceData.inStock) {
                    newQuantity = 0; // Mark out of stock on eBay
                    map.status = 'Out of Stock (Source)';
                }
                else {
                    // If was previously out of stock or just normal
                    newQuantity = 1; // Standard listing quantity
                    map.status = 'Active';
                }
            }
            if (priceChanged && map.autoPrice) {
                logActivity(itemId, map.title, 'warning', `Price mismatch detected. eBay: $${map.currentPrice.toFixed(2)} vs Target: $${calculatedPrice.toFixed(2)} (Source: $${sourceData.price.toFixed(2)}). Updating...`);
                // Call eBay to update
                await (0, ebayApi_js_1.updateListingInventory)(itemId, calculatedPrice, newQuantity, config);
                map.currentPrice = calculatedPrice;
                map.status = 'Updated';
                logActivity(itemId, map.title, 'success', `Price successfully updated to $${calculatedPrice.toFixed(2)}`);
            }
            else if (newQuantity === 0 && map.autoStock) {
                logActivity(itemId, map.title, 'warning', 'Source is out of stock. Setting eBay listing stock to 0.');
                await (0, ebayApi_js_1.updateListingInventory)(itemId, map.currentPrice, 0, config);
                logActivity(itemId, map.title, 'success', 'Stock set to 0 on eBay.');
            }
            else {
                map.status = sourceData.inStock ? 'Active' : 'Out of Stock';
                logActivity(itemId, map.title, 'info', `Price is healthy ($${map.currentPrice.toFixed(2)}). No updates needed.`);
            }
            maps[itemId] = map;
            (0, config_js_1.saveListingMaps)(maps);
        }
        catch (err) {
            logActivity(itemId, map.title, 'error', `Failed to reprice listing: ${err.message}`);
            map.status = 'Error';
            maps[itemId] = map;
            (0, config_js_1.saveListingMaps)(maps);
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
