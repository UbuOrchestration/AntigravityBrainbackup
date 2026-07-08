const axios = require('axios');

async function test() {
    try {
        const query = 'Camco RV Sidewinder Plastic Sewer Hose Support, 20ft';
        console.log(`Querying API for: ${query}`);
        const res = await axios.get(`https://api.upcitemdb.com/prod/trial/search?s=${encodeURIComponent(query)}`);
        console.log(JSON.stringify(res.data.items[0], null, 2));
    } catch (e) {
        console.error(e.message);
    }
}
test();
