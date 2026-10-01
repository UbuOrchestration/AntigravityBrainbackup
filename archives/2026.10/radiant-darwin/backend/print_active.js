const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./data/database.sqlite');
db.all('SELECT sku, title, p_ebay, p_source, valid_image_urls, source_url FROM inventory WHERE status = "ACTIVE"', [], (err, rows) => {
    if (err) throw err;
    rows.forEach(r => {
        let urls = [];
        try { urls = JSON.parse(r.valid_image_urls || '[]'); } catch(e) {}
        console.log(`SKU: ${r.sku} | Price: $${r.p_ebay} | Cost: $${r.p_source}`);
        console.log(`URL: ${r.source_url}`);
        console.log(`Images (${urls.length}):`);
        urls.forEach(u => console.log(`  - ${u}`));
        console.log('---');
    });
});
