import { getDb } from './db.js';
import { runPrecisionPreFlightCheck } from './precision_guard.js';
import { checkForLegacyCatalogCollisions } from './ingestion_deduper.js';
import { harvestProductAssets } from './image_fetcher.js';

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
            
            // Step 1.5: Intercept Structural Duplicates
            const dedupResult = await checkForLegacyCatalogCollisions(product);
            if (dedupResult.action === 'BLOCK_COLLISION') {
                console.warn(`[ENTRY REJECTED] ${product.title} blocked by deduplicator: ${dedupResult.reason}`);
                rejectedCount++;
                continue;
            }

            // Step 2: Advanced Verification Pre-Flight Matrix
            const dbRecord = await db.get(`SELECT content_hash FROM inventory WHERE upc_mpn = ?`, [product.upc_mpn]);
            const preFlight = await runPrecisionPreFlightCheck(product, dbRecord);

            if (preFlight.status === 'SKIP_NO_DRIFT') {
                console.log(`[ENTRY SKIPPED] ${product.title} has not drifted. Hash: ${preFlight.hash}`);
                continue;
            }

            if (preFlight.status === 'REJECT') {
                console.warn(`[ENTRY REJECTED] ${product.title}: ${preFlight.reason}`);
                rejectedCount++;
                continue;
            }
            
            if (preFlight.status === 'ERROR') {
                console.error(`[ENTRY ERROR] ${product.title}: ${preFlight.reason}`);
                rejectedCount++;
                continue;
            }

            // Step 3: Fetch Resilient Images
            const customSku = `ARB-${product.source_platform.toUpperCase()}-${product.id}`;
            const verifiedImages = await harvestProductAssets(customSku, product.source_url, product.upc_mpn, product.source_platform);
            
            // Step 4: Establish base mapping into SQLite inventory table
            await db.run(`
                INSERT OR REPLACE INTO inventory (
                    sku, upc_mpn, source_platform, source_url, title, cost_tier, p_source, p_sold, p_ebay, last_margin, quantity, delivery_days, status, content_hash, variation_count, hazard_compliance_json, valid_image_urls
                ) VALUES (?, ?, ?, ?, ?, 'PENDING_CALC', 0.0, 0.0, 0.0, 0.0, 0, 0, 'PENDING', ?, ?, ?, ?)
            `, [customSku, product.upc_mpn, product.source_platform, product.source_url, product.title, preFlight.hash, 1, JSON.stringify(preFlight.hazardData || []), JSON.stringify(verifiedImages)]);
            
            insertedCount++;
        }
        
        console.log(`[INGESTION] Bulk queue processed. Inserted: ${insertedCount} | VeRO Rejected: ${rejectedCount}`);
    } catch (error: any) {
        console.error('[INGESTION] Fatal Error:', error.message);
    }
}
