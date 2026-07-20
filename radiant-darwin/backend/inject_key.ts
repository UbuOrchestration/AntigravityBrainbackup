import { loadConfig, saveConfig } from './src/config.js';

async function run() {
    const config = loadConfig();
    config.scraperApiKey = '06496472b790e359d8d3796421f40cb1';
    saveConfig(config);
    console.log("Injected ScraperAPI key into config.");
}

run().catch(console.error);
