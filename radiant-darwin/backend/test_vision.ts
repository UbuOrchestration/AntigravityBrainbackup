import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
import { validateProductImages } from './src/cassini_agent.js';

async function testImages() {
    console.log('[VISION TEST] Initiating Gemini Vision API validation...');
    const testUrls = [
        'http://127.0.0.1:8080/rv_leveling_blocks_ready_to_ship_1782925687901.jpg',
        'http://127.0.0.1:8080/rv_water_filter_ready_to_ship_1782943892512.jpg'
    ];
    
    const validUrls = await validateProductImages(testUrls);
    console.log('[VISION TEST] Validated URLs:', validUrls);
}

testImages();
