import axios from 'axios';
import { loadConfig } from '../src/config.js';

async function testOne() {
    const config = loadConfig();
    const asin = 'B0006IX87S';
    const url = `https://www.amazon.com/dp/${asin}`;
    const proxyUrl = `http://api.scraperapi.com/?api_key=${config.scraperApiKey}&url=${encodeURIComponent(url)}&premium=true`;

    const res = await axios.get(proxyUrl, { timeout: 30000 });
    const match = res.data.match(/<title>(.*?)<\/title>/i);
    console.log(`Title for ${asin}:`, match ? match[1] : 'No title match');
    // Also test productTitle span
    const titleSpan = res.data.match(/id="productTitle"[^>]*>([\s\S]*?)<\/span>/i);
    if (titleSpan) {
        console.log(`ProductTitle span:`, titleSpan[1].trim());
    }
}

testOne().catch(console.error);
