import { launchSystemBrowser, openEbayListing } from '../src/browser_launcher.js';
import { getDb } from '../src/db.js';

async function launchLiveListings() {
    console.log("Launching live store & key listings in browser...");
    
    // 1. Launch eBay Seller Hub Active Listings Overview
    const hubResult = await launchSystemBrowser('https://www.ebay.com/sh/lst/active');
    console.log(`Launched eBay Seller Hub: ${hubResult.success} (${hubResult.url})`);

    // 2. Launch our key live listings on eBay for side-by-side review
    const keyItems = [
        { id: '800315497988', name: 'Valterra Surgeminder 30Amp Smart RV Surge Protector' },
        { id: '800315497928', name: 'Camco Curved Leveler and Chock Kit (Single)' },
        { id: '800309787314', name: 'Camco RhinoFLEX 15ft RV Sewer Hose Kit' }
    ];

    for (const item of keyItems) {
        const res = await openEbayListing(item.id);
        console.log(`Launched Listing [${item.id}] ${item.name}: ${res.success}`);
        // Brief pause so the OS browser handles multiple tabs cleanly
        await new Promise(r => setTimeout(r, 800));
    }
}

launchLiveListings().catch(console.error);
