import { getDb } from './db.js';
import { resilientFetch } from './api_client.js';

function parseAddressToZincFormat(addressStr: string) {
  // Helper function splits standard string block back to API structured key-value configurations
  const parts = addressStr.split(', ');
  return {
      first_name: parts[0]?.split(' ')[0] || '',
      last_name: parts[0]?.split(' ').slice(1).join(' ') || '',
      address_line1: parts[1] || '',
      city: parts[2] || '',
      state: parts[3] || '',
      zip_code: parts[4] || '',
      country: 'US'
  };
}

async function flagOrderForReview(orderId: string, reason: string) {
  const db = await getDb();
  await db.run(`
      UPDATE sales_orders 
      SET fulfillment_status = 'ERROR_MANUAL_REVIEW', order_notes = ? 
      WHERE ebay_order_id = ?
  `, [reason, orderId]);
  console.warn(`[MANUAL REVIEW REQUIRED] Order ${orderId} failed automation: ${reason}`);
}

async function fetchLiveSupplierCost(sku: string): Promise<number> {
  const db = await getDb();
  const item = await db.get(`SELECT source_price FROM inventory WHERE sku = ?`, [sku]);
  
  if (!item) throw new Error("Item not found in inventory");

  // In production, this would call a scraper or API proxy like Keepa/Zinc to get the live price.
  // For safety, we mock a slight potential price fluctuation (up to +5%) to test the failsafe.
  const baseCost = item.source_price;
  const simulatedVolatility = 1.0 + (Math.random() * 0.05); 
  return parseFloat((baseCost * simulatedVolatility).toFixed(2));
}

async function verifyLiveMarginBeforeCheckout(sku: string, buyerPaidPrice: number): Promise<{ safe: boolean, actualCost?: number, reason?: string }> {
  try {
      const liveSupplierCost = await fetchLiveSupplierCost(sku);
      
      // Calculate approximated transactional costs
      const baseFees = (buyerPaidPrice * 0.1325) + 0.30;
      const projectedNetProfit = buyerPaidPrice - baseFees - liveSupplierCost;

      // CRITICAL SLIPPAGE GUARD: Abort if net profit pool drops below $0.50 absolute margin floor
      if (projectedNetProfit < 0.50) {
          console.warn(`[MARGIN SLIPPAGE BLOCK] SKU: ${sku} failed safety floor. Projected Profit: $${projectedNetProfit.toFixed(2)}`);
          return { safe: false, reason: `Negative or sub-floor margin detected: $${projectedNetProfit.toFixed(2)}` };
      } else {
          return { safe: true, actualCost: liveSupplierCost };
      }
  } catch (err: any) {
      console.error("Failsafe database validation lock drop:", err);
      return { safe: false, reason: err.message };
  }
}

export async function runAutoCheckout() {
  console.log('[AUTO CHECKOUT] Scanning for unfulfilled orders...');
  
  try {
    const db = await getDb();
    
    const pendingOrders = await db.all(`
        SELECT s.ebay_order_id, s.sku, s.shipping_address, s.quantity_purchased, s.price_paid_by_buyer, i.upc_mpn, i.source_platform 
        FROM sales_orders s
        JOIN inventory i ON s.sku = i.sku
        WHERE s.fulfillment_status = 'UNFULFILLED'
    `);

    if (pendingOrders.length === 0) {
      console.log('[AUTO CHECKOUT] No unfulfilled orders found. Sleeping.');
      return;
    }

    console.log(`[AUTO CHECKOUT] Found ${pendingOrders.length} orders ready for supplier transmission.`);

    for (const order of pendingOrders) {
      try {
        // Execute dynamic margin failsafe
        const marginCheck = await verifyLiveMarginBeforeCheckout(order.sku, order.price_paid_by_buyer);
        if (!marginCheck.safe) {
            await flagOrderForReview(order.ebay_order_id, `Margin Failsafe: ${marginCheck.reason}`);
            continue; // Skip execution for this order
        }

        const response = await resilientFetch('https://api.zinc.io/v1/orders', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from((process.env.ZINC_CLIENT_TOKEN || '') + ':').toString('base64')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                retailer: order.source_platform,
                products: [{ product_id: order.upc_mpn, qty: order.quantity_purchased }],
                max_price: Math.floor(order.price_paid_by_buyer * 100), // Max price safety cap in cents
                shipping_address: parseAddressToZincFormat(order.shipping_address),
                is_gift: true,
                // MARGIN PROTECTION & LOGISTICS TUNING
                shipping_method: "cheapest", // Force the B2B fulfillment handler to look for free shipping opportunities natively
                max_shipping_charge_cents: 0, // Explicitly reject orders if supplier switches shipping classes and incurs cost
                allow_partial_fulfillment: false // Handle retail purchase limits by forcing an atomic 'All-or-Nothing' condition
            })
        });

        const result: any = await response.json();

        if (result.request_id) {
            await db.run(`
                UPDATE sales_orders 
                SET fulfillment_status = 'ORDERED', b2b_request_id = ? 
                WHERE ebay_order_id = ?
            `, [result.request_id, order.ebay_order_id]);
            console.log(`Order ${order.ebay_order_id} pushed to B2B queue. Request ID: ${result.request_id}`);
        } else {
            await flagOrderForReview(order.ebay_order_id, "B2B API Submission Failed");
        }
      } catch (fail: any) {
          await flagOrderForReview(order.ebay_order_id, fail.message);
      }
    }

  } catch (error: any) {
    console.error('[AUTO CHECKOUT] Fatal Error:', error.message);
  }
}

let checkoutInterval: NodeJS.Timeout | null = null;

export function startAutoCheckout(intervalMinutes = 15) {
  if (checkoutInterval) {
    console.log('[AUTO CHECKOUT] Checkout daemon is already running.');
    return;
  }
  
  console.log(`[AUTO CHECKOUT] Starting background checkout daemon. Interval: ${intervalMinutes} minutes.`);
  runAutoCheckout(); // run immediately on startup
  
  checkoutInterval = setInterval(runAutoCheckout, intervalMinutes * 60 * 1000);
}
