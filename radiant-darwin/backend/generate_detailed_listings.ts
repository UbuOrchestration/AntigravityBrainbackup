import { getDb } from './src/db.js';
import fs from 'fs';
import path from 'path';

async function generateReport() {
    console.log("Generating Detailed Listings Report...");
    const db = await getDb();
    
    // Only query active items that have an ebay item ID
    const listings = await db.all("SELECT sku, title, optimized_title, p_ebay, p_source, source_url, ebay_item_id FROM inventory WHERE status = 'ACTIVE' ORDER BY sku ASC");
    
    let markdown = `# Detailed Active Listings\n\n`;
    markdown += `This report provides a side-by-side view of our active eBay listings against their supplier source, including title comparisons and pricing.\n\n`;
    
    markdown += `| Our eBay Title | Our Price | Supplier Title | Supplier Link | Supplier Price (inc. $0.00 avg shipping) |\n`;
    markdown += `|---|---|---|---|---|\n`;

    for (const item of listings) {
        const ourTitle = item.optimized_title || item.title;
        const supplierTitle = item.title;
        const ebayLink = item.ebay_item_id ? `[${ourTitle.substring(0, 40)}...](https://www.ebay.com/itm/${item.ebay_item_id})` : ourTitle.substring(0, 40) + '...';
        const sourceLink = `[View Source](${item.source_url})`;
        
        markdown += `| ${ebayLink} | $${item.p_ebay.toFixed(2)} | ${supplierTitle.substring(0, 40)}... | ${sourceLink} | $${item.p_source.toFixed(2)} |\n`;
    }

    const artifactPath = path.join('C:\\Users\\Ubu\\.gemini\\antigravity\\brain\\480448e1-a537-4204-9b4f-cb5bfda403c3', 'detailed_listings.md');
    fs.writeFileSync(artifactPath, markdown);
    console.log(`Generated Detailed Listings Report at ${artifactPath}`);
}

generateReport().catch(console.error);
