const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { parseStringPromise } = require('xml2js');
const { getCompletedSales } = require('./dist/ebayApi.js');
const { calculateTargetPrice } = require('./dist/tracker.js');

const configPath = path.join(__dirname, 'config', 'ebay_credentials.json');
const catalogPath = path.join(__dirname, 'verified_catalog.json');
const mapPath = path.join(__dirname, 'config', 'listings_metadata.json');

// eBay AddItem Request builder
function buildAddItemXml(product, config, startPrice) {
  return `<?xml version="1.0" encoding="utf-8"?>
<AddItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <Item>
    <Title><![CDATA[${product.title.substring(0, 80)}]]></Title>
    <Description><![CDATA[${product.description}]]></Description>
    <PrimaryCategory>
      <CategoryID>310</CategoryID> <!-- RV Parts & Accessories -->
    </PrimaryCategory>
    <StartPrice>${startPrice}</StartPrice>
    <ConditionID>1000</ConditionID>
    <Country>US</Country>
    <Currency>USD</Currency>
    <DispatchTimeMax>1</DispatchTimeMax>
    <ListingDuration>GTC</ListingDuration>
    <ListingType>FixedPriceItem</ListingType>
    <PaymentMethods>PayPal</PaymentMethods>
    <PayPalEmailAddress>info@arbitragestore.com</PayPalEmailAddress>
    <PictureDetails>
      ${product.imageUrls.map(u => `<PictureURL>${u}</PictureURL>`).join('\n      ')}
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
      <ShippingServiceOptions>
        <ShippingServicePriority>1</ShippingServicePriority>
        <ShippingService>USPSPriority</ShippingService>
        <FreeShipping>true</FreeShipping>
      </ShippingServiceOptions>
    </ShippingDetails>
    <Site>US</Site>
  </Item>
</AddItemRequest>`;
}

async function main() {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const token = config.accessToken;
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    const maps = fs.existsSync(mapPath) ? JSON.parse(fs.readFileSync(mapPath, 'utf8')) : {};

    let successCount = 0;

    for (const product of catalog) {
      console.log(`\nScreening: ${product.title}`);
      
      const sourcePrice = product.sourcePrice || 15.00;
      const pSold = await getCompletedSales(product.title, sourcePrice);
      
      const pEbay = calculateTargetPrice(sourcePrice, config.targetRoi || 40, config.minProfit || 15, 0, 0, 13.25, 0.30, pSold);

      // Pre-listing Competitiveness Check
      if (pSold !== null) {
        if (pEbay > pSold * 1.10) {
          console.log(`❌ ABORT: Item Uncompetitive. Required eBay Price $${pEbay.toFixed(2)} exceeds 10% tolerance over Average Sold Price $${pSold.toFixed(2)}`);
          continue; // Drop it immediately
        }
      }

      console.log(`Listing at calculated price: $${pEbay.toFixed(2)}`);
      const xml = buildAddItemXml(product, config, pEbay);
      
      try {
        const response = await axios.post('https://api.ebay.com/ws/api.dll', xml, {
          headers: {
            'Content-Type': 'text/xml',
            'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
            'X-EBAY-API-SITEID': '0',
            'X-EBAY-API-CALL-NAME': 'AddItem',
            'X-EBAY-API-IAF-TOKEN': `Bearer ${token}`
          }
        });

        const result = await parseStringPromise(response.data, { explicitArray: false });
        const addItemResponse = result.AddItemResponse;

        if (addItemResponse.Ack === 'Success' || addItemResponse.Ack === 'Warning') {
          const itemId = addItemResponse.ItemID;
          console.log(`✅ SUCCESS: Listed as ItemID ${itemId}`);
          
          // Add to local tracker maps
          maps[itemId] = {
            itemId,
            title: product.title,
            currentPrice: pEbay,
            sourceUrl: `https://www.amazon.com/dp/${product.asin}`,
            sourceSku: product.asin,
            sourcePrice: sourcePrice,
            autoPrice: true,
            autoStock: true,
            targetRoi: config.targetRoi || 40,
            lastChecked: new Date().toISOString(),
            status: 'Active'
          };
          successCount++;
        } else {
          console.error(`❌ FAILED: ${JSON.stringify(addItemResponse.Errors)}`);
        }
      } catch (err) {
        console.error(`❌ API Error: ${err.message}`);
      }
    }
    
    fs.writeFileSync(mapPath, JSON.stringify(maps, null, 2));
    console.log(`\nFinished batch. Successfully listed ${successCount} items.`);
    
  } catch (error) {
    console.error('Fatal Error:', error.message);
  }
}

main();
