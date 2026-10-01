import axios from 'axios';
import { loadConfig } from './src/config.js';
import { getDb } from './src/db.js';

async function run() {
    const config = loadConfig();
    const proxyUrl = `http://api.scraperapi.com/?api_key=${config.scraperApiKey}&url=https://www.amazon.com/dp/B0BVC1ZB1D&premium=true`;
    
    try {
        const response = await axios.get(proxyUrl, { timeout: 30000 });
        const match = response.data.match(/<title>(.*?)<\/title>/);
        const title = match ? match[1] : 'No title found';
        console.log("Title for B0BVC1ZB1D:", title);
        
        if (title.toLowerCase().includes("valterra") || title.toLowerCase().includes("surge")) {
            console.log("Looks correct. Updating DB...");
            const db = await getDb();
            await db.run("UPDATE inventory SET source_url = ?, upc_mpn = ? WHERE sku = ?", ['https://www.amazon.com/dp/B0BVC1ZB1D', 'B0BVC1ZB1D', 'ARB-AMAZON-RV-021']);
            console.log("Updated DB");
        } else {
             console.log("Does not look correct. Aborting update.");
        }
    } catch (e) {
        console.error("Error fetching ASIN:", e.message);
    }
}

run().catch(console.error);
