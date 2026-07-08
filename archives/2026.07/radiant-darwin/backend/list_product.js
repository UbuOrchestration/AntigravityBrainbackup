const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { parseStringPromise } = require('xml2js');

const configPath = path.join(__dirname, 'config', 'ebay_credentials.json');
const mapsPath = path.join(__dirname, 'config', 'listings_metadata.json');

// List of some catalog items mapped by ID
const rvCatalog = {
  'RV-001': { name: 'Camco TastePURE RV Water Filter (2-pack)', url: 'https://www.amazon.com/dp/B0006IX870', cost: 18.50, price: 38.16, sku: 'B0006IX870', shippingCost: 4.50, imageUrl: 'https://images-na.ssl-images-amazon.com/images/I/71z-N7c7PGL.jpg' },
  'RV-002': { name: 'Valterra Revolution 20ft Sewer Hose Kit', url: 'https://www.amazon.com/dp/B003BZD074', cost: 35.00, price: 61.20, sku: 'B003BZD074', shippingCost: 7.99, imageUrl: 'https://images-na.ssl-images-amazon.com/images/I/81xU-SHT11L.jpg' },
  'RV-003': { name: 'Lippert Water Pressure Regulator Brass Lead-Free', url: 'https://www.amazon.com/dp/B003YJJ27C', cost: 9.99, price: 27.20, sku: 'B003YJJ27C', shippingCost: 3.50, imageUrl: 'https://images-na.ssl-images-amazon.com/images/I/61sJ-13u-vL.jpg' },
  'RV-011': { name: 'Camco Heavy Duty RV Leveling Blocks (10-pack)', url: 'https://www.amazon.com/dp/B004809YOC', cost: 50.00, price: 83.00, sku: 'B004809YOC', shippingCost: 6.90, imageUrl: 'https://images-na.ssl-images-amazon.com/images/I/71uK5s9A9HL.jpg' },
  'RV-021': { name: 'Progressive Industries 30-Amp Smart Surge Protector', url: 'https://www.amazon.com/dp/B015Y9A1Z8', cost: 58.00, price: 95.45, sku: 'B015Y9A1Z8', shippingCost: 6.50, imageUrl: 'https://images-na.ssl-images-amazon.com/images/I/71k-2z7rFRL.jpg' }
};

const targetId = process.argv[2];

if (!targetId) {
  console.log('Usage: node list_product.js <RV-ID | Amazon-URL>');
  process.exit(1);
}

/**
 * Attempts to scrape live data (title, description, bullets, image) from Amazon
 */
