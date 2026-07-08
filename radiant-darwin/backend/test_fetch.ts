import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
import { harvestProductAssets } from './src/image_fetcher.js';

async function testFetch() { 
    console.log('Testing image fetcher...');
    const images = await harvestProductAssets('B004809YOC', 'https://www.amazon.com/dp/B004809YOC', 'DOES NOT APPLY', 'amazon'); 
    console.log('Resulting images:', images);
} 
testFetch();
