import { processBulkIngestionQueue } from './src/ingestion_pipeline.js';

const testPayload = [
    {
        id: "B002XL2IBS",
        brand: "Camco",
        upc_mpn: "",
        source_platform: "AMAZON",
        source_url: "https://www.amazon.com/dp/B002XL2IBS",
        title: "Camco RV Water Heater Tank Rinser"
    },
    {
        id: "B00192QBBU",
        brand: "Camco",
        upc_mpn: "",
        source_platform: "AMAZON",
        source_url: "https://www.amazon.com/dp/B00192QBBU",
        title: "Camco 15M/30F PowerGrip Adapter"
    },
    {
        id: "B000BUQOGI",
        brand: "Camco",
        upc_mpn: "",
        source_platform: "AMAZON",
        source_url: "https://www.amazon.com/dp/B000BUQOGI",
        title: "Camco 50M/30F PowerGrip Adapter"
    },
    {
        id: "B000EDQQP2",
        brand: "Camco",
        upc_mpn: "",
        source_platform: "AMAZON",
        source_url: "https://www.amazon.com/dp/B000EDQQP2",
        title: "Camco Vinyl Sun Shield"
    },
    {
        id: "B0006JLSN0",
        brand: "Camco",
        upc_mpn: "",
        source_platform: "AMAZON",
        source_url: "https://www.amazon.com/dp/B0006JLSN0",
        title: "Camco Water Hose Y-Valve"
    },
    {
        id: "B0006JLW70",
        brand: "Camco",
        upc_mpn: "",
        source_platform: "AMAZON",
        source_url: "https://www.amazon.com/dp/B0006JLW70",
        title: "Camco RV Fridge Thermometer"
    },
    {
        id: "B000EDUSRA",
        brand: "Camco",
        upc_mpn: "",
        source_platform: "AMAZON",
        source_url: "https://www.amazon.com/dp/B000EDUSRA",
        title: "Camco Pop-A-Toothbrush Wall Mount"
    },
    {
        id: "B00192QBAY",
        brand: "Camco",
        upc_mpn: "",
        source_platform: "AMAZON",
        source_url: "https://www.amazon.com/dp/B00192QBAY",
        title: "Camco Collapsible Wash Bucket"
    },
    {
        id: "B000EDUTP6",
        brand: "Camco",
        upc_mpn: "",
        source_platform: "AMAZON",
        source_url: "https://www.amazon.com/dp/B000EDUTP6",
        title: "Camco Insect Screen for Atwood Water Heaters"
    },
    {
        id: "B000EDUTPA",
        brand: "Camco",
        upc_mpn: "",
        source_platform: "AMAZON",
        source_url: "https://www.amazon.com/dp/B000EDUTPA",
        title: "Camco Insect Screen for Suburban Furnaces"
    }
];

async function run() {
    await processBulkIngestionQueue(testPayload);
}

run();
