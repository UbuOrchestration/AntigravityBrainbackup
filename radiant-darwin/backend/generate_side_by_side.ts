import { getDb } from './src/db.js';
import * as fs from 'fs';

async function run() {
    const db = await getDb();
    const activeRows = await db.all("SELECT sku, title, source_platform, source_url, p_ebay, p_source, ebay_item_id FROM inventory WHERE status = 'ACTIVE' ORDER BY sku");
    
    let md = "# Active Listings Comparison\n\n";
    md += "This table provides a side-by-side comparison of our active eBay listings against their source listings on Amazon/Walmart.\n\n";
    md += "| SKU | Our eBay Listing | Source Listing (Fulfillment) | Our Price | Source Cost |\n";
    md += "|---|---|---|---|---|\n";
    
    for (const row of activeRows) {
        const ebayLink = row.ebay_item_id ? `[View on eBay](https://www.ebay.com/itm/${row.ebay_item_id})` : 'Pending';
        md += `| ${row.sku} | **${row.title}**<br>${ebayLink} | **${row.source_platform.toUpperCase()}**<br>[View Source](${row.source_url}) | $${row.p_ebay.toFixed(2)} | $${row.p_source.toFixed(2)} |\n`;
    }
    
    const outPath = 'C:/Users/Ubu/.gemini/antigravity/brain/480448e1-a537-4204-9b4f-cb5bfda403c3/side_by_side_listings.md';
    fs.writeFileSync(outPath, md);
    console.log(`Generated artifact at ${outPath}`);
}

run().catch(console.error);
