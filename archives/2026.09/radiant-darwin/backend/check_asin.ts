import axios from 'axios';
import { loadConfig } from './src/config.js';

async function run() {
    const config = loadConfig();
    const proxyUrl = `http://api.scraperapi.com/?api_key=${config.scraperApiKey}&url=https://www.amazon.com/dp/B0GRZ517Y9&premium=true`;
    
    try {
        const response = await axios.get(proxyUrl, { timeout: 30000 });
        const match = response.data.match(/<title>(.*?)<\/title>/);
        console.log("Title for B0GRZ517Y9:", match ? match[1] : 'No title found');
    } catch (e) {
        console.error("Error fetching ASIN:", e.message);
    }

    // Now search for Valterra 30Amp Smart Surge Protector
    const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent("Valterra 30Amp Surge Protector A10-30SMSP")}`;
    const searchProxy = `http://api.scraperapi.com/?api_key=${config.scraperApiKey}&url=${encodeURIComponent(searchUrl)}&premium=true`;
    
    try {
        const response2 = await axios.get(searchProxy, { timeout: 30000 });
        const match2 = response2.data.match(/data-asin="(B0[a-zA-Z0-9]{8})"/);
        console.log("Search found ASIN:", match2 ? match2[1] : 'No ASIN found');
    } catch (e) {
        console.error("Error searching:", e.message);
    }
}

run().catch(console.error);
