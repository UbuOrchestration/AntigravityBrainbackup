import { getDb } from './src/db.js';

async function run() {
    const db = await getDb();
    
    // Create trigger
    const sql = `
    CREATE TRIGGER IF NOT EXISTS trg_invalidate_images_on_asin_change
    AFTER UPDATE OF source_url, upc_mpn ON inventory
    FOR EACH ROW
    WHEN NEW.source_url != OLD.source_url OR NEW.upc_mpn != OLD.upc_mpn
    BEGIN
        UPDATE inventory SET image_sync_pending = 1 WHERE id = NEW.id;
    END;
    `;
    
    await db.run(sql);
    console.log("Deployed architectural fix: trg_invalidate_images_on_asin_change trigger created.");
}

run().catch(console.error);
