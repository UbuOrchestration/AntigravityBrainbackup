import { getDb } from '../src/db.js';

async function fixMissingImages() {
    const db = await getDb();
    
    // ARB-AMAZON-RV-022: RV Leveling Blocks
    const img22 = ["https://m.media-amazon.com/images/I/71wLpWvG1qL._AC_SL1500_.jpg"];
    await db.run("UPDATE inventory SET valid_image_urls = ? WHERE sku = 'ARB-AMAZON-RV-022'", [JSON.stringify(img22)]);

    // ARB-AMAZON-RV-065: Camco Sewer Hose Support / Fittings
    const img65 = ["https://m.media-amazon.com/images/I/71u9sD3+QHL._AC_SL1500_.jpg"];
    await db.run("UPDATE inventory SET valid_image_urls = ? WHERE sku = 'ARB-AMAZON-RV-065'", [JSON.stringify(img65)]);

    console.log("Updated images for RV-022 and RV-065.");
}

fixMissingImages().catch(console.error);
