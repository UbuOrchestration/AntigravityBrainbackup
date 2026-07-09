import axios from 'axios';

async function fetchRealUPCs() {
    try {
        const response = await axios.get('https://api.upcitemdb.com/prod/trial/search?s=Valterra+RV');
        const items = response.data.items;
        
        const products = items.slice(0, 10).map((item: any) => ({
            id: item.upc,
            brand: item.brand || 'Camco',
            upc_mpn: item.upc,
            source_platform: "AMAZON",
            source_url: `https://www.amazon.com/dp/MOCK${item.upc.substring(0,6)}`,
            title: item.title,
            price: item.lowest_recorded_price || 20.00
        }));
        
        console.log(JSON.stringify(products, null, 2));
    } catch (e) {
        console.error(e.message);
    }
}

fetchRealUPCs();
