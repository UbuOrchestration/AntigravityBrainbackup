import { getDb } from '../src/db.js';

async function updateCamcoLevelingBlocks() {
    const db = await getDb();

    const authenticImages = [
        "https://m.media-amazon.com/images/I/610RNLs2GLL._AC_SL1500_.jpg",
        "https://m.media-amazon.com/images/I/61Ds4SjQJhL._AC_SL1500_.jpg",
        "https://m.media-amazon.com/images/I/81w1JXL-yxL._AC_SL1500_.jpg",
        "https://m.media-amazon.com/images/I/61FKD4nGETL._AC_SL1500_.jpg",
        "https://m.media-amazon.com/images/I/51soTEMN1WL._AC_SL1500_.jpg",
        "https://m.media-amazon.com/images/I/81MtfhcAJ6L._AC_SL1500_.jpg",
        "https://m.media-amazon.com/images/I/81DRer9r3JL._AC_SL1500_.jpg",
        "https://m.media-amazon.com/images/I/71Bp35uYJWL._AC_SL1500_.jpg"
    ];

    const sourceUrl = "https://www.amazon.com/dp/B00480BWCI";
    const upcMpn = "44505";
    const title = "Camco Heavy Duty Leveling Blocks, 10-Pack (44505)";
    const optTitle = "Camco Heavy Duty RV Leveling Blocks (10-pack)";
    const pSource = 54.83;
    // 15% Net ROI after eBay fee (13.25% + $0.30):
    // Target Net Profit = $8.23
    // Target Price = ($54.83 + $8.23 + $0.30) / (1 - 0.1325) = $63.36 / 0.8675 = $73.04
    const pEbay = 73.04;
    const lastMargin = 8.23;

    await db.run(`
        UPDATE inventory
        SET title = ?,
            optimized_title = ?,
            source_url = ?,
            upc_mpn = ?,
            p_source = ?,
            p_ebay = ?,
            last_margin = ?,
            cost_tier = 'MID',
            valid_image_urls = ?,
            image_sync_pending = 0,
            qc_status = 'PASSED',
            status = 'PENDING'
        WHERE sku = 'B004809YOC'
    `, [
        title,
        optTitle,
        sourceUrl,
        upcMpn,
        pSource,
        pEbay,
        lastMargin,
        JSON.stringify(authenticImages)
    ]);

    console.log("Successfully updated Camco Leveling Blocks in database.");
}

updateCamcoLevelingBlocks().catch(console.error);
