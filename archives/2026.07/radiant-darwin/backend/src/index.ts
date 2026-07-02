import express from 'express';
import cors from 'cors';
import { loadConfig, saveConfig, loadListingMaps, saveListingMaps, ListingMap } from './config.js';
import { getAuthUrl, exchangeCode, getActiveListings } from './ebayApi.js';
import { startTracker, stopTracker, getTrackerState, runRepricerIteration } from './tracker.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Load initial config and auto-start tracker if already connected
const config = loadConfig();
if (config.refreshToken) {
  startTracker(120); // Run every 120 minutes
}

// 1. Settings Endpoints
app.get('/api/settings', (req, res) => {
  const currentConfig = loadConfig();
  // Don't leak clientSecret fully in API responses (security practice)
  const safeConfig = {
    ...currentConfig,
    clientSecret: currentConfig.clientSecret ? '********' : ''
  };
  res.json(safeConfig);
});

app.post('/api/settings', (req, res) => {
  const currentConfig = loadConfig();
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

  saveConfig(updated);
  res.json({ success: true, message: 'Settings saved successfully' });
});

// 2. eBay OAuth Endpoints
app.get('/api/ebay/auth-url', (req, res) => {
  try {
    const currentConfig = loadConfig();
    if (!currentConfig.clientId || !currentConfig.ruName) {
      return res.status(400).json({ error: 'Please save Client ID and RuName in settings first.' });
    }
    const authUrl = getAuthUrl(currentConfig);
    res.json({ url: authUrl });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// OAuth Callback handler redirected from eBay
app.get('/api/ebay/callback', async (req, res) => {
  const code = req.query.code as string;
  if (!code) {
    return res.status(400).send('Authorization code missing in callback request.');
  }

  try {
    const currentConfig = loadConfig();
    await exchangeCode(code, currentConfig);
    
    // Start tracker loop automatically now that we have access tokens
    startTracker(120);

    // Redirect user back to frontend settings screen
    const frontendUrl = 'http://localhost:5173/?tab=settings&connected=true';
    res.redirect(frontendUrl);
  } catch (error: any) {
    console.error('Error during token exchange:', error.message);
    res.status(500).send(`Authentication failed: ${error.message}`);
  }
});

// 3. Listings & Mapping Endpoints
app.get('/api/listings', async (req, res) => {
  try {
    const currentConfig = loadConfig();
    if (!currentConfig.refreshToken) {
      return res.json({ listings: [], connected: false });
    }

    const ebayListings = await getActiveListings(currentConfig);
    const maps = loadListingMaps();

    // Join eBay active listings with our local mapping details
    const listings = ebayListings.map(item => {
      const map = maps[item.itemId];
      return {
        ...item,
        mapped: !!map,
        sourceUrl: map?.sourceUrl || '',
        sourceSku: map?.sourceSku || '',
        sourcePrice: map?.sourcePrice || 0,
        autoPrice: map?.autoPrice ?? false,
        autoStock: map?.autoStock ?? false,
        targetRoi: map?.targetRoi ?? currentConfig.targetRoi,
        status: map?.status || 'Unmapped',
        lastChecked: map?.lastChecked || ''
      };
    });

    res.json({ listings, connected: true });
  } catch (error: any) {
    console.error('Error getting listings endpoint:', error.message);
    res.status(500).json({ error: error.message, listings: [], connected: false });
  }
});

app.post('/api/listings/map', (req, res) => {
  const { itemId, title, currentPrice, sourceUrl, sourceSku, autoPrice, autoStock, targetRoi } = req.body;

  if (!itemId || !sourceUrl) {
    return res.status(400).json({ error: 'ItemID and Source URL are required.' });
  }

  const maps = loadListingMaps();
  const existing = maps[itemId] || {};

  const updatedMap: ListingMap = {
    itemId,
    title: title || existing.title || 'eBay Item',
    currentPrice: Number(currentPrice || existing.currentPrice || 0),
    sourceUrl,
    sourceSku: sourceSku || '',
    sourcePrice: existing.sourcePrice || 0,
    autoPrice: !!autoPrice,
    autoStock: !!autoStock,
    targetRoi: targetRoi !== undefined ? Number(targetRoi) : undefined,
    lastChecked: existing.lastChecked || '',
    status: existing.status || 'Active'
  };

  maps[itemId] = updatedMap;
  saveListingMaps(maps);

  res.json({ success: true, message: 'Listing mapping saved successfully.', mapping: updatedMap });
});

app.delete('/api/listings/map/:itemId', (req, res) => {
  const itemId = req.params.itemId;
  const maps = loadListingMaps();
  
  if (maps[itemId]) {
    delete maps[itemId];
    saveListingMaps(maps);
    return res.json({ success: true, message: 'Listing unmapped successfully.' });
  }
  
  res.status(404).json({ error: 'Mapping not found for this item.' });
});

// 4. Tracker Service Control Endpoints
app.get('/api/tracker/state', (req, res) => {
  res.json(getTrackerState());
});

app.post('/api/tracker/start', (req, res) => {
  startTracker(120);
  res.json({ success: true, state: getTrackerState() });
});

app.post('/api/tracker/stop', (req, res) => {
  stopTracker();
  res.json({ success: true, state: getTrackerState() });
});

app.post('/api/tracker/run', async (req, res) => {
  try {
    await runRepricerIteration();
    res.json({ success: true, state: getTrackerState() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}`);
});
