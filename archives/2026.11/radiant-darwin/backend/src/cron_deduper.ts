import { getDb } from './db.js';
import { updateListingInventory } from './ebayApi.js';
import { loadConfig } from './config.js';

export async function activeCatalogDeduplicationAudit() {
    console.log('[AUDIT] Scanning active records for multi-sourcing duplicate listings...');
    
    try {
        const db = await getDb();
        const activeRows = await db.all(`SELECT id, sku, upc_mpn, title, ebay_item_id, p_ebay FROM inventory WHERE status = 'ACTIVE'`);
        
        if (!activeRows || activeRows.length < 2) return;

        const processedIdentifiers = new Set();

        for (const row of activeRows) {
            const normalizedIdentifier = (row.upc_mpn || '').trim();
            
            if (normalizedIdentifier && normalizedIdentifier !== 'DOES NOT APPLY') {
                if (processedIdentifiers.has(normalizedIdentifier)) {
                    // CRITICAL COLLISION IDENTIFIED: This row is a multi-sourced duplicate variant
                    console.warn(`[DUPLICATE SEVERED] Flagging SKU ${row.sku} as duplicate of established catalog entry.`);
                    
                    await db.run(`
                        UPDATE inventory 
                        SET status = 'PAUSED_DUPLICATE', quantity = 0, qc_status = 'FAILED_PURGE', qc_notes = 'Automated multi-source deduplication purge.' 
                        WHERE id = ?
                    `, [row.id]);

                    // Immediately drop storefront listing visibility to prevent marketplace listing saturation
                    if (row.ebay_item_id) {
                        try {
                            const config = loadConfig();
                            await updateListingInventory(row.ebay_item_id, row.p_ebay, 0, config);
                            console.log(`[AUDIT] Successfully zeroed inventory on eBay for duplicate SKU: ${row.sku}`);
                        } catch (apiErr: any) {
                            console.error(`[AUDIT] Failed to zero inventory on eBay for SKU ${row.sku}:`, apiErr.message);
                        }
                    }
                } else {
                    processedIdentifiers.add(normalizedIdentifier);
                }
            }
        }
        
        console.log('[AUDIT] Deduplication sweep complete.');
    } catch (err: any) {
        console.error('[AUDIT] Fatal error during active catalog deduplication audit:', err.message);
    }
}