async function scrapeAmazonDetails(url) {
  console.log(`Scraping live product details from: ${url}...`);
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    };

    const response = await axios.get(url, { headers, timeout: 6000 });
    const html = response.data;

    let title = '';
    let imageUrls = [];
    let description = '';

    // 1. Scrape Title
    const titleMatch = html.match(/<span id="productTitle"[^>]*>\s*([^<]+)\s*<\/span>/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }

    // 2. Scrape main high-res images (up to 4)
    const imageRegex = /"large"\s*:\s*"(https:\/\/images-na\.ssl-images-amazon\.com\/images\/I\/[^"]+\.jpg)"/gi;
    let imgMatch;
    while ((imgMatch = imageRegex.exec(html)) !== null && imageUrls.length < 4) {
      if (!imageUrls.includes(imgMatch[1])) {
        imageUrls.push(imgMatch[1]);
      }
    }
    // Fallback if no images found by array regex
    if (imageUrls.length === 0) {
      const fallbackMatch = html.match(/"hiRes"\s*:\s*"(https:\/\/images-na\.ssl-images-amazon\.com\/images\/I\/[^"]+\.jpg)"/i) ||
                         html.match(/data-old-hires="([^"]+)"/i) ||
                         html.match(/id="landingImage"[^>]*src="([^"]+)"/i);
      if (fallbackMatch) imageUrls.push(fallbackMatch[1]);
    }

    // 3. Scrape Bullet points for description
    const bullets = [];
    const listRegex = /<span class="a-list-item">([^<]+)<\/span>/gi;
    let match;
    let limit = 0;
    while ((match = listRegex.exec(html)) !== null && limit < 6) {
      const cleanBullet = match[1].trim();
      // Skip generic navigation/promotional text
      if (cleanBullet.length > 15 && !cleanBullet.includes('click here') && !cleanBullet.includes('options')) {
        bullets.push(cleanBullet);
        limit++;
      }
    }

    if (bullets.length > 0) {
      description = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: auto; color: #333;">
          <h1 style="color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 8px;">Product Features & Details</h1>
          <ul style="line-height: 1.8; font-size: 1.05em; padding-left: 20px;">
            ${bullets.map(b => `<li style="margin-bottom: 10px;">${b}</li>`).join('')}
          </ul>
          <p style="font-size: 0.9em; color: #666; margin-top: 20px; border-top: 1px dashed #ccc; paddingTop: 10px;">
            * Brand New Stock | Handled with care | Ready to Ship
          </p>
        </div>
      `;
    }

    if (title || imageUrls.length > 0) {
      console.log('Successfully scraped live data from Amazon!');
      return { title, imageUrls, description };
    }
  } catch (err) {
    console.warn(`Could not scrape live details (CAPTCHA/block): ${err.message}. Using fallback catalog details.`);
  }
  return null;
}

async function main() {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (!config.refreshToken) {
      throw new Error('eBay is not connected. Connect in Settings first.');
    }

    let token = config.accessToken;
    const isExpired = !token || !config.tokenExpiresAt || (Date.now() + 300000 > config.tokenExpiresAt);
    if (isExpired) {
      console.log('Refreshing token...');
      const tokenUrl = 'https://api.ebay.com/identity/v1/oauth2/token';
      const authHeader = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: config.refreshToken,
        scope: 'https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.marketing'
      });
      const response = await axios.post(tokenUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authHeader}`
        }
      });
      token = response.data.access_token;
      config.accessToken = token;
      config.tokenExpiresAt = Date.now() + (response.data.expires_in * 1000);
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }

    // Determine details
    let title = 'Camco RV Utility Item';
    let cost = 19.99;
    let price = 29.99;
    let sku = 'RV-SKU';
    let url = 'https://www.amazon.com';
    let imageUrls = ['https://images.unsplash.com/photo-1527689368864-3a821dbccc34']; // Default clean image URL
    let description = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: auto; color: #333;">
        <h1 style="color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 8px;">RV Utility Part</h1>
        <p style="font-size: 1.1em; line-height: 1.6;">High-quality, heavy-duty RV and trailer parts designed for reliability and durability on the road.</p>
        <ul style="line-height: 1.8;">
          <li>Genuine, brand new retail stock</li>
          <li>Fast and secure domestic shipping</li>
          <li>Professional customer support</li>
        </ul>
      </div>
    `;

    if (rvCatalog[targetId]) {
      const match = rvCatalog[targetId];
      title = match.name;
      cost = match.cost;
      price = match.price; // This will be overwritten by dynamically calculated pEbay
      sku = match.sku;
      url = match.url;
      imageUrls = match.imageUrl ? [match.imageUrl] : imageUrls;
    } else if (targetId.startsWith('http')) {
      url = targetId;
      title = 'RV Custom Arbitrage Item';
      sku = 'CUSTOM-SKU';
    } else {
      console.log(`Unknown ID: ${targetId}. Listing with default parameters...`);
    }

    // Dynamic Price Calculation & Competitive Filter (Tiered Margin Matrix)
    const { getCompletedSales } = require('./dist/ebayApi.js');
    const { calculateTargetPrice } = require('./dist/tracker.js');
    const { getDb } = require('./dist/db.js');

    const pSold = await getCompletedSales(title, cost);
    // targetRoi and minProfit are bypassed by the internal Tiered Matrix logic now
    const pEbay = calculateTargetPrice(cost, 40, 15, 0, 0, 13.25, 0.30, pSold);

    if (pSold !== null && pEbay > pSold * 1.10) {
      console.log(`\n❌ ABORT: Item Uncompetitive.`);
      console.log(`Required eBay Price ($${pEbay.toFixed(2)}) exceeds 10% tolerance over Average Sold Price ($${pSold.toFixed(2)}).`);
      console.log(`Dropping item immediately to save tokens.`);
      process.exit(1);
    }
    
    price = pEbay; // Set the actual listing price to the calculated target price

    // Attempt to scrape live details
    const scraped = await scrapeAmazonDetails(url);
    if (scraped) {
      if (scraped.title) title = scraped.title;
      if (scraped.imageUrls && scraped.imageUrls.length > 0) imageUrls = scraped.imageUrls;
      if (scraped.description) description = scraped.description;
    }

    // Append SKU/ASIN to title for easier search/finding by clients
    let finalTitle = title;
    if (sku && sku !== 'RV-SKU' && sku !== 'CUSTOM-SKU') {
      finalTitle = `${title} Part #${sku}`;
    }
    const ebayTitle = finalTitle.substring(0, 80);

    console.log(`Creating live eBay listing for: "${ebayTitle}"...`);

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<AddItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <Item>
    <Title>${ebayTitle}</Title>
    <Description><![CDATA[${description}]]></Description>
    <PrimaryCategory>
      <CategoryID>310</CategoryID> <!-- RV/Sporting Goods category -->
    </PrimaryCategory>
    <StartPrice>${price.toFixed(2)}</StartPrice>
    <ConditionID>1000</ConditionID> <!-- Brand New -->
    <Country>US</Country>
    <Currency>USD</Currency>
    <DispatchTimeMax>1</DispatchTimeMax>
    <ListingDuration>Days_30</ListingDuration>
    <ListingType>FixedPriceItem</ListingType>
    <PaymentMethods>PayPal</PaymentMethods>
    <PayPalEmailAddress>info@arbitragestore.com</PayPalEmailAddress>
    <PictureDetails>
      ${imageUrls.slice(0, 4).map(url => `<PictureURL>${url}</PictureURL>`).join('\n      ')}
    </PictureDetails>
    <PostalCode>90210</PostalCode>
    <Quantity>2</Quantity>
    <ReturnPolicy>
      <ReturnsAcceptedOption>ReturnsAccepted</ReturnsAcceptedOption>
      <RefundOption>MoneyBack</RefundOption>
      <ReturnsWithinOption>Days_30</ReturnsWithinOption>
      <ShippingCostPaidByOption>Buyer</ShippingCostPaidByOption>
    </ReturnPolicy>
    <ShippingDetails>
      <ShippingType>Flat</ShippingType>
      <ShippingServiceOptions>
        <ShippingServicePriority>1</ShippingServicePriority>
        <ShippingService>USPSPriority</ShippingService>
        <ShippingServiceCost>5.99</ShippingServiceCost>
      </ShippingServiceOptions>
    </ShippingDetails>
  </Item>
