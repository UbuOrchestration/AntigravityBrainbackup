import { getDb } from '../src/db.js';

export interface QCAuditResult {
    totalRows: number;
    passedRows: number;
    failedRows: number;
    violations: Array<{ sku: string; title: string; reason: string }>;
    isClean: boolean;
}

export async function runSelfQCAudit(): Promise<QCAuditResult> {
    const db = await getDb();
    const rows = await db.all('SELECT * FROM inventory');

    const violations: Array<{ sku: string; title: string; reason: string }> = [];
    let passedRows = 0;

    for (const row of rows) {
        const itemViolations: string[] = [];

        // 1. Title QC
        if (!row.title || row.title.trim() === '' || row.title.toLowerCase().includes('dummy') || row.title.toLowerCase().includes('placeholder')) {
            itemViolations.push('Invalid or placeholder title');
        }

        // 2. Image QC
        let imageUrls: string[] = [];
        try {
            imageUrls = JSON.parse(row.valid_image_urls || '[]');
        } catch {
            itemViolations.push('Corrupted valid_image_urls JSON');
        }

        if (!imageUrls || imageUrls.length === 0) {
            itemViolations.push('Missing product image URLs');
        } else {
            for (const img of imageUrls) {
                if (img.includes('127.0.0.1') || img.includes('localhost') || img.includes('placeholder')) {
                    itemViolations.push(`Hallucinated/Mock image URL detected: ${img}`);
                }
            }
        }

        // 3. Price & Margin QC
        const pSource = parseFloat(row.p_source || 0);
        const pEbay = parseFloat(row.p_ebay || 0);

        if (pSource <= 0) {
            itemViolations.push('Invalid or missing p_source cost');
        } else if (pEbay <= 0) {
            itemViolations.push('Invalid or missing p_ebay price');
        } else {
            const profit = pEbay - pSource;
            const roi = profit / pSource;

            if (pSource <= 20.0) {
                if (profit < 4.99 && roi < 0.299) {
                    itemViolations.push(`Tier 1 Margin Violation: Cost=$${pSource}, Ebay=$${pEbay}, Profit=$${profit.toFixed(2)}, ROI=${(roi*100).toFixed(1)}% (Req: $5 min or 30% ROI)`);
                }
            } else {
                if (roi < 0.149) {
                    itemViolations.push(`Tier 2 Margin Violation: Cost=$${pSource}, Ebay=$${pEbay}, Profit=$${profit.toFixed(2)}, ROI=${(roi*100).toFixed(1)}% (Req: 15% ROI)`);
                }
            }
        }

        // 4. Delivery Speed QC
        if (row.delivery_days && parseInt(row.delivery_days) > 5) {
            itemViolations.push(`Delivery Turnaround Exceeded: ${row.delivery_days} days (Max: 5 days)`);
        }

        if (itemViolations.length > 0) {
            violations.push({
                sku: row.sku,
                title: row.title || 'UNKNOWN',
                reason: itemViolations.join(' | ')
            });
        } else {
            passedRows++;
        }
    }

    const failedRows = violations.length;
    const isClean = failedRows === 0;

    console.log(`\n================ SELF-QC AUDIT REPORT ================`);
    console.log(`Total Inventory Items Evaluated: ${rows.length}`);
    console.log(`Passed QC Audit: ${passedRows}`);
    console.log(`Failed QC Audit: ${failedRows}`);
    console.log(`Audit Status: ${isClean ? '✅ PASSED (100% CLEAN)' : '❌ FAILED (Violations Found)'}`);
    console.log(`======================================================\n`);

    if (violations.length > 0) {
        console.log(`Top Violations (First 10):`);
        for (const v of violations.slice(0, 10)) {
            console.log(` - SKU [${v.sku}]: ${v.reason}`);
        }
    }

    return {
        totalRows: rows.length,
        passedRows,
        failedRows,
        violations,
        isClean
    };
}

if (require.main === module) {
    runSelfQCAudit().catch(console.error);
}
