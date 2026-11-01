import { verifyLiveStorefrontPricing } from './src/storefront_reconciler.js';

async function test() {
    await verifyLiveStorefrontPricing();
}

test();
