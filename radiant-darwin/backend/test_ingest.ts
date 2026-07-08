import { processBulkIngestionQueue } from './src/ingestion_pipeline.js';

const testPayload = [
    {
        id: "TEST-002",
        brand: "Camco",
        upc_mpn: "44414", // Wheel Chock
        source_platform: "AMAZON",
        source_url: "https://www.amazon.com/dp/B00192JG9O",
        title: "Camco Unique Wheel Chock Test Item" // Unique title
    }
];

async function run() {
    await processBulkIngestionQueue(testPayload);
}

run();
