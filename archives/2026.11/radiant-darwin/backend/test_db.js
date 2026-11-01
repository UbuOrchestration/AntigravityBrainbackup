const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/database.sqlite');
db.get('SELECT valid_image_urls FROM inventory WHERE sku LIKE "%TEST-002"', [], (err, row) => {
    console.log(row.valid_image_urls);
});
