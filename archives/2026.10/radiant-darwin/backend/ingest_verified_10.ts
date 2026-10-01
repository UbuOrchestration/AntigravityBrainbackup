import { processBulkIngestionQueue } from './src/ingestion_pipeline.js';

const verifiedPayload = [
  {
    id: "014717548908",
    brand: "Camco",
    upc_mpn: "014717548908",
    source_platform: "AMAZON",
    source_url: "https://www.amazon.com/dp/MOCK014717",
    title: "Camco 54890 Oven-Type Bulb - 15W/12V"
  },
  {
    id: "014717455916",
    brand: "Camco",
    upc_mpn: "014717455916",
    source_platform: "AMAZON",
    source_url: "https://www.amazon.com/dp/MOCK014717",
    title: "Camco 45591 - Clear Slide Set for Screen Doors up to 28 Width"
  },
  {
    id: "014717546164",
    brand: "Camco",
    upc_mpn: "014717546164",
    source_platform: "AMAZON",
    source_url: "https://www.amazon.com/dp/MOCK014717",
    title: "Camco 54616 Bulb LED Ba 15S Spotlight 3 LED 150LM 1-Pack"
  },
  {
    id: "014717424035",
    brand: "Camco",
    upc_mpn: "014717424035",
    source_platform: "AMAZON",
    source_url: "https://www.amazon.com/dp/MOCK014717",
    title: "Camco 42403 RV Awning Locking Pin - 2-Pack"
  },
  {
    id: "014717419321",
    brand: "Camco",
    upc_mpn: "014717419321",
    source_platform: "AMAZON",
    source_url: "https://www.amazon.com/dp/MOCK014717",
    title: "Camco 41932 Wash Head Attachment Replacement Pad"
  },
  {
    id: "019079705006",
    brand: "Valterra",
    upc_mpn: "019079705006",
    source_platform: "AMAZON",
    source_url: "https://www.amazon.com/dp/MOCK019079",
    title: "Valterra A30-0500 RV TwinTrak"
  },
  {
    id: "019079241009",
    brand: "Valterra",
    upc_mpn: "019079241009",
    source_platform: "AMAZON",
    source_url: "https://www.amazon.com/dp/MOCK019079",
    title: "Valterra F02-4100 RV Hydroflush 45 Degree with Removable Anti-siphon Valve"
  },
  {
    id: "019079201065",
    brand: "Valterra",
    upc_mpn: "019079201065",
    source_platform: "AMAZON",
    source_url: "https://www.amazon.com/dp/MOCK019079",
    title: "Valterra 020106 Universal RV Stabilizer 14 Inch-28 Inch"
  },
  {
    id: "019079835123",
    brand: "Valterra",
    upc_mpn: "019079835123",
    source_platform: "AMAZON",
    source_url: "https://www.amazon.com/dp/MOCK019079",
    title: "Valterra P23512PB RV Water Pump Noise Reducer Kit"
  },
  {
    id: "019079235008",
    brand: "Valterra",
    upc_mpn: "019079235008",
    source_platform: "AMAZON",
    source_url: "https://www.amazon.com/dp/MOCK019079",
    title: "Valterra P23500VP RV Blow Out Plug White"
  }
];

async function run() {
    await processBulkIngestionQueue(verifiedPayload);
}

run();
