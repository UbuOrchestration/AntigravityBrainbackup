import { getDb } from './src/db.js';
async function update() {
    const db = await getDb();
    await db.run('UPDATE inventory SET valid_image_urls = ? WHERE valid_image_urls = ? OR valid_image_urls IS NULL', ['["https://example.com/placeholder-rv-item.jpg"]', '[]']);
    console.log('Images updated.');
}
update();
