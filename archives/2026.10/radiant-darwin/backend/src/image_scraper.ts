import axios from 'axios';
import { loadConfig } from './config.js';

export async function fetchASINImages(asin: string): Promise<string[]> {
    const config = loadConfig();
    if (!config.scraperApiKey) {
        console.warn('[IMAGE_SCRAPER] No scraperApiKey configured.');
        return [];
    }

    const amazonUrl = `https://www.amazon.com/dp/${asin}`;
    const proxyUrl = `http://api.scraperapi.com/?api_key=${config.scraperApiKey}&url=${encodeURIComponent(amazonUrl)}&premium=true`;

    try {
        const response = await axios.get(proxyUrl, { timeout: 30000 });
        const html = response.data;
        
        const images: string[] = [];

        // Match hiRes JSON images
        const hiResMatches = html.match(/"hiRes":"([^"]+)"/g);
        if (hiResMatches) {
            for (const match of hiResMatches) {
                const url = match.replace('"hiRes":"', '').replace('"', '');
                if (url && url.startsWith('http') && !images.includes(url)) {
                    images.push(url);
                }
            }
        }

        // Match main landing image if hiRes not found
        if (images.length === 0) {
            const landingMatch = html.match(/data-old-hires="([^"]+)"/);
            if (landingMatch && landingMatch[1]) {
                images.push(landingMatch[1]);
            }
        }

        // Fallback large image match
        if (images.length === 0) {
            const largeMatch = html.match(/"large":"([^"]+)"/g);
            if (largeMatch) {
                for (const match of largeMatch) {
                    const url = match.replace('"large":"', '').replace('"', '');
                    if (url && url.startsWith('http') && !images.includes(url)) {
                        images.push(url);
                    }
                }
            }
        }

        // Validate first image is reachable
        const validImages: string[] = [];
        for (const img of images.slice(0, 5)) {
            try {
                const headRes = await axios.head(img, { timeout: 5000 });
                if (headRes.status === 200) {
                    validImages.push(img);
                }
            } catch {
                // If head request fails, keep URL if it looks like standard m.media-amazon.com URL
                if (img.includes('m.media-amazon.com')) {
                    validImages.push(img);
                }
            }
        }

        return validImages;
    } catch (e: any) {
        console.error(`[IMAGE_SCRAPER] Failed to fetch images for ASIN ${asin}: ${e.message}`);
        return [];
    }
}
