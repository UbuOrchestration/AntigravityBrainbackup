import { updateListingImage } from './src/ebayApi.js';
import { loadConfig } from './src/config.js';

async function fixImage() {
    const config = loadConfig();
    const itemId = '800275551044';
    const targetUrl = 'https://images.thdstatic.com/productImages/5fec019c-2d0f-47a0-a35f-44a9b3b575b6/svn/camco-rv-parts-22783-64_1000.jpg';

    console.log(`Pushing new image to live eBay listing ${itemId}...`);
    try {
        await updateListingImage(itemId, targetUrl, config);
        console.log("Success! The image on the live eBay storefront is now updated.");
    } catch (e: any) {
        console.error("Failed:", e.message);
    }
}
fixImage();
