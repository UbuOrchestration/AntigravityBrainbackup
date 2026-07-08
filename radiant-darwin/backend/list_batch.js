const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { parseStringPromise } = require('xml2js');
const { getCompletedSales } = require('./dist/ebayApi.js');
const { calculateTargetPrice } = require('./dist/tracker.js');
const { getDb } = require('./dist/db.js');

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

const { generateCassiniMetadata } = require('./dist/cassini_agent.js');

async function processBatchWithGeminiThrottle(items, config, db, concurrencyLimit = 5) {
  const results = [];
  const executing = new Set();
  let successCount = 0;

  for (const product of items) {
    const p = Promise.resolve().then(async () => {
      console.log(`\nScreening: ${product.title}`);
      
      const sourcePrice = product.sourcePrice || 15.00;
      const pSold = await getCompletedSales(product.title, sourcePrice);
      
      const pEbay = calculateTargetPrice(sourcePrice, config.targetRoi || 40, config.minProfit || 15, 0, 0, 13.25, 0.30, pSold);

      // Pre-listing Competitiveness Check
      if (pSold !== null) {
        if (pEbay > pSold * 1.10) {
          console.log(`❌ ABORT: Item Uncompetitive. Required eBay Price $${pEbay.toFixed(2)} exceeds 10% tolerance over Average Sold Price $${pSold.toFixed(2)}`);
          return; // Drop it immediately
        }
      }

      console.log(`[CASSINI AGENT] Generating optimal metadata for ${product.asin || 'unknown'}...`);
      const metadata = await generateCassiniMetadata({
        title: product.title,
        sourceUrl: `https://www.amazon.com/dp/${product.asin}`
      });

      console.log(`Staging calculated price: $${pEbay.toFixed(2)} for optimized title: "${metadata.optimized_title}"`);
      
      try {
        const sku = product.asin || `BATCH-${Date.now()}`;
        const sourcePlatform = 'amazon';
        const costTier = sourcePrice <= 20 ? 'LOW' : (sourcePrice > 75 ? 'HIGH' : 'MID');
        
        await db.run(`
          INSERT INTO inventory (
            sku, upc_mpn, source_platform, source_url, title, 
            cost_tier, p_source, p_sold, p_ebay, last_margin, quantity, delivery_days, status,
            optimized_title, item_specifics_json, listing_description
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(sku) DO UPDATE SET
            p_ebay = excluded.p_ebay,
            optimized_title = excluded.optimized_title,
            item_specifics_json = excluded.item_specifics_json,
            listing_description = excluded.listing_description,
            status = 'PENDING'
        `, [
          sku, 'DOES NOT APPLY', sourcePlatform, `https://www.amazon.com/dp/${product.asin}`, 
          product.title, costTier, sourcePrice, pSold || 0, pEbay, 0, 1, 3, 'PENDING',
          metadata.optimized_title, metadata.item_specifics_json, metadata.listing_description
        ]);
        
        successCount++;
        console.log(`✅ SUCCESS: Staged ${sku} as PENDING with Cassini Metadata.`);
      } catch (err) {
        console.error(`❌ DB Error: ${err.message}`);
      }
    });
    
    results.push(p);
    executing.add(p);

    const clean = () => executing.delete(p);
    p.then(clean, clean);

    if (executing.size >= concurrencyLimit) {
      await Promise.race(executing);
    }
  }
  
  await Promise.all(results);
  return successCount;
}

async function main() {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const token = config.accessToken;
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    const db = await getDb();
    
    const successCount = await processBatchWithGeminiThrottle(catalog, config, db, 5);
    
    console.log(`\nFinished batch staging. Successfully staged ${successCount} fully-optimized items for the Dispatcher.`);
    
  } catch (error) {
    console.error('Fatal Error:', error.message);
  }
}

main();
