import { getDb } from './db.js';

export interface RawProduct {
    id: string;
    brand: string;
    upc_mpn: string;
    source_platform: string;
    source_url: string;
    title: string;
}

export async function processBulkIngestionQueue(rawProductArray: RawProduct[]) {
    console.log(`[INGESTION] Processing ${rawProductArray.length} raw products...`);
    try {
        const db = await getDb();
        let insertedCount = 0;
        let rejectedCount = 0;

        for (const product of rawProductArray) {
            // Step 1: Prevent toxic brand ingestion via active VeRO check
            const veroRow = await db.get(`SELECT 1 FROM brand_blacklist WHERE brand_name = UPPER(?)`, [product.brand.trim()]);
            const isBlacklisted = !!veroRow;

            if (isBlacklisted) {
                console.warn(`[ENTRY INTERCEPTED] Brand '${product.brand}' rejected via active VeRO validation.`);
                rejectedCount++;
                continue;
            }

            // Step 2: Establish base mapping into SQLite inventory table
            const customSku = `ARB-${product.source_platform.toUpperCase()}-${product.id}`;
            await db.run(`
                INSERT OR IGNORE INTO inventory (
                    sku, upc_mpn, source_platform, source_url, title, cost_tier, p_source, p_sold, p_ebay, last_margin, quantity, delivery_days, status
                ) VALUES (?, ?, ?, ?, ?, 'PENDING_CALC', 0.0, 0.0, 0.0, 0.0, 0, 0, 'PENDING')
            `, [customSku, product.upc_mpn, product.source_platform, product.source_url, product.title]);
            
            insertedCount++;
        }
        
        console.log(`[INGESTION] Bulk queue processed. Inserted: ${insertedCount} | VeRO Rejected: ${rejectedCount}`);
    } catch (error: any) {
        console.error('[INGESTION] Fatal Error:', error.message);
    }
}
