import { loadConfig } from './src/config.js';

async function killOrphanedEbayListings() {
    const config = loadConfig();
    const token = config.accessToken;

    const badItemIds = [
        "800309766298", // Camco Heavy Duty RV Leveling Blocks (10-pack)
        "800309767073"  // Camco RV Leveling Blocks, Heavy Duty (10 Pack)
    ];

    for (const itemId of badItemIds) {
        console.log(`Killing eBay Item ID: ${itemId}`);
        const xmlPayload = `<?xml version="1.0" encoding="utf-8"?>
        <ReviseInventoryStatusRequest xmlns="urn:ebay:apis:eBLBaseComponents">
            <InventoryStatus>
                <ItemID>${itemId}</ItemID>
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
                console.log(`Successfully ended listing ${itemId} (Set quantity to 0)`);
            } else {
                console.error(`Failed to end ${itemId}. Response: ${text}`);
            }
        } catch (e: any) {
            console.error(`Error killing ${itemId}:`, e.message);
        }
    }
}

killOrphanedEbayListings();
