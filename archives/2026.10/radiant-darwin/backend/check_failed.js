const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/database.sqlite');
db.all('SELECT sku, title, valid_image_urls FROM inventory WHERE ebay_item_id IN ("800309767579", "800309787447")', [], (err, rows) => {
    console.log(rows);
});
