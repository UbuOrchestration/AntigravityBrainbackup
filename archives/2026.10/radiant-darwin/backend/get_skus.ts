import { getDb } from './src/db.js';
getDb().then(async db => {
    const rows = await db.all('SELECT sku FROM inventory');
    console.log(rows.map(r => r.sku).join(','));
});
