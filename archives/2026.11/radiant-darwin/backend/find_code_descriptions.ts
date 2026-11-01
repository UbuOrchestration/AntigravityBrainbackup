import { getDb } from './src/db.js';

async function checkDescriptions() {
    const db = await getDb();
    const rows = await db.all("SELECT id, sku, title, listing_description FROM inventory");
    
    let count = 0;
    for (const row of rows) {
        if (!row.listing_description) continue;
        const desc = row.listing_description.toLowerCase();
        
        // Look for common code syntax
        if (
            desc.includes("```") || 
            desc.includes('{"') || 
            desc.includes('":') || 
            desc.includes("json") || 
            desc.includes("function ") ||
            desc.includes("const ") ||
            desc.includes("export ") ||
            desc.includes("import ")
        ) {
            count++;
            console.log(`\n--- SKU: ${row.sku} --- Title: ${row.title}`);
            console.log("DESCRIPTION PREVIEW:\n", row.listing_description.substring(0, 300));
        }
    }
    console.log(`Found ${count} matching listings.`);
}
checkDescriptions();
