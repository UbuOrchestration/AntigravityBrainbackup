const axios = require('axios');
const fs = require('fs');

async function checkUrl(url) {
  try {
    const res = await axios.head(url, { timeout: 3000 });
    return res.status === 200;
  } catch (e) {
    return false;
  }
}

async function find10Products() {
  const products = [];
  // Scan Camco part numbers
  let partNo = 44500;
  
  while (products.length < 10 && partNo < 44800) {
    const base = `https://cdnimages.opentip.com/full/LNS/LNS-17-${partNo}`;
    const urls = [
      `${base}.jpg`,
      `${base}_1.jpg`,
      `${base}_2.jpg`,
      `${base}_3.jpg`
    ];
    
    // Check if the primary image exists
    const primaryExists = await checkUrl(urls[0]);
    if (primaryExists) {
      console.log(`Found primary for ${partNo}`);
      const validUrls = [urls[0]];
      
      // Check secondary images
      for (let i = 1; i < urls.length; i++) {
        if (await checkUrl(urls[i])) {
          validUrls.push(urls[i]);
        }
      }
      
      if (validUrls.length >= 3) {
        console.log(`SUCCESS: Found ${validUrls.length} images for Camco ${partNo}`);
        products.push({
          partNo,
          images: validUrls
        });
      }
    }
    partNo++;
  }
  
  fs.writeFileSync('valid_images.json', JSON.stringify(products, null, 2));
  console.log('Finished finding 10 products with 3+ images.');
}

find10Products();
