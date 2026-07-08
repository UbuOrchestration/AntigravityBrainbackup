// image_validator_patched.js - Patched active verification gate
async function resilientFetch(url, options = {}) {
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

export async function verifyAndFormatEbayImages(sku, scrapedUrlArray) {
    const verifiedImagePayloads = [];

    for (const url of scrapedUrlArray) {
        try {
            // --- EBAY ERRORCODE 20004 HOTFIX INTERCEPTOR ---
            // Actively check if the scraped URL originates from any sub-domain of eBay's CDN
            if (url.includes('ebayimg.com') || url.includes('eps.ebay.com')) {
                console.warn(`[HOTFIX INTERCEPT] Stripped legacy eBay CDN link from SKU ${sku} to prevent EPS Mixture Block (20004): ${url}`);
                continue; // Drop the asset out of the loop array instantly
            }

            // Step 1: Execute a full GET block rather than a simple HEAD request
            const response = await resilientFetch(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });

            if (!response.ok) {
                console.warn(`[QC INTERCEPT] URL failed network access with status ${response.status}: ${url}`);
                continue;
            }

            const contentType = response.headers.get('content-type');
            const contentLength = parseInt(response.headers.get('content-length') || '0');

            // Step 2: Failsafe parameters against expired CDN tokens or dummy tracking pixels
            if (!contentType.includes('image') || contentLength < 5000) {
                console.warn(`[QC INTERCEPT] Structural rejection for SKU ${sku}. Asset is a corrupted block or tracking pixel.`);
                continue;
            }

            // Convert image stream natively to buffer array for immediate database checkpoint mapping
            const imgBuffer = await response.arrayBuffer();
            verifiedImagePayloads.push({
                sourceUrl: url,
                buffer: Buffer.from(imgBuffer),
                mimeType: contentType
            });

            if (verifiedImagePayloads.length >= 5) break; // Limit to top 5 verified images

        } catch (error) {
            console.error(`[ASSET ERROR] Deep network parsing failure for URL ${url}:`, error.message);
        }
    }

    return verifiedImagePayloads;
}
