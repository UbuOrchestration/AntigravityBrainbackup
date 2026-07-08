const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/database.sqlite');

const fixes = [
  {
    sku: "B004809YOC",
    title: "Camco RV Heavy Duty Leveling Blocks, 10 Pack with Bag",
    asin: "B004809YOC",
    sourcePrice: 35.60,
    images: ["https://cdnimages.opentip.com/full/LNS/LNS-17-44505.jpg", "https://cdnimages.opentip.com/full/LNS/LNS-17-44505_1.jpg"]
  },
  {
    sku: "B0006IX870",
    title: "Camco TastePURE RV Water Filter with Flexible Hose Protector",
    asin: "B0006IX87S",
    sourcePrice: 19.50,
    images: ["https://cdnimages.opentip.com/full/LNS/LNS-17-40043.jpg"]
  },
  {
    sku: "B015Y9A1Z8",
    title: "Progressive Industries EMS-PT50X RV Surge Protector",
    asin: "B015Y9A1Z8",
    sourcePrice: 85.00,
    images: [
        "https://www.airgear.store/cdn/shop/products/Progressive_EMS-PT50X_600x600_crop_center.jpg?v=1743107616"
    ]
  }
];

function calculatePrice(sourcePrice) {
  const shippingCost = 5.00;
  const totalCost = sourcePrice + shippingCost;
  const desiredProfit = Math.max(totalCost * 0.40, 15.00);
  let finalPrice = (totalCost + desiredProfit + 0.30) / (1 - 0.1325);
  return parseFloat(finalPrice.toFixed(2));
}

db.serialize(() => {
    for (const fix of fixes) {
        const ebayPrice = calculatePrice(fix.sourcePrice);
        const imagesJson = JSON.stringify(fix.images);
        
        db.run(`UPDATE inventory SET 
            title = ?, 
            p_source = ?, 
            p_ebay = ?, 
            valid_image_urls = ?,
            source_url = ?,
            upc_mpn = ?
            WHERE sku = ? AND status = 'ACTIVE'`, 
            [fix.title, fix.sourcePrice, ebayPrice, imagesJson, `https://www.amazon.com/dp/${fix.asin}`, fix.asin, fix.sku]
        );
    }
});
console.log("Remaining 3 edge-case SKUs updated.");
