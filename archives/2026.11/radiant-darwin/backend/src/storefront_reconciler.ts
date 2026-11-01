import { getDb } from './db.js';
import { loadConfig } from './config.js';
import { ensureValidToken } from './ebayApi.js';
import { triggerSlackOrEmailNotification } from './alert_notifier.js';
import * as xml2js from 'xml2js';

export async function verifyLiveStorefrontPricing() {
    console.log("[AUDIT] Initiating live storefront price cross-examination...");
    const db = await getDb();

    const rows = await db.all(`SELECT id, sku, ebay_item_id, p_ebay, title FROM inventory WHERE status = 'ACTIVE'`);
    if (!rows || rows.length === 0) return;

    const currentConfig = loadConfig();
    const token = await ensureValidToken(currentConfig);

    for (const localItem of rows) {
        if (!localItem.ebay_item_id) continue;

        try {
            // Use Trading API's GetItem to retrieve live price structurally
            const xml = `<?xml version="1.0" encoding="utf-8"?>
<GetItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
    <ItemID>${localItem.ebay_item_id}</ItemID>
    <DetailLevel>ReturnSummary</DetailLevel>
</GetItemRequest>`;

            const response = await fetch('https://api.ebay.com/ws/api.dll', {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/xml',
                    'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
                    'X-EBAY-API-SITEID': '0',
                    'X-EBAY-API-CALL-NAME': 'GetItem',
                    'X-EBAY-API-IAF-TOKEN': `Bearer ${token}`
                },
                body: xml
            });

            const responseText = await response.text();
            const result = await xml2js.parseStringPromise(responseText, { explicitArray: false });

            if (result.GetItemResponse.Ack === 'Failure') {
                const errors = result.GetItemResponse.Errors;
                const errorCode = errors?.ErrorCode;
                if (errorCode === '17' || errorCode === '20404' || String(errors?.ShortMessage).includes("Invalid item ID")) {
                    console.warn(`[MISMATCH DETECTED] SKU ${localItem.sku} is active in DB but missing or deleted on eBay.`);
                    await db.run(`UPDATE inventory SET status = 'ERROR', qc_notes = 'Orphaned listing: Item missing from live eBay storefront.' WHERE id = ?`, [localItem.id]);
                }
                continue;
            }

            const itemData = result.GetItemResponse.Item;
            // Depending on listing type, the price is in StartPrice or BuyItNowPrice
            const liveEbayPrice = parseFloat(itemData?.StartPrice?._ || itemData?.StartPrice || 0);

            // --- THE CRITICAL INTEGRITY CHECK ---
            if (Math.abs(liveEbayPrice - localItem.p_ebay) > 0.01) {
                console.error(`[CRITICAL PRICE DRIFT] SKU ${localItem.sku} mismatch! DB Target: $${localItem.p_ebay}, Live Storefront: $${liveEbayPrice}`);

                // FORCE EMERGENCY SAFETY STOP
                await db.run(`
                    UPDATE inventory 
                    SET quantity = 0, 
                        status = 'ERROR', 
                        qc_status = 'FAILED_PURGE', 
                        qc_notes = ? 
                    WHERE id = ?
                `, [`Price drift caught! DB: $${localItem.p_ebay} vs Live: $${liveEbayPrice}. Listing paused safely.`, localItem.id]);

                // Instantly push a zero-quantity payload live to kill the listing layout and protect account
                await emergencyKillListing(localItem.ebay_item_id, token);
                
                await triggerSlackOrEmailNotification(`🚨 *Price Drift Emergency Stop*: SKU \`${localItem.sku}\` (${localItem.title}) was live with incorrect pricing ($${liveEbayPrice}). The system has forced-paused the listing.`);
            } else {
                console.log(`✅ [AUDIT PASSED] SKU ${localItem.sku} live price matches database parameters perfectly.`);
            }

        } catch (error: any) {
            console.error(`Failed to audit storefront consistency for SKU ${localItem.sku}:`, error.message);
        }
    }
}

async function emergencyKillListing(ebayItemId: string, token: string) {
    const xmlPayload = `<?xml version="1.0" encoding="utf-8"?>
    <ReviseInventoryStatusRequest xmlns="urn:ebay:apis:eBLBaseComponents">
        <InventoryStatus>
            <ItemID>${ebayItemId}</ItemID>
            <Quantity>0</Quantity>
        </InventoryStatus>
    </ReviseInventoryStatusRequest>`;

    await fetch('https://api.ebay.com/ws/api.dll', {
        method: 'POST',
        headers: {
            'X-EBAY-API-CALL-NAME': 'ReviseInventoryStatus',
            'X-EBAY-API-SITEID': '0',
            'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
            'Content-Type': 'text/xml',
            'X-EBAY-API-IAF-TOKEN': `Bearer ${token}`
        },
        body: xmlPayload
    });
}
