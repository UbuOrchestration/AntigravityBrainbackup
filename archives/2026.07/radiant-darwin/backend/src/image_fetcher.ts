import crypto from 'crypto';
import * as cheerio from 'cheerio';
import { getDb } from './db.js';

// Simple retry wrapper since api_client.js is not provided
async function resilientFetch(url: string, options: any = {}): Promise<Response> {
    const MAX_RETRIES = 3;
    let lastError = null;
    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            const res = await fetch(url, options);
            if (res.ok) return res;
            throw new Error(`HTTP ${res.status}`);
        } catch (err) {
            lastError = err;
            await new Promise(r => setTimeout(r, 1000 * (i + 1))); // exponential backoff
        }
    }
    throw lastError;
}

export async function harvestProductAssets(sku: string, sourceUrl: string, upcMpn: string, platform: string, title: string = ''): Promise<string[]> {
    let harvestedUrls: string[] = [];

    try {
        // STEP 1: PARSE DIRECT RETAILER DOM ASSETS
        // Skip direct fetch if URL is mock
        if (!sourceUrl.startsWith('MOCK')) {
            const response = await resilientFetch(sourceUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });
            const html = await response.text();
            const $ = cheerio.load(html);

            if (platform === 'amazon') {
                const imageBlockText = $('#landingImage').attr('data-a-dynamic-image') || $('#imgBlkFront').attr('data-a-dynamic-image');
                if (imageBlockText) {
                    harvestedUrls = Object.keys(JSON.parse(imageBlockText));
                }
            } else if (platform === 'walmart') {
                $('img[data-testid="vertical-carousel-image"]').each((i, el) => {
                    const src = $(el).attr('src');
                    if (src) harvestedUrls.push(src.split('?')[0]); 
                });
            }
        }
    } catch (err) {
        console.warn(`[SCRAPE FAILED] Direct DOM asset pull failed for SKU ${sku}. Retrying via Google API Fallback...`);
    }

    // STEP 2: STRICT FALLBACK TO UPCitemDB FOR GENUINE IMAGES
    if (harvestedUrls.length === 0 && title && title !== 'DOES NOT APPLY') {
        try {
            // Prefer upcMpn for high-fidelity matching, fallback to the primary title string
            const query = upcMpn && upcMpn.length > 5 ? upcMpn : title.split(',')[0];
            console.log(`[GENUINE IMAGE FALLBACK] Sourcing verified images from UPCitemDB for: ${query}`);
            
            const upcUrl = `https://api.upcitemdb.com/prod/trial/search?s=${encodeURIComponent(query)}`;
            const upcResponse = await resilientFetch(upcUrl);
            const upcData = await upcResponse.json();
            
            if (upcData && upcData.items && upcData.items.length > 0 && upcData.items[0].images) {
                harvestedUrls = upcData.items[0].images.slice(0, 4);
            }
        } catch (apiErr) {
            console.error(`[CRITICAL ASSET FAILURE] UPCitemDB fallback exhausted for SKU ${sku}`);
        }
    }
    
    if (harvestedUrls.length === 0) {
        console.error(`[CRITICAL ASSET FAILURE] Zero genuine images located for SKU ${sku}. Rejecting listing per strict image QC policy.`);
        throw new Error('NO_GENUINE_IMAGES');
    }

    // Run the harvested collection through the strict duplicate fingerprinting filter
    return await filterAndDeduplicateImages(sku, harvestedUrls);
}

// STEP 3: BINARY INTEGRITY AND DEDUPLICATION FILTER
async function filterAndDeduplicateImages(sku: string, urlArray: string[]): Promise<string[]> {
    const cleanAndVerifiedUrls: string[] = [];
    const db = await getDb();

    for (const url of urlArray) {
        // --- EBAY ERRORCODE 20004 HOTFIX INTERCEPTOR ---
        if (url.includes('ebayimg.com') || url.includes('eps.ebay.com')) {
            console.warn(`[HOTFIX INTERCEPT] Stripped legacy eBay CDN link from SKU ${sku} to prevent EPS Mixture Block (20004): ${url}`);
            continue;
        }

        try {
            const res = await fetch(url, { method: 'HEAD' });
            if (!res.ok) continue; 

            // Fetch actual binary fragment to generate a structural content hash
            const imgRes = await fetch(url);
            const buffer = Buffer.from(await imgRes.arrayBuffer());
            const imageHash = crypto.createHash('md5').update(buffer).digest('hex');

            const isDuplicate = await checkDatabaseForDuplicateHash(db, imageHash, sku);
            if (!isDuplicate) {
                cleanAndVerifiedUrls.push(url);
                // Log verified unique asset configuration profile to SQLite
                await db.run(
                    `INSERT OR IGNORE INTO asset_fingerprints (sku, image_url, image_hash, byte_size) VALUES (?, ?, ?, ?)`,
                    [sku, url, imageHash, buffer.length]
                );
            }
        } catch (e) {
            // Drop links that time out or trigger TLS connection rejections
            continue; 
        }
    }
    return cleanAndVerifiedUrls.slice(0, 5); // Return top 5 pristine, unique images
}

async function checkDatabaseForDuplicateHash(db: any, hash: string, sku: string): Promise<boolean> {
    const row = await db.get(`SELECT 1 FROM asset_fingerprints WHERE image_hash = ? AND sku = ?`, [hash, sku]);
    return !!row;
}
