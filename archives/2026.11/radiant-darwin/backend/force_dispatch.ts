import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
import { runDispatcher } from './src/dispatcher.js';

async function execute() {
    console.log('[MANUAL DISPATCH] Triggering immediate dispatcher cycle...');
    await runDispatcher();
    console.log('[MANUAL DISPATCH] Cycle finished.');
}

execute().catch(console.error);
