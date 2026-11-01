import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
import { activeCatalogDeduplicationAudit } from './src/cron_deduper.js';

console.log('Running test audit...');
activeCatalogDeduplicationAudit().then(() => console.log('Test complete.')).catch(console.error);
