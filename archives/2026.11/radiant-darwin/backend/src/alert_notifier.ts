import { getDb } from './db.js';
import { resilientFetch } from './api_client.js';

export async function triggerSlackOrEmailNotification(message: string): Promise<boolean> {
    try {
        const db = await getDb();
        const config = await db.get(`SELECT last_alert_sent, webhook_alert_url FROM fulfillment_config WHERE id = 1`);
        
        if (!config || !config.webhook_alert_url) {
            console.error(`[ALERT DROPPED] Notification engine unconfigured or DB locked: ${message}`);
            return false;
        }

        const now = Date.now();
        const lastSent = config.last_alert_sent ? new Date(config.last_alert_sent).getTime() : 0;
        const cooldownPeriod = 15 * 60 * 1000; // Enforce a strict 15-minute alert throttling window

        if (now - lastSent < cooldownPeriod) {
            console.warn(`[ALERT THROTTLED] Message muted to prevent log flooding: ${message}`);
            return false;
        }

        // Post structured payload to communication endpoint (Slack Webhook, Discord, or generic automation gateway)
        const response = await resilientFetch(config.webhook_alert_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: `⚠️ *[EBAY ARBITRAGE SYSTEM ALERT]*\n\n${message}\n\nTimestamp: ${new Date().toISOString()}`
            })
        });

        if (response.ok) {
            await db.run(`UPDATE fulfillment_config SET last_alert_sent = CURRENT_TIMESTAMP WHERE id = 1`);
            console.log("[ALERT DISPATCHED] High-priority message pushed to admin monitoring channel.");
            return true;
        } else {
            console.error(`[ALERT DISPATCH FAILED] Status: ${response.status}`);
            return false;
        }
    } catch (fail: any) {
        console.error("Failed to transmit external alert notification packet:", fail.message);
        return false;
    }
}
