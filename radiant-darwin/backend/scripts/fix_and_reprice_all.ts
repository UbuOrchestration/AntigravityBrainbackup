import { getDb } from '../src/db.js';

async function fixAndReprice() {
    console.log('[REPAIR] Starting automated database remediation & repricing...');
    const db = await getDb();
    const rows = await db.all('SELECT * FROM inventory');

    let repricedCount = 0;
    let imageCleanedCount = 0;

    for (const row of rows) {
        let pSource = parseFloat(row.p_source || 0);
        if (pSource <= 0) {
            pSource = 15.00; // Default reasonable fallback cost if missing
        }

        // Calculate Tiered Margin Matrix Price (Ceil to nearest cent to ensure ROI >= target)
        let targetEbayPrice = 0;
        if (pSource <= 20.0) {
            const minProfitPrice = pSource + 5.00;
            const roiPrice = Math.ceil(pSource * 1.30 * 100) / 100;
            targetEbayPrice = Math.max(minProfitPrice, roiPrice);
        } else {
            targetEbayPrice = Math.ceil(pSource * 1.15 * 100) / 100;
        }

        const lastMargin = Math.round((targetEbayPrice - pSource) * 100) / 100;

        // Clean image URLs
        let imageUrls: string[] = [];
        try {
            imageUrls = JSON.parse(row.valid_image_urls || '[]');
        } catch {
            imageUrls = [];
        }

        const cleanedImages = imageUrls.filter(url => 
            !url.includes('127.0.0.1') && 
            !url.includes('localhost') && 
            !url.includes('placeholder')
        );

        if (cleanedImages.length !== imageUrls.length) {
            imageCleanedCount++;
        }

        // Determine cost tier
        let costTier = 'MID';
        if (pSource <= 20) costTier = 'LOW';
        else if (pSource >= 100) costTier = 'HIGH';

        // Update database row
        await db.run(`
            UPDATE inventory 
            SET p_source = ?,
                p_ebay = ?,
                last_margin = ?,
                cost_tier = ?,
                valid_image_urls = ?
            WHERE id = ?
        `, [
            pSource,
            targetEbayPrice,
            lastMargin,
            costTier,
            JSON.stringify(cleanedImages),
            row.id
        ]);

        repricedCount++;
    }

    console.log(`[REPAIR] Complete! Repriced: ${repricedCount} items, Cleaned Mock Images: ${imageCleanedCount} items.`);
}

fixAndReprice().catch(console.error);
