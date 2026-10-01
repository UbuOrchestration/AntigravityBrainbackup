const fetch = require('node-fetch');
async function test() {
    try {
        const r = await fetch('https://images-na.ssl-images-amazon.com/images/P/B0006IX870.01._SCRM_.jpg', {method: 'HEAD'});
        console.log("Images-NA: " + r.status);
    } catch (e) {
        console.error(e.message);
    }
}
test();
