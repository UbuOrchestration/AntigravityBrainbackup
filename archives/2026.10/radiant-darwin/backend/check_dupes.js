const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/database.sqlite');
db.all('SELECT sku, ebay_item_id, title FROM inventory WHERE status = "ACTIVE" AND title LIKE "%Leveling%"', [], (err, rows) => {
    console.log("Leveling Blocks Listings:");
    console.log(JSON.stringify(rows, null, 2));
});
