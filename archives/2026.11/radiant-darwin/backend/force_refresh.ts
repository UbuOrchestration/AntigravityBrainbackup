import { loadConfig, saveConfig } from './src/config.js';
import { ensureValidToken } from './src/ebayApi.js';

async function run() {
    const config = loadConfig();
    config.tokenExpiresAt = 0; // Force refresh
    saveConfig(config);
    console.log("Forced token expiration. Refreshing...");
    
    await ensureValidToken(config);
    console.log("Token refreshed!");
}

run().catch(console.error);
