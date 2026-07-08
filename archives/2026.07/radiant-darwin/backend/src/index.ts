import express from 'express';
import cors from 'cors';
import { loadConfig, saveConfig } from './config.js';
import { getDb } from './db.js';
import { getAuthUrl, exchangeCode, getActiveListings } from './ebayApi.js';
import { startTracker, stopTracker, getTrackerState, runRepricerIteration } from './tracker.js';
import { startDispatcher } from './dispatcher.js';
import { startOrderSync } from './order_sync.js';
import { startAutoCheckout } from './auto_checkout.js';
import { startTrackingSync } from './tracking_sync.js';
import { startOrphanAudit } from './orphan_audit.js';
import { startTransitDaemon } from './transit_daemon.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Load initial config and auto-start tracker if already connected
const config = loadConfig();
if (config.refreshToken) {
  startTracker(480); // Run every 480 minutes (8 hours)
  startDispatcher(1440); // Run every 24 hours
  startOrderSync(30); // Run every 30 minutes
  startAutoCheckout(15); // Run every 15 minutes
  startTrackingSync(60); // Run every 60 minutes
  startOrphanAudit(1440); // Run every 24 hours (daily)
  startTransitDaemon(1440); // Run every 24 hours (daily)
}

// Admin Routes for Dashboard
app.post('/api/admin/config/update', async (req, res) => {
    const { webhook_alert_url } = req.body;
    try {
        const db = await getDb();
        await db.run(`UPDATE fulfillment_config SET webhook_alert_url = ? WHERE id = 1`, [webhook_alert_url]);
        return res.status(200).json({ success: true });
    } catch (err: any) {
        return res.status(500).json({ error: "Failed to persist core updates to configuration index." });
    }
});

app.post('/api/admin/inventory/patch-specific', async (req, res) => {
    const { sku, key, value } = req.body;
    try {
        const db = await getDb();
        const item = await db.get(`SELECT item_specifics_json FROM inventory WHERE sku = ?`, [sku]);
        if (!item) return res.status(404).json({ error: "Item not found" });
        
        let specifics = {};
        try {
            specifics = JSON.parse(item.item_specifics_json || '{}');
        } catch (e) {}
        
        specifics[key] = value;
        
        await db.run(`
            UPDATE inventory 
            SET item_specifics_json = ?, status = 'PENDING', listing_description = NULL 
            WHERE sku = ?
        `, [JSON.stringify(specifics), sku]);
        
        return res.status(200).json({ success: true });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/orders', async (req, res) => {
    try {
        const db = await getDb();
        const orders = await db.all('SELECT * FROM sales_orders ORDER BY order_timestamp DESC');
        res.json(orders);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/orders/retry', async (req, res) => {
    const { ebay_order_id } = req.body;

    if (!ebay_order_id) {
        return res.status(400).json({ error: "Missing required parameter: ebay_order_id" });
    }

    try {
        const db = await getDb();
        const result = await db.run(`
            UPDATE sales_orders 
            SET fulfillment_status = 'UNFULFILLED', order_notes = 'Manual retry queued from dashboard', b2b_request_id = NULL 
            WHERE ebay_order_id = ? AND fulfillment_status = 'ERROR_MANUAL_REVIEW'
        `, [ebay_order_id]);

        if (result.changes === 0) {
            return res.status(404).json({ error: "Target order not found or not in review status." });
        }

        res.status(200).json({ success: true, message: "Order reset to pipeline entry queue successfully." });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: "Database state transition failed." });
    }
});

app.post('/api/admin/orders/cancel-ebay', async (req, res) => {
    const { ebay_order_id, cancellation_reason } = req.body; // 'OUT_OF_STOCK' or 'BUYER_ASKED'
    
    if (!ebay_order_id || !cancellation_reason) {
        return res.status(400).json({ error: "Missing required parameters." });
    }

    try {
        const db = await getDb();
        const order = await db.get(`SELECT sku FROM sales_orders WHERE ebay_order_id = ?`, [ebay_order_id]);
        
        if (!order) {
            return res.status(404).json({ error: "Order record missing from local ledger." });
        }

        const currentConfig = loadConfig();
        const { ensureValidToken } = await import('./ebayApi.js');
        const token = await ensureValidToken(currentConfig);

        // Target API: eBay Fulfillment API POST /order/{orderId}/cancel
        const ebayResponse = await fetch(`https://api.ebay.com/sell/fulfillment/v1/order/${ebay_order_id}/cancel`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ 
                cancelReason: cancellation_reason === 'OUT_OF_STOCK' ? 'OUT_OF_STOCK_OR_CASES' : 'BUYER_CANCEL_OR_ADDRESS_ISSUE' 
            })
        });

        if (ebayResponse.ok) {
            // Flip states internally, zero inventory allocation, and log operational reason notes
            await db.run(`UPDATE sales_orders SET fulfillment_status = 'CANCELLED', order_notes = ? WHERE ebay_order_id = ?`, [`Cancelled via panel: ${cancellation_reason}`, ebay_order_id]);
            await db.run(`UPDATE inventory SET quantity = 0, status = 'PAUSED_OOS' WHERE sku = ?`, [order.sku]);
            
            return res.status(200).json({ success: true, message: "eBay cancellation executed, inventory set to zero." });
        }
        
        console.warn(`[EBAY CANCEL FAILED] Status: ${ebayResponse.status}`);
        res.status(500).json({ error: "eBay API rejected order dismissal request payload." });
    } catch (error: any) {
        console.error("[CANCEL EBAY ERROR]:", error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/metrics/summary', async (req, res) => {
    try {
        const db = await getDb();
        const sql = `
            SELECT 
                COUNT(id) as total_sales,
                SUM(revenue) as gross_revenue,
                SUM(supplier_cost) as total_sourcing_costs,
                SUM(ebay_fees + ad_fees) as total_platform_fees,
                SUM(net_profit) as net_profit_pool,
                AVG(net_profit) as avg_profit_per_order
            FROM financial_ledger
        `;
        const row = await db.get(sql);
        
        res.status(200).json({
            totalSales: row?.total_sales || 0,
            grossRevenue: row?.gross_revenue || 0,
            totalSourcingCosts: row?.total_sourcing_costs || 0,
            totalPlatformFees: row?.total_platform_fees || 0,
            netProfitPool: row?.net_profit_pool || 0,
            avgProfitPerOrder: row?.avg_profit_per_order || 0
        });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: "Failed to aggregate dashboard analytics vectors." });
    }
});

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
    startTracker(480);
    startDispatcher(1440);

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
    const db = await getDb();
    const dbRows = await db.all('SELECT * FROM inventory');
    const maps: Record<string, any> = {};
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
  } catch (error: any) {
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
    const db = await getDb();
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/listings/map/:itemId', async (req, res) => {
  const itemId = req.params.itemId;
  try {
    const db = await getDb();
    await db.run('DELETE FROM inventory WHERE ebay_item_id = ?', [itemId]);
    res.json({ success: true, message: 'Listing unmapped successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Tracker Service Control Endpoints
app.get('/api/tracker/state', (req, res) => {
  res.json(getTrackerState());
});

app.post('/api/tracker/start', (req, res) => {
  startTracker(480);
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
