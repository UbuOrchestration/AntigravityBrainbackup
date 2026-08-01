import { getDb } from './db.js';
import { resilientFetch } from './api_client.js';
import { triggerSlackOrEmailNotification } from './alert_notifier.js';

export async function auditPackagesInTransit() {
    console.log('[TRANSIT DAEMON] Running daily audit for packages stuck in transit...');
    try {
        const db = await getDb();
        // Select shipped orders that have tracking numbers but are not marked as DELIVERED locally
        const rows = await db.all(`
            SELECT ebay_order_id, b2b_request_id, order_timestamp 
            FROM sales_orders 
            WHERE fulfillment_status = 'SHIPPED' AND (order_notes IS NULL OR order_notes NOT LIKE '%DELIVERED%')
        `);

        if (!rows || rows.length === 0) {
            console.log('[TRANSIT DAEMON] No pending in-transit orders found.');
            return;
        }

        console.log(`[TRANSIT DAEMON] Auditing ${rows.length} shipped orders...`);

        for (const order of rows) {
            try {
                const response = await resilientFetch(`https://api.zinc.io/v1/orders/${order.b2b_request_id}`, {
                    headers: { 'Authorization': `Basic ${Buffer.from((process.env.ZINC_CLIENT_TOKEN || '') + ':').toString('base64')}` }
                });
                
                if (!response.ok) continue;
                
                const data = await response.json();

                if (data.status === 'completed' && data.delivery_status) {
                    const statusText = data.delivery_status.status?.toUpperCase() || 'UNKNOWN'; // 'DELIVERED', 'IN_TRANSIT', 'EXCEPTION'
                    
                    if (statusText === 'DELIVERED') {
                        await db.run(`UPDATE sales_orders SET order_notes = 'DELIVERED successfully' WHERE ebay_order_id = ?`, [order.ebay_order_id]);
                        console.log(`[TRANSIT DAEMON] Order ${order.ebay_order_id} marked as DELIVERED.`);
                    } else {
                        const orderAgeDays = (Date.now() - new Date(order.order_timestamp).getTime()) / (1000 * 60 * 60 * 24);
                        
                        // FLAG STUCK IN TRANSIT: If order is older than 7 days and still not delivered
                        if (orderAgeDays > 7) {
                            await db.run(`UPDATE sales_orders SET fulfillment_status = 'ERROR_MANUAL_REVIEW', order_notes = 'STUCK IN TRANSIT: Exceeded 7 days' WHERE ebay_order_id = ?`, [order.ebay_order_id]);
                            await triggerSlackOrEmailNotification(`⚠️ Order ${order.ebay_order_id} is stuck in transit for ${Math.floor(orderAgeDays)} days. Action required to prevent INR case.`);
                            console.warn(`[TRANSIT DAEMON] Flagged order ${order.ebay_order_id} for being stuck in transit.`);
                        }
                    }
                }
            } catch (error: any) {
                console.error(`Transit tracking daemon error on order ${order.ebay_order_id}:`, error.message);
            }
        }
        
        console.log('[TRANSIT DAEMON] Audit complete.');
    } catch (dbErr: any) {
        console.error('[TRANSIT DAEMON] Database query failed:', dbErr.message);
    }
}

let transitInterval: NodeJS.Timeout | null = null;

export function startTransitDaemon(intervalMinutes = 1440) {
  if (transitInterval) {
    console.log('[TRANSIT DAEMON] Daemon is already running.');
    return;
  }
  
  console.log(`[TRANSIT DAEMON] Starting background transit auditing daemon. Interval: ${intervalMinutes} minutes.`);
  auditPackagesInTransit(); // run immediately on startup
  
  transitInterval = setInterval(auditPackagesInTransit, intervalMinutes * 60 * 1000);
}
