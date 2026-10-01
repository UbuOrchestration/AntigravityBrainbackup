import { getDb } from './db.js';
import { loadConfig, EbayConfig } from './config.js';
import fetch from 'node-fetch'; // assuming node-fetch is available, or use global fetch if Node 18+

export async function fetchUnfulfilledOrders(config: EbayConfig) {
  if (!config.accessToken) {
    throw new Error('eBay access token is missing.');
  }

  // Use the Fulfillment API to fetch orders.
  // Docs: GET https://api.ebay.com/sell/fulfillment/v1/order
  // Filter: orderfulfillmentstatus:{NOT_STARTED},creationdate:[...]
  
  const endpoint = 'https://api.ebay.com/sell/fulfillment/v1/order?filter=orderfulfillmentstatus:{NOT_STARTED},orderfulfillmentstatus:{IN_PROGRESS}';
  
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`eBay Fulfillment API Error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.orders || [];
}

export async function runOrderSync() {
  console.log('[ORDER SYNC] Polling eBay for new unfulfilled orders...');
  const config = loadConfig();
  
  try {
    const orders = await fetchUnfulfilledOrders(config);
    const db = await getDb();
    
    let ingestedCount = 0;

    for (const order of orders) {
      const orderId = order.orderId;
      
      // Based on specs, we process the first line item for the primary SKU mapping
      const primaryLineItem = order.lineItems?.[0];
      if (!primaryLineItem || !primaryLineItem.sku) {
        console.warn(`[ORDER SYNC] Skipping order ${orderId}: Missing primary line item SKU`);
        continue;
      }

      const sku = primaryLineItem.sku;
      const buyerUsername = order.buyer?.username || 'UNKNOWN';
      const shipTo = order.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo;
      
      const buyerName = shipTo?.fullName || 'UNKNOWN';
      const shippingAddress = shipTo && shipTo.contactAddress ? 
        `${buyerName}, ${shipTo.contactAddress.addressLine1 || ''}, ${shipTo.contactAddress.city || ''}, ${shipTo.contactAddress.stateOrProvince || ''}, ${shipTo.contactAddress.postalCode || ''}` : 
        'UNKNOWN';

      const qty = parseInt(primaryLineItem.quantity, 10) || 1;
      const price = parseFloat(order.paymentSummary?.totalDueToSeller?.value || '0');

      const result = await db.run(`
        INSERT OR IGNORE INTO sales_orders (
          ebay_order_id, sku, buyer_username, buyer_name, shipping_address, 
          quantity_purchased, price_paid_by_buyer, fulfillment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'UNFULFILLED')
      `, [
        orderId, sku, buyerUsername, buyerName, shippingAddress, 
        qty, price
      ]);

      if (result.changes && result.changes > 0) {
        console.log(`[ORDER SYNC] Ingested new order: ${orderId} for SKU: ${sku}`);
        ingestedCount++;
      }
    }
    
    if (ingestedCount > 0) {
      console.log(`[ORDER SYNC] Successfully synced ${ingestedCount} new unfulfilled orders.`);
    } else {
      console.log(`[ORDER SYNC] No new orders found.`);
    }

  } catch (error: any) {
    console.error('[ORDER SYNC] Failed to sync orders:', error.message);
  }
}

let syncInterval: NodeJS.Timeout | null = null;

export function startOrderSync(intervalMinutes = 30) {
  if (syncInterval) {
    console.log('[ORDER SYNC] Poller is already running.');
    return;
  }
  
  console.log(`[ORDER SYNC] Starting background order poller. Interval: ${intervalMinutes} minutes.`);
  runOrderSync(); // run immediately on startup
  
  syncInterval = setInterval(runOrderSync, intervalMinutes * 60 * 1000);
}
