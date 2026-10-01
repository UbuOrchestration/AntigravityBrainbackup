import { getDb } from './db.js';
import { resilientFetch } from './api_client.js';

function parseZipFromLocalDB(addressStr: string) {
    const parts = addressStr.split(', ');
    return parts[parts.length - 1] || '';
}

function locateSecureZincMatch(zincHistoryOrders: any[], localOrder: any) {
    return zincHistoryOrders.find((z: any) => {
        if (!z.shipping_address) return false;
        
        // Deconstruct parameters natively to perform precise string intersection matching
        const zipMatch = z.shipping_address.postal_code.slice(0, 5) === parseZipFromLocalDB(localOrder.shipping_address).slice(0, 5);
        
        // Clean text mutations to handle name variations (e.g., "Jon Doe" vs "Jonathan Doe")
        const localLastName = localOrder.buyer_name.split(' ').pop().toLowerCase();
        const zincLastName = (z.shipping_address.last_name || '').toLowerCase();
        const lastNameMatch = localLastName === zincLastName || (z.shipping_address.first_name || '').toLowerCase().includes(localLastName);

        const quantityMatch = parseInt(z.products?.[0]?.qty || '0') === parseInt(localOrder.quantity_purchased);

        return zipMatch && lastNameMatch && quantityMatch && z.status !== 'failed';
    });
}

export async function reconcileOrphanedOrders() {
    console.log('[ORPHAN AUDIT] Running daily reconciliation scan for stuck orders...');
    try {
        const db = await getDb();
        // Select recently processed rows stuck in PENDING or ORDERED states
        const rows = await db.all(`SELECT ebay_order_id, fulfillment_status, shipping_address, buyer_name, quantity_purchased FROM sales_orders WHERE fulfillment_status IN ('UNFULFILLED', 'ORDERED')`);
        
        if (!rows || rows.length === 0) {
            console.log('[ORPHAN AUDIT] No unfulfilled/ordered rows found to audit.');
            return;
        }

        // Request the latest 100 client order profiles from Zinc historical logging logs
        const response = await resilientFetch('https://api.zinc.io/v1/orders?limit=100', {
            headers: { 'Authorization': `Basic ${Buffer.from((process.env.ZINC_CLIENT_TOKEN || '') + ':').toString('base64')}` }
        });
        
        let zincHistory: any = { orders: [] };
        if (response.ok) {
            zincHistory = await response.json();
        } else {
            console.warn('[ORPHAN AUDIT] Failed to fetch Zinc history. Simulating empty response for test environment.');
        }

        for (const localOrder of rows) {
            // Look for an address payload match inside recent external supplier payloads
            const match = locateSecureZincMatch(zincHistory.orders || [], localOrder);

            if (match && localOrder.fulfillment_status === 'UNFULFILLED') {
                // CRITICAL DISCOVERY: Order exists on Zinc but database failed to update. Link parameters immediately.
                await db.run(`UPDATE sales_orders SET fulfillment_status = 'ORDERED', b2b_request_id = ? WHERE ebay_order_id = ?`, [match.request_id, localOrder.ebay_order_id]);
                console.log(`[ORPHAN RECOVERED] Restored connection for eBay order ${localOrder.ebay_order_id} -> Zinc ${match.request_id}`);
            }
        }
        console.log('[ORPHAN AUDIT] Reconciliation scan complete.');
    } catch (error: any) {
        console.error("[ORPHAN AUDIT] Orphan recovery loop execution error:", error.message);
    }
}

let auditInterval: NodeJS.Timeout | null = null;

export function startOrphanAudit(intervalMinutes = 1440) {
  if (auditInterval) {
    console.log('[ORPHAN AUDIT] Daemon is already running.');
    return;
  }
  
  console.log(`[ORPHAN AUDIT] Starting background orphan recovery daemon. Interval: ${intervalMinutes} minutes.`);
  reconcileOrphanedOrders(); // run immediately on startup
  
  auditInterval = setInterval(reconcileOrphanedOrders, intervalMinutes * 60 * 1000);
}
