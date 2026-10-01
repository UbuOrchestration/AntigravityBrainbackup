const fetch = require('node-fetch'); // or use native fetch in newer node

async function testAmazonImage(asin) {
    const url = `https://ws-na.amazon-adsystem.com/widgets/q?_encoding=UTF8&ASIN=${asin}&Format=_SL500_&ID=AsinImage&MarketPlace=US&ServiceVersion=20070822&WS=1`;
    const res = await fetch(url, { method: 'HEAD' });
    console.log(`Adsystem: ${res.status}`);

    const url2 = `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SCRM_.jpg`;
    const res2 = await fetch(url2, { method: 'HEAD' });
    console.log(`Images-NA: ${res2.status}`);
}

testAmazonImage('B0006IX870');
