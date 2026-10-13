import axios from 'axios';
import * as cheerio from 'cheerio';

async function searchProduct() {
    try {
        const query = encodeURIComponent('site:amazon.com "Camco" "Leveling Blocks" "10" "44505"');
        const res = await axios.get(`https://html.duckduckgo.com/html/?q=${query}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        const $ = cheerio.load(res.data);
        $('.result__snippet').each((i, el) => {
            console.log($(el).text().trim());
        });
        $('a.result__url').each((i, el) => {
            console.log($(el).attr('href'));
        });
    } catch (e: any) {
        console.error(e.message);
    }
}

searchProduct().catch(console.error);
