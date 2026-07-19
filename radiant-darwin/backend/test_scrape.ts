import { scrapeSourceProduct } from './src/scraper.js';

async function run() {
    console.log("Scraping B000BGJ800 (Camco TST MAX 30 count)...");
    const result1 = await scrapeSourceProduct('https://www.amazon.com/dp/B000BGJ800');
    console.log(result1);

    console.log("Scraping B0006IX87S (TastePURE 2-pack)...");
    const result2 = await scrapeSourceProduct('https://www.amazon.com/dp/B0006IX87S');
    console.log(result2);
}
run().catch(console.error);
