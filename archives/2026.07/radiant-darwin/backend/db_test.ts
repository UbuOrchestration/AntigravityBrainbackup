import { getDb } from './src/db.js';

async function test() {
    try {
        const db = await getDb();
        console.log('DB Connection successful');
        await db.run('INSERT INTO brand_blacklist (brand_name) VALUES (?)', ['TEST_BRAND']);
        console.log('Insert successful');
        await db.run('DELETE FROM brand_blacklist WHERE brand_name = ?', ['TEST_BRAND']);
        console.log('Delete successful');
        console.log('DB TEST PASS');
    } catch (err: any) {
        console.error('DB ERROR:', err.message);
    }
}
test();
