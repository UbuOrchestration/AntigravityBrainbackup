import { runRepricerIteration } from './src/tracker.js';

async function triggerRepricer() {
    console.log("Triggering global repricer iteration to ingest latest Buy Box pricing...");
    await runRepricerIteration();
    console.log("Repricer iteration complete.");
}

triggerRepricer().catch(console.error);
