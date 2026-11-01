"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_js_1 = require("./config.js");
const db_js_1 = require("./db.js");
const ebayApi_js_1 = require("./ebayApi.js");
const tracker_js_1 = require("./tracker.js");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Load initial config and auto-start tracker if already connected
const config = (0, config_js_1.loadConfig)();
if (config.refreshToken) {
    (0, tracker_js_1.startTracker)(480); // Run every 480 minutes (8 hours)
}
// 1. Settings Endpoints
app.get('/api/settings', (req, res) => {
    const currentConfig = (0, config_js_1.loadConfig)();
    // Don't leak clientSecret fully in API responses (security practice)
    const safeConfig = {
        ...currentConfig,
        clientSecret: currentConfig.clientSecret ? '********' : ''
    };
    res.json(safeConfig);
});
app.post('/api/settings', (req, res) => {
    const currentConfig = (0, config_js_1.loadConfig)();
    const newSettings = req.body;
    // Preserve credentials if they weren't changed (submitted as masks)
    const clientSecret = newSettings.clientSecret === '********'
        ? currentConfig.clientSecret
        : newSettings.clientSecret;
    const updated = {
        ...currentConfig,
        clientId: newSettings.clientId ?? currentConfig.clientId,
        clientSecret: clientSecret ?? currentConfig.clientSecret,
        ruName: newSettings.ruName ?? currentConfig.ruName,
        sandbox: newSettings.sandbox ?? currentConfig.sandbox,
        targetRoi: Number(newSettings.targetRoi ?? currentConfig.targetRoi),
        minProfit: Number(newSettings.minProfit ?? currentConfig.minProfit),
    };
    (0, config_js_1.saveConfig)(updated);
    res.json({ success: true, message: 'Settings saved successfully' });
});
// 2. eBay OAuth Endpoints
app.get('/api/ebay/auth-url', (req, res) => {
    try {
        const currentConfig = (0, config_js_1.loadConfig)();
        if (!currentConfig.clientId || !currentConfig.ruName) {
            return res.status(400).json({ error: 'Please save Client ID and RuName in settings first.' });
        }
        const authUrl = (0, ebayApi_js_1.getAuthUrl)(currentConfig);
        res.json({ url: authUrl });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// OAuth Callback handler redirected from eBay
app.get('/api/ebay/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) {
        return res.status(400).send('Authorization code missing in callback request.');
    }
    try {
        const currentConfig = (0, config_js_1.loadConfig)();
        await (0, ebayApi_js_1.exchangeCode)(code, currentConfig);
        // Start tracker loop automatically now that we have access tokens
        (0, tracker_js_1.startTracker)(480);
        // Redirect user back to frontend settings screen
        const frontendUrl = 'http://localhost:5173/?tab=settings&connected=true';
        res.redirect(frontendUrl);
    }
    catch (error) {
        console.error('Error during token exchange:', error.message);
        res.status(500).send(`Authentication failed: ${error.message}`);
    }
});
// 3. Listings & Mapping Endpoints
app.get('/api/listings', async (req, res) => {
    try {
        const currentConfig = (0, config_js_1.loadConfig)();
        if (!currentConfig.refreshToken) {
            return res.json({ listings: [], connected: false });
        }
        const ebayListings = await (0, ebayApi_js_1.getActiveListings)(currentConfig);
        const db = await (0, db_js_1.getDb)();
        const dbRows = await db.all('SELECT * FROM inventory');
        const maps = {};
        dbRows.forEach(row => maps[row.ebay_item_id] = row);
        // Join eBay active listings with our local mapping details
        const listings = ebayListings.map(item => {
            const map = maps[item.itemId];
            return {
                ...item,
                mapped: !!map,
                sourceUrl: map?.source_url || '',
                sourceSku: map?.sku || '',
                sourcePrice: map?.p_source || 0,
                autoPrice: map?.quantity === 1,
                autoStock: map?.quantity === 1,
                status: map?.status || 'Unmapped',
                lastChecked: map?.last_audited || ''
            };
        });
        res.json({ listings, connected: true });
    }
    catch (error) {
        console.error('Error getting listings endpoint:', error.message);
        res.status(500).json({ error: error.message, listings: [], connected: false });
    }
});
app.post('/api/listings/map', async (req, res) => {
    const { itemId, title, currentPrice, sourceUrl, sourceSku, autoPrice, autoStock } = req.body;
    if (!itemId || !sourceUrl) {
        return res.status(400).json({ error: 'ItemID and Source URL are required.' });
    }
    try {
        const db = await (0, db_js_1.getDb)();
        const sku = sourceSku || `MAP-${itemId}`;
        const platform = sourceUrl.includes('walmart') ? 'walmart' : 'amazon';
        await db.run(`
      INSERT INTO inventory (
        sku, ebay_item_id, upc_mpn, source_platform, source_url, title, 
        cost_tier, p_source, p_sold, p_ebay, last_margin, quantity, delivery_days, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(sku) DO UPDATE SET
        ebay_item_id = excluded.ebay_item_id,
        source_url = excluded.source_url,
        title = excluded.title,
        p_ebay = excluded.p_ebay,
        quantity = excluded.quantity,
        status = excluded.status
    `, [
            sku, itemId, 'DOES NOT APPLY', platform, sourceUrl, title || 'eBay Item',
            'MID', 0, 0, Number(currentPrice || 0), 0, autoStock ? 1 : 0, 3, 'ACTIVE'
        ]);
        res.json({ success: true, message: 'Listing mapping saved successfully.' });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.delete('/api/listings/map/:itemId', async (req, res) => {
    const itemId = req.params.itemId;
    try {
        const db = await (0, db_js_1.getDb)();
        await db.run('DELETE FROM inventory WHERE ebay_item_id = ?', [itemId]);
        res.json({ success: true, message: 'Listing unmapped successfully.' });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// 4. Tracker Service Control Endpoints
app.get('/api/tracker/state', (req, res) => {
    res.json((0, tracker_js_1.getTrackerState)());
});
app.post('/api/tracker/start', (req, res) => {
    (0, tracker_js_1.startTracker)(480);
    res.json({ success: true, state: (0, tracker_js_1.getTrackerState)() });
});
app.post('/api/tracker/stop', (req, res) => {
    (0, tracker_js_1.stopTracker)();
    res.json({ success: true, state: (0, tracker_js_1.getTrackerState)() });
});
app.post('/api/tracker/run', async (req, res) => {
    try {
        await (0, tracker_js_1.runRepricerIteration)();
        res.json({ success: true, state: (0, tracker_js_1.getTrackerState)() });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.listen(PORT, () => {
    console.log(`Backend server running at http://localhost:${PORT}`);
});
