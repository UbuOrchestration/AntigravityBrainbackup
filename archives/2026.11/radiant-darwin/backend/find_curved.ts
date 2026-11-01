import axios from 'axios';
import { loadConfig } from './src/config.js';

async function run() {
    const config = loadConfig();
    const title = "Camco Curved Leveler and Chock Kit";
    const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(title)}`;
    const proxyUrl = `http://api.scraperapi.com/?api_key=${config.scraperApiKey}&url=${encodeURIComponent(searchUrl)}&premium=true`;

    try {
        const response = await axios.get(proxyUrl, { timeout: 30000 });
        const html = response.data;
        const itemRegex = /data-asin="(B0[a-zA-Z0-9]{8})"[^>]*>[\s\S]*?<span class="a-size-base-plus[^>]*>(.*?)<\/span>/g;
        let match;
        while ((match = itemRegex.exec(html)) !== null) {
            console.log(`Found: ${match[1]} - ${match[2]}`);
        }
    } catch (e) {
        console.error(e.message);
    }
}

run().catch(console.error);
