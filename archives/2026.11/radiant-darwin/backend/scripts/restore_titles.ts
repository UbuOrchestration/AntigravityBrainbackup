import * as fs from 'fs';
import { getDb } from '../src/db.js';

async function restoreTitles() {
    const db = await getDb();
    const filePath = 'C:/Users/Ubu/.gemini/antigravity/brain/480448e1-a537-4204-9b4f-cb5bfda403c3/profitable_rv_products.md';
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    const titleMap: Record<string, string> = {};

    for (const line of lines) {
        if (line.trim().startsWith('| **RV-') && line.includes('|')) {
            const parts = line.split('|').map(p => p.trim());
            if (parts.length >= 3) {
                const id = parts[1].replace(/[*_]/g, ''); // RV-001
                const name = parts[2];
                titleMap[id] = name;
                titleMap[`ARB-AMAZON-${id}`] = name;
            }
        }
    }

    console.log(`Parsed ${Object.keys(titleMap).length} catalog product titles.`);

    // Also known SKU mappings for B00...
    const legacyMap: Record<string, string> = {
        'B004809YOC': 'Camco RV Heavy Duty Leveling Blocks, 10 Pack with Bag',
        'B0006IX870': 'Camco TastePURE RV Water Filter with Flexible Hose Protector',
        'B003BZD074': 'Valterra Revolution 20ft Sewer Hose Kit',
        'B015Y9A1Z8': 'Progressive Industries EMSPT50X RV Surge Protector',
        'B000BGHYJ0': 'Camco 90 Degree Hose Elbow RV Water Hose Fitting 22505',
        'B00192JG9O': 'Camco Wheel Chock With Rope Keeps Your Trailer or RV in Place',
        'B000EDSSDO': 'Camco RV Refrigerator Bars Keep Food and Drinks Safe and Secure',
        'B00074QWU0': 'Camco RhinoFLEX 3ft RV Sewer Hose Extension with Swivel Fittings',
        'B0024E6A3E': 'Camco 30 Amp to 15 Amp RV PowerGrip Electrical Adapter',
        'B0006JLW34': 'Camco RV Screen Door Cross Bar Handle Easier Entry and Exit',
        'B000EDQQJS': 'Camco RV Flying Insect Screen for Furnace Vents 2 Pack',
        'B0006JLSPI': 'Camco TastePURE 25ft Premium Drinking Water Hose for RVs',
        'ARB-AMAZON-B00192QBBU': 'Camco RV Sewer Hose Seal with Handle',
        'ARB-AMAZON-014717419321': 'Valterra T1029-1 Termination Valve 3" Handle',
        'ARB-AMAZON-RV-096': 'Camco TastePURE RV Water Filter (2-pack)',
        'ARB-AMAZON-RV-021': 'Valterra Surgeminder 30Amp Smart RV Surge Protector A10-30SMSP'
    };

    const rows = await db.all("SELECT id, sku, title FROM inventory WHERE title LIKE '%Choice%' OR title LIKE '%Amazon%'");
    console.log(`Fixing ${rows.length} rows with bad titles...`);

    let fixedCount = 0;
    for (const row of rows) {
        let cleanTitle = titleMap[row.sku] || legacyMap[row.sku];
        
        // If not directly found, try extracting RV-XXX
        if (!cleanTitle) {
            const match = row.sku.match(/RV-\d{3}/);
            if (match && titleMap[match[0]]) {
                cleanTitle = titleMap[match[0]];
            }
        }

        if (cleanTitle) {
            await db.run("UPDATE inventory SET title = ?, optimized_title = ? WHERE id = ?", [cleanTitle, cleanTitle, row.id]);
            fixedCount++;
            console.log(`Fixed [${row.sku}]: -> "${cleanTitle}"`);
        } else {
            console.warn(`Could not find title for SKU: ${row.sku}`);
        }
    }

    console.log(`Total fixed: ${fixedCount}/${rows.length}`);
}

restoreTitles().catch(console.error);