</AddItemRequest>`;

    const apiResponse = await axios.post('https://api.ebay.com/ws/api.dll', xml, {
      headers: {
        'Content-Type': 'text/xml',
        'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
        'X-EBAY-API-SITEID': '0',
        'X-EBAY-API-CALL-NAME': 'AddItem',
        'X-EBAY-API-IAF-TOKEN': `Bearer ${token}`
      }
    });

    const result = await parseStringPromise(apiResponse.data, { explicitArray: false });
    const addResponse = result.AddItemResponse;

    if (addResponse.Ack !== 'Success' && addResponse.Ack !== 'Warning') {
      console.error('eBay Listing Failed:', JSON.stringify(addResponse.Errors));
      return;
    }

    const newItemId = addResponse.ItemID;
    console.log(`\nSUCCESS: Listing created on eBay!`);
    console.log(`Item ID: ${newItemId}`);
    console.log(`URL: https://www.ebay.com/itm/${newItemId}`);

    // Map this item in inventory database for the auto-repricer loop
    const db = await getDb();
    const sourcePlatform = url.includes('walmart') ? 'walmart' : 'amazon';
    const costTier = cost <= 20 ? 'LOW' : (cost > 75 ? 'HIGH' : 'MID');

    await db.run(`
      INSERT INTO inventory (
        sku, ebay_item_id, upc_mpn, source_platform, source_url, title, 
        cost_tier, p_source, p_sold, p_ebay, last_margin, quantity, delivery_days, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(sku) DO UPDATE SET
        ebay_item_id = excluded.ebay_item_id,
        p_ebay = excluded.p_ebay,
        status = excluded.status
    `, [
      sku, newItemId, 'DOES NOT APPLY', sourcePlatform, url, title, 
      costTier, cost, pSold || 0, pEbay, 0, 1, 3, 'ACTIVE'
    ]);

    console.log('Listing mapped in SQL Database. Auto-Reprice will scan this item on schedule.');

  } catch (error) {
    console.error('Error during listing creation:', error.response ? error.response.data : error.message);
  }
}

main();
