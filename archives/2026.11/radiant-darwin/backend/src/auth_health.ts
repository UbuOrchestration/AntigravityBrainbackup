import { loadConfig } from './config.js';
import { ensureValidToken } from './ebayApi.js';

export async function checkAuthHealth(): Promise<boolean> {
    console.log('[AUTH_HEALTH] Inspecting eBay OAuth session state...');
    const config = loadConfig();

    if (!config.refreshToken) {
        console.error('[AUTH_HEALTH] ❌ No refresh token found in ebay_credentials.json.');
        return false;
    }

    try {
        const token = await ensureValidToken(config);
        if (token) {
            console.log('[AUTH_HEALTH] ✅ eBay OAuth Access Token is valid and ready.');
            return true;
        }
    } catch (e: any) {
        console.error(`[AUTH_HEALTH] ❌ OAuth Token Validation Failed: ${e.message}`);
    }
    return false;
}

if (require.main === module) {
    checkAuthHealth().then(valid => {
        if (!valid) {
            console.warn('[AUTH_HEALTH] Warning: Offline/Mock mode active until re-authentication.');
        }
    });
}
