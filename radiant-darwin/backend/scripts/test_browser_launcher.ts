import { openEbayListing, openSupplierProduct, verifyBrowserCapabilities } from '../src/browser_launcher.js';

async function testLauncher() {
    console.log("Running browser launcher verification...");
    const report = await verifyBrowserCapabilities(true);
    console.log("Verification Report:", JSON.stringify(report, null, 2));
}

testLauncher().catch(console.error);
