const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./data/database.sqlite');
db.run("UPDATE inventory SET valid_image_urls = '[]', qc_status = 'PENDING_REVIEW' WHERE sku = 'B004809YOC'", (err) => {
    if(err) console.error(err);
    else console.log('Successfully broke B004809YOC');
});
