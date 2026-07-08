import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
import { getDb } from './src/db.js';
import { runPrecisionPreFlightCheck } from './src/precision_guard.js';
import { generateCassiniMetadata, validateProductImages } from './src/cassini_agent.js';

async function upgradeCatalog() {
    console.log('[UPGRADE] Starting manual catalog upgrade to modern standards...');
    const db = await getDb();
    const rows = await db.all('SELECT * FROM inventory');

    for (const row of rows) {
        console.log(`\n[UPGRADE] Processing ${row.sku} (${row.title})...`);

        // Mock a raw product payload from the DB row for the pre-flight check
        const rawPayload = {
            id: row.sku.replace('ARB-AMAZON-', ''), // rough extraction
            brand: 'Unknown',
            upc_mpn: row.upc_mpn,
            source_platform: row.source_platform,
            source_url: row.source_url,
            title: row.title,
            p_source: row.p_source,
            image_urls: JSON.parse(row.valid_image_urls || '[]'),
            description: row.listing_description || row.title
        };

        // 1. Precision Guard Check
        const preFlight = await runPrecisionPreFlightCheck(rawPayload, row);
        
        if (preFlight.status === 'REJECT' || preFlight.status === 'ERROR') {
            console.log(`[UPGRADE] Rejected by Pre-Flight: ${preFlight.reason}`);
            await db.run('UPDATE inventory SET status = "ERROR" WHERE sku = ?', [row.sku]);
            continue;
        }

        const validImages = preFlight.cleanImages || [];
        
        // 2. Cassini Metadata Generation
        console.log(`[UPGRADE] Generating Cassini metadata for ${row.sku}...`);
        const cassini = await generateCassiniMetadata(rawPayload);

        // 3. Update DB
        await db.run(`
            UPDATE inventory SET 
                content_hash = ?,
                variation_count = ?,
                hazard_compliance_json = ?,
                valid_image_urls = ?,
                optimized_title = ?,
                item_specifics_json = ?,
                listing_description = ?,
                status = 'PENDING'
            WHERE sku = ?
        `, [
            preFlight.hash,
            1,
            JSON.stringify(preFlight.hazardData || []),
            JSON.stringify(validImages),
            cassini.optimized_title,
            cassini.item_specifics_json,
            cassini.listing_description,
            row.sku
        ]);

        console.log(`[UPGRADE] Successfully upgraded ${row.sku} to modern standards.`);
    }

    console.log('\n[UPGRADE] Catalog upgrade complete! The dispatcher can now pick these up.');
}

upgradeCatalog().catch(console.error);
