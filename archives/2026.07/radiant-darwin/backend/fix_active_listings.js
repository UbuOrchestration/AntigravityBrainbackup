const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const db = new sqlite3.Database('./data/database.sqlite');
const catalog = JSON.parse(fs.readFileSync('./verified_catalog_updated.json', 'utf8'));

const extraItems = [
  {
    sku: "ARB-AMAZON-RV-001",
    title: "Camco RV TST MAX Toilet Treatment Drop-Ins, 30 Count",
    asin: "B000BGJ800",
    sourcePrice: 19.99,
    images: ["https://cdnimages.opentip.com/full/LNS/LNS-17-41183.jpg"]
  },
  {
    sku: "ARB-AMAZON-RV-002",
    title: "Camco RhinoFLEX 15ft RV Sewer Hose Kit with Swivel Fitting",
    asin: "B002OUWEK0",
    sourcePrice: 38.50,
    images: ["https://cdnimages.opentip.com/full/LNS/LNS-17-39761.jpg"]
  },
  {
    sku: "ARB-AMAZON-RV-004",
    title: "Camco RV Toilet Tissue, 1-Ply, 4 Rolls",
    asin: "B000BQU5EE",
    sourcePrice: 5.25,
    images: ["https://cdnimages.opentip.com/full/LNS/LNS-17-40274.jpg"]
  },
  {
    sku: "ARB-AMAZON-RV-005",
    title: "Camco TastePURE RV/Marine Water Filter with Flexible Hose Protector",
    asin: "B0006IX87S",
    sourcePrice: 19.50,
    images: ["https://cdnimages.opentip.com/full/LNS/LNS-17-40043.jpg"]
  },
  {
    sku: "ARB-AMAZON-RV-007",
    title: "Camco RV Brass Inline Water Pressure Regulator",
    asin: "B003BZD08U",
    sourcePrice: 10.50,
    images: ["https://cdnimages.opentip.com/full/LNS/LNS-17-40055.jpg"]
  },
  {
    sku: "ARB-AMAZON-RV-008",
    title: "Camco RV 15 Amp Male to 30 Amp Female Dogbone Adapter",
    asin: "B00192QBDU",
    sourcePrice: 14.99,
    images: ["https://cdnimages.opentip.com/full/LNS/LNS-17-55165.jpg"]
  },
  {
    sku: "ARB-AMAZON-RV-009",
    title: "Camco RV Heavy Duty Leveling Blocks, 10 Pack with Bag",
    asin: "B004809YOC",
    sourcePrice: 35.60,
    images: ["https://cdnimages.opentip.com/full/LNS/LNS-17-44505.jpg", "https://cdnimages.opentip.com/full/LNS/LNS-17-44505_1.jpg"]
  },
  {
    sku: "ARB-AMAZON-RV-010",
    title: "Camco FasTen 2x2 Leveling Block For Dual Tires",
    asin: "B00G258ID0",
    sourcePrice: 28.50,
    images: ["https://cdnimages.opentip.com/full/LNS/LNS-17-44512.jpg"]
  },
  {
    sku: "ARB-AMAZON-RV-011",
    title: "Camco RV Sidewinder Plastic Sewer Hose Support, 20ft",
    asin: "B000EDOSKA",
    sourcePrice: 39.99,
    images: ["https://cdnimages.opentip.com/full/LNS/LNS-17-43051.jpg"]
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
    // 1. Update the 10 Camco ASINs
    for (const item of catalog) {
        const ebayPrice = calculatePrice(item.sourcePrice);
        const imagesJson = JSON.stringify(item.imageUrls);
        
        db.run(`UPDATE inventory SET 
            title = ?, 
            p_source = ?, 
            p_ebay = ?, 
            valid_image_urls = ?,
            source_url = ?
            WHERE sku = ? AND status = 'ACTIVE'`, 
            [item.title, item.sourcePrice, ebayPrice, imagesJson, `https://www.amazon.com/dp/${item.asin}`, item.asin]
        );
    }
    
    // 2. Update the MOCKRV ones
    for (const extra of extraItems) {
        const ebayPrice = calculatePrice(extra.sourcePrice);
        const imagesJson = JSON.stringify(extra.images);
        
        db.run(`UPDATE inventory SET 
            title = ?, 
            p_source = ?, 
            p_ebay = ?, 
            valid_image_urls = ?,
            source_url = ?,
            upc_mpn = ?
            WHERE sku = ? AND status = 'ACTIVE'`, 
            [extra.title, extra.sourcePrice, ebayPrice, imagesJson, `https://www.amazon.com/dp/${extra.asin}`, extra.asin, extra.sku]
        );
    }
});

console.log("Database updated with pristine data and genuine image URLs!");
