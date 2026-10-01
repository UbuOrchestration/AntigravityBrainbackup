import { processBulkIngestionQueue } from './src/ingestion_pipeline.js';

const verifiedPayload = [
  {
    id: "B000EDUTNS",
    brand: "Camco",
    upc_mpn: "014717421546", // Using a valid UPC format to pass strict fallback if needed, but it should grab direct from Amazon if possible
    source_platform: "AMAZON",
    source_url: "https://www.amazon.com/dp/MOCKB000EDUTNS",
    title: "Camco RV Flying Insect Screen for Water Heater Vents"
  }
];

async function run() {
    await processBulkIngestionQueue(verifiedPayload);
}

run();
