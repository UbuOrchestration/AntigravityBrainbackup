import { scrapeSourceProduct } from './src/scraper.js';

async function run() {
    console.log("Scraping known good ASIN: B002XL2IBS");
    try {
        const result = await scrapeSourceProduct('https://www.amazon.com/dp/B002XL2IBS', 'B002XL2IBS');
        console.log(result);
    } catch (e: any) {
        console.error(e.message);
    }
}
run().catch(console.error);
