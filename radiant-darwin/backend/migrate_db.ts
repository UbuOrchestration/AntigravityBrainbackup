import { getDb } from './src/db.js';

async function migrate() {
    const db = await getDb();
    console.log("Applying DB migration to add image_sync_pending column...");
    try {
        await db.run("ALTER TABLE inventory ADD COLUMN image_sync_pending INTEGER DEFAULT 0");
        console.log("Migration successful.");
    } catch (e: any) {
        if (e.message.includes('duplicate column name')) {
            console.log("Migration already applied.");
        } else {
            console.error("Migration failed:", e.message);
        }
    }
}
migrate();
