import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

export async function scrapeGoogleImages(query: string, count: number = 4): Promise<string[]> {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
    
    let imageUrls: string[] = [];
    try {
        const searchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
        
        // Google images usually have the class 'YQ4gaf' or 'rg_i'
        const htmlLength = await page.evaluate(() => document.documentElement.outerHTML.length);
        console.log('HTML length:', htmlLength);
        
        imageUrls = await page.evaluate((maxCount) => {
            const imgs = document.querySelectorAll('img');
            console.log('Total img tags found:', imgs.length);
            const urls: string[] = [];
            for (let img of imgs) {
                let src = img.getAttribute('src');
                if (!src) src = img.getAttribute('data-src');
                
                if (src && (src.startsWith('http') || src.startsWith('data:image'))) {
                    if (!src.includes('googlelogo') && !src.includes('cleardot') && !src.includes('favicon')) {
                        urls.push(src);
                    }
                }
                if (urls.length >= maxCount) break;
            }
            return urls;
        }, count);
        
    } catch (e) {
        console.error('Google Image scrape failed:', e);
    } finally {
        await browser.close();
    }
    
    return imageUrls;
}

// Test the scraper
if (process.argv[1] && process.argv[1].includes('google_image_scraper.ts')) {
    scrapeGoogleImages('Camco Heavy Duty RV Leveling Blocks').then(urls => {
        console.log('Scraped URLs:', urls);
    });
}
