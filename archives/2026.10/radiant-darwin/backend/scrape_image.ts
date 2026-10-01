import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

async function fetchAmazonImage() {
    try {
        const url = 'https://www.amazon.com/Camco-25ft-TastePURE-Drinking-Water/dp/B004ME11FS';
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        };
        const response = await axios.get(url, { headers });
        const $ = cheerio.load(response.data);
        
        // Find the main image
        const imgTag = $('#landingImage').attr('data-old-hires') || $('#landingImage').attr('src');
        console.log("Scraped Amazon Image:", imgTag);
        
        if (!imgTag) {
            console.log("Could not find #landingImage in DOM. Trying regex...");
            const match = response.data.match(/"hiRes":"([^"]+)"/);
            if (match) {
                console.log("Regex Found:", match[1]);
            } else {
                console.log("No hiRes found.");
            }
        }
    } catch (e: any) {
        console.error("Scrape failed:", e.message);
    }
}
fetchAmazonImage();
