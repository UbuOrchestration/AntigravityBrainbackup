import { getDb } from './src/db.js';
import fs from 'fs';
import path from 'path';

function calculateExpectedPricing(sourceCost: number) {
    let activeRoiPercent = 15;
    let activeMinProfit = 0;

    if (sourceCost <= 20.00) {
        activeRoiPercent = 30;
        activeMinProfit = 5.00;
    } else if (sourceCost <= 75.00) {
        activeRoiPercent = 15;
    } else {
        activeRoiPercent = 15;
    }

    const ebayFixedFee = 0.30;
    const ebayFeePercent = 13.25;

    const targetProfit = Math.max(sourceCost * (activeRoiPercent / 100), activeMinProfit);
    const revenueRequired = sourceCost + targetProfit + ebayFixedFee;
    const standardTargetPrice = (revenueRequired / (1 - (ebayFeePercent / 100)));
    
    return parseFloat(standardTargetPrice.toFixed(2));
}

function calculateActualROI(sourceCost: number, ebayPrice: number) {
    const ebayFixedFee = 0.30;
    const ebayFeePercent = 13.25;
    
    // Revenue after fees
    const netRevenue = ebayPrice * (1 - (ebayFeePercent / 100)) - ebayFixedFee;
    const profit = netRevenue - sourceCost;
    
    const roiPercent = (profit / sourceCost) * 100;
    return parseFloat(roiPercent.toFixed(2));
}

async function generatePricingReport() {
    console.log("Generating Pricing Report...");
    const db = await getDb();
    
    // Only query active items
    const listings = await db.all("SELECT title, sku, p_source, p_ebay, quantity, status FROM inventory WHERE status = 'ACTIVE' ORDER BY p_source DESC");
    
    let markdown = `# Storefront Pricing Audit\n\n`;
    markdown += `This report compares the active eBay listing prices against the exact cost we'd pay to fulfill from Amazon. It ensures all active listings are locked into the correct ROI Tier (Low Tier: 30% ROI / $5 Min, Mid/High Tier: 15% ROI).\n\n`;
    
    markdown += `| Title | SKU | Source Cost | eBay Price | Expected Price | Target ROI | Actual ROI | Status |\n`;
    markdown += `|---|---|---|---|---|---|---|---|\n`;

    let totalDiscrepancies = 0;

    for (const item of listings) {
        const expectedPrice = calculateExpectedPricing(item.p_source);
        const actualRoi = calculateActualROI(item.p_source, item.p_ebay);
        
        let targetRoi = "15%";
        if (item.p_source <= 20.00) {
            const potentialProfit = item.p_source * 0.30;
            targetRoi = potentialProfit < 5.00 ? "$5 Min" : "30%";
        }

        let isMatch = Math.abs(expectedPrice - item.p_ebay) <= 0.05;
        if (!isMatch) totalDiscrepancies++;
        
        const priceDisplay = isMatch ? `$${item.p_ebay.toFixed(2)}` : `**$${item.p_ebay.toFixed(2)}**`;

        markdown += `| ${item.title.substring(0, 30)}... | ${item.sku} | $${item.p_source.toFixed(2)} | ${priceDisplay} | $${expectedPrice.toFixed(2)} | ${targetRoi} | ${actualRoi}% | ${isMatch ? '✅ Aligned' : '❌ Mismatch'} |\n`;
    }

    markdown += `\n**Total Listings Audited:** ${listings.length}\n`;
    markdown += `**Pricing Discrepancies Detected:** ${totalDiscrepancies}\n\n`;
    
    if (totalDiscrepancies === 0) {
        markdown += `> [!TIP]\n> **100% Alignment.** Every single active item on the eBay storefront is strictly adhering to the configured pricing matrix!\n`;
    } else {
        markdown += `> [!WARNING]\n> **Discrepancies Detected.** Some active listings are not aligned with the pricing matrix. A repricer iteration may be required to sync them.\n`;
    }

    const artifactPath = path.join('C:\\Users\\Ubu\\.gemini\\antigravity\\brain\\480448e1-a537-4204-9b4f-cb5bfda403c3', 'pricing_report.md');
    fs.writeFileSync(artifactPath, markdown);
    console.log(`Generated Pricing Report at ${artifactPath}`);
}

generatePricingReport().catch(console.error);
