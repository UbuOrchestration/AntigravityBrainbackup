import axios from 'axios';

async function fetchFromUpc() {
    try {
        const title = encodeURIComponent("Camco TastePURE 25ft Premium Drinking Water Hose for RVs");
        const url = `https://api.upcitemdb.com/prod/trial/search?s=${title}&match_mode=0&type=product`;
        
        const response = await axios.get(url);
        if (response.data.items && response.data.items.length > 0) {
            console.log("Found matches:", response.data.items.length);
            for (const item of response.data.items) {
                if (item.images && item.images.length > 0) {
                    console.log("UPC:", item.upc, "Images:", item.images);
                }
            }
        } else {
            console.log("No items found.");
        }
    } catch (e: any) {
        console.error("Failed:", e.message);
    }
}
fetchFromUpc();
