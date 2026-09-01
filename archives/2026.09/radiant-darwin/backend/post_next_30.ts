import { getDb } from './src/db.js';
import { addFixedPriceItem } from './src/ebayApi.js';
import { loadConfig } from './src/config.js';
import * as fs from 'fs';

const PLACEHOLDER_IMAGE = "https://picsum.photos/600/600.jpg";
const GIMMICK_SENTENCE = "🔥 **LIMITED TIME OFFER: Act fast before we sell out! Fast and Free Shipping!** 🔥";

async function run() {
    const db = await getDb();
    const config = loadConfig();
    if (!config) throw new Error("No config");

    // Get existing SKUs from DB
    const rows = await db.all('SELECT sku FROM inventory');
    const existingSkus = new Set(rows.map((r: any) => r.sku));
    
    // Add known bad ones that were pushed to eBay but failed to insert to DB
    const skipped = ["ARB-AMAZON-RV-005", "ARB-AMAZON-RV-006", "ARB-AMAZON-RV-009", "ARB-AMAZON-RV-015", "ARB-AMAZON-RV-016", "ARB-AMAZON-RV-018", "ARB-AMAZON-RV-019", "ARB-AMAZON-RV-023", "ARB-AMAZON-RV-024", "ARB-AMAZON-RV-025", "ARB-AMAZON-RV-026", "ARB-AMAZON-RV-027", "ARB-AMAZON-RV-028", "ARB-AMAZON-RV-029", "ARB-AMAZON-RV-030", "ARB-AMAZON-RV-031", "ARB-AMAZON-RV-033", "ARB-AMAZON-RV-034", "ARB-AMAZON-RV-036", "ARB-AMAZON-RV-039"];
    skipped.forEach(s => existingSkus.add(s));

    // Parse profitable_rv_products.md
    const mdContent = fs.readFileSync('C:/Users/Ubu/.gemini/antigravity/brain/480448e1-a537-4204-9b4f-cb5bfda403c3/profitable_rv_products.md', 'utf-8');
    const lines = mdContent.split('\n');
    
    const candidates: any[] = [];
    
    for (const line of lines) {
        if (line.startsWith('| **RV-')) {
            const parts = line.split('|').map(s => s.trim());
            const rawSku = parts[1].replace(/\\*\\*/g, ''); 
            const skuStr = rawSku.replace(/\*/g, '');
            const fullSku = `ARB-AMAZON-${skuStr}`;
            
            const title = parts[2];
            const cost = parseFloat(parts[3].replace('$', ''));
            const price = parseFloat(parts[4].replace('$', ''));
            
            candidates.push({ sku: fullSku, title, cost, price });
        }
    }

    // Filter to find 30 new ones
    const toProcess = candidates.filter(c => !existingSkus.has(c.sku)).slice(0, 30);
    
    console.log(`Found ${toProcess.length} items to post.`);
    
    let count = 0;
    for (const item of toProcess) {
        console.log(`Processing new item: ${item.sku} - ${item.title}`);
        const desc = `${GIMMICK_SENTENCE}\n\n• High-quality ${item.title}.\n• Engineered for standard RV fitment and durability.\n• Brand new retail inventory, sealed in original packaging.`;
        
        try {
            const itemSpecificsJson = JSON.stringify({ Brand: item.title.split(' ')[0] });
            const ebayItemId = await addFixedPriceItem(item.sku, item.title, desc, itemSpecificsJson, item.price, 1, [PLACEHOLDER_IMAGE], config);
            
            await db.run("DELETE FROM inventory WHERE sku = ?", [item.sku]);
            
            const costTier = item.cost <= 20 ? 'low' : (item.cost <= 75 ? 'mid' : 'high');

            await db.run(`
                INSERT INTO inventory 
                (sku, title, listing_description, ebay_item_id, p_ebay, p_source, p_sold, status, quantity, delivery_days, valid_image_urls, upc_mpn, source_platform, source_url, cost_tier, last_margin)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 1, 3, ?, 'DOES NOT APPLY', 'amazon', 'https://amazon.com', ?, ?)
            `, [item.sku, item.title, desc, ebayItemId, item.price, item.cost, item.price, JSON.stringify([PLACEHOLDER_IMAGE]), costTier, item.price - item.cost]);
            
            console.log(`Successfully pushed ${item.sku} live to eBay with Item ID ${ebayItemId}`);
            count++;
        } catch (e: any) {
            console.error(`Failed to push ${item.sku}: ${e.message}`);
        }
        
        await new Promise(r => setTimeout(r, 1000));
    }
    console.log(`Successfully posted ${count} new listings.`);
}
run().catch(console.error);
