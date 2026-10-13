import { getDb } from './src/db.js';
import fs from 'fs';
import path from 'path';

async function generateReport() {
    console.log("Generating Detailed Store Listings Report...");
    const db = await getDb();
    
    // Query all items that have an ebay item ID
    const listings = await db.all(`
        SELECT sku, title, optimized_title, p_ebay, p_source, last_margin, source_url, ebay_item_id, status, quantity 
        FROM inventory 
        WHERE ebay_item_id IS NOT NULL 
        ORDER BY sku ASC
    `);
    
    let markdown = `# Detailed Store Listings Review\n\n`;
    markdown += `This report provides a side-by-side review of our store listings on eBay Sandbox against their supplier sources, including live listing links, titles, prices, and profit margins.\n\n`;
    markdown += `**Store Overview:**\n`;
    markdown += `- Total eBay Listings Tracked: **${listings.length}**\n`;
    markdown += `- eBay Sandbox Store URL: [View All Store Listings on eBay Sandbox](https://www.sandbox.ebay.com/sch/m.html?_ssn=Active%20Seller)\n\n`;
    
    markdown += `| SKU | Our eBay Title & Listing Link | Our Price | Supplier Title | Supplier Link | Supplier Cost | Est. Profit | Status |\n`;
    markdown += `|---|---|---|---|---|---|---|---|\n`;

    for (const item of listings) {
        const ourTitle = item.optimized_title || item.title;
        const supplierTitle = item.title;
        const cleanTitle = ourTitle.replace(/\|/g, '-');
        const cleanSupplierTitle = supplierTitle.replace(/\|/g, '-');
        
        const ebayLink = `[${cleanTitle.substring(0, 45)}...](https://www.sandbox.ebay.com/itm/${item.ebay_item_id})`;
        const sourceLink = `[View on Amazon](${item.source_url})`;
        const profit = item.last_margin !== undefined ? `$${item.last_margin.toFixed(2)}` : `$${(item.p_ebay - item.p_source).toFixed(2)}`;
        
        markdown += `| ${item.sku} | ${ebayLink} | $${item.p_ebay.toFixed(2)} | ${cleanSupplierTitle.substring(0, 40)}... | ${sourceLink} | $${item.p_source.toFixed(2)} | ${profit} | \`${item.status}\` |\n`;
    }

    const artifactPath = path.join('C:\\Users\\Ubu\\.gemini\\antigravity\\brain\\480448e1-a537-4204-9b4f-cb5bfda403c3', 'detailed_listings.md');
    fs.writeFileSync(artifactPath, markdown);
    console.log(`Generated Detailed Listings Report at ${artifactPath}`);
}

generateReport().catch(console.error);
