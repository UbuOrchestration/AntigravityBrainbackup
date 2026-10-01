import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
import { processBulkIngestionQueue, RawProduct } from './src/ingestion_pipeline.js';

async function runBulkIngest() {
    console.log('[BULK INGEST] Starting bulk ingestion of RV products...');
    
    const filePath = 'C:/Users/Ubu/.gemini/antigravity/brain/480448e1-a537-4204-9b4f-cb5bfda403c3/profitable_rv_products.md';
    if (!fs.existsSync(filePath)) {
        console.error(`[BULK INGEST] File not found: ${filePath}`);
        return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    const rawProducts: RawProduct[] = [];
    
    for (const line of lines) {
        // Look for table rows: | **RV-001** | Valterra ... |
        if (line.trim().startsWith('| **RV-') && line.includes('|')) {
            const parts = line.split('|').map(p => p.trim());
            if (parts.length < 9) continue;
            
            // Format: | ID | Brand & Product Name | Source Cost | Target Sold Price | Buyer Shipping Fee | Your Shipping Cost | eBay Fee | Est. Net Profit | ROI % |
            const idRaw = parts[1]; // **RV-001**
            const id = idRaw.replace(/[*_]/g, '');
            
            const name = parts[2];
            let brand = 'Unknown';
            if (name.includes(' ')) {
                brand = name.split(' ')[0]; // Basic heuristic
            }

            const sourceCostStr = parts[3].replace(/[$,]/g, '');
            const p_source = parseFloat(sourceCostStr);
            
            const netProfitStr = parts[8].replace(/[+$*,]/g, ''); // "**+$5.16**" -> "5.16"
            const netProfit = parseFloat(netProfitStr);
            
            if (isNaN(netProfit) || netProfit < 0.50) {
                console.log(`[BULK INGEST] Skipping ${id} - Unprofitable (Net Margin: $${netProfit})`);
                continue;
            }
            
            rawProducts.push({
                id: id,
                brand: brand,
                upc_mpn: 'DOES NOT APPLY',
                source_platform: 'amazon',
                source_url: `https://www.amazon.com/dp/MOCK${id.replace('-', '')}`,
                title: name,
                p_source: p_source,
                image_urls: [], // Will pass empty, AI model handles fallbacks safely
                description: name
            });
        }
    }
    
    console.log(`[BULK INGEST] Found ${rawProducts.length} profitable products. Dispatching to ingestion pipeline...`);
    
    try {
        await processBulkIngestionQueue(rawProducts);
        console.log('[BULK INGEST] Successfully completed bulk ingestion pipeline.');
    } catch (err: any) {
        console.error('[BULK INGEST] Fatal error during pipeline execution:', err.message);
    }
}

runBulkIngest();
