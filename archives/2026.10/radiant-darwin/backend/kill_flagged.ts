import { getDb } from './src/db.js';
import { loadConfig } from './src/config.js';

async function killFlaggedItems() {
    console.log("Starting removal of user-flagged QC items...");
    const config = loadConfig();
    const token = config.accessToken;
    const db = await getDb();

    // The 8 SKUs flagged by the user in the artifact comments
    const flaggedSkus = [
        "B000EDUTNS",         // Bad image
        "ARB-AMAZON-RV-023",  // Bad image
        "ARB-AMAZON-RV-029",  // Dometic 30A Flush Mount RV Power Inlet
        "ARB-AMAZON-RV-031",  // Valterra Clip-On Towing Mirror
        "ARB-AMAZON-RV-036",  // BougeRV RV Awning De-Flapper Clamps
        "ARB-AMAZON-RV-067",  // Bad image
        "ARB-AMAZON-RV-089",  // Dometic RV Stove Stove Top Grate
        "ARB-AMAZON-RV-098"   // Stromberg Carlson Replacement Toilet Seal Flange
    ];

    for (const sku of flaggedSkus) {
        const item = await db.get('SELECT * FROM inventory WHERE sku = ?', [sku]);
        if (!item) {
            console.log(`SKU ${sku} not found in DB.`);
            continue;
        }

        console.log(`Processing flagged SKU: ${sku} (${item.title})`);

        if (item.ebay_item_id) {
            console.log(`Killing eBay Item ID: ${item.ebay_item_id}`);
            const xmlPayload = `<?xml version="1.0" encoding="utf-8"?>
            <ReviseInventoryStatusRequest xmlns="urn:ebay:apis:eBLBaseComponents">
                <InventoryStatus>
                    <ItemID>${item.ebay_item_id}</ItemID>
                    <Quantity>0</Quantity>
                </InventoryStatus>
            </ReviseInventoryStatusRequest>`;

            try {
                const response = await fetch('https://api.ebay.com/ws/api.dll', {
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

                const text = await response.text();
                if (text.includes('<Ack>Success</Ack>') || text.includes('<Ack>Warning</Ack>')) {
                    console.log(`Successfully ended listing ${item.ebay_item_id} (Quantity -> 0)`);
                } else {
                    console.error(`Failed to end ${item.ebay_item_id}. Response: ${text}`);
                }
            } catch (e: any) {
                console.error(`Error killing ${item.ebay_item_id}:`, e.message);
            }
        }

        console.log(`Deleting ${sku} from local database...`);
        await db.run('DELETE FROM inventory WHERE sku = ?', [sku]);
    }
    console.log("Removal complete.");
}

killFlaggedItems().catch(console.error);
