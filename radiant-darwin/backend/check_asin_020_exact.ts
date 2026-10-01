import axios from 'axios';
import { loadConfig } from './src/config.js';

async function run() {
    const config = loadConfig();
    const asins = ['B08RWF2VX1', 'B07ZHNWMH2', 'B0C73TN8WQ'];

    for (const asin of asins) {
        const proxyUrl = `http://api.scraperapi.com/?api_key=${config.scraperApiKey}&url=https://www.amazon.com/dp/${asin}&premium=true`;
        try {
            const response = await axios.get(proxyUrl, { timeout: 30000 });
            const html = response.data;
            const match = html.match(/<title>(.*?)<\/title>/);
            console.log(`${asin}: ${match[1]}`);
        } catch (e) {
            console.error(e.message);
        }
    }
}

run().catch(console.error);
