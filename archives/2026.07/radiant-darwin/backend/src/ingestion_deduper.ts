import { getDb } from './db.js';

interface DedupResult {
    action: 'PROCEED' | 'BLOCK_COLLISION';
    reason?: string;
}

export async function checkForLegacyCatalogCollisions(newProductPayload: any): Promise<DedupResult> {
    const db = await getDb();
    
    // Step 1: Immediate strict identifier correlation check (UPC/MPN intersection)
    const upc = (newProductPayload.upc_mpn || '').trim();
    if (upc && upc !== 'DOES NOT APPLY') {
        const rows = await db.all(`SELECT sku, title, source_url FROM inventory WHERE upc_mpn = ? AND status != 'PAUSED_DUPLICATE'`, [upc]);
        
        if (rows.length > 0) {
            // Precise match caught instantly by identifier
            return { 
                action: 'BLOCK_COLLISION', 
                reason: `Duplicate product identifier found under existing SKU: ${rows[0].sku}` 
            };
        }
    }

    // Step 2: High-Fidelity Title Similarity Fuzzy Match (Failsafe for generic/missing UPCs)
    const allItems = await db.all(`SELECT sku, title FROM inventory WHERE status != 'PAUSED_DUPLICATE'`);
    if (!allItems || allItems.length === 0) {
        return { action: 'PROCEED' };
    }

    for (const existingItem of allItems) {
        const similarityScore = calculateTitleSimilarity(newProductPayload.title, existingItem.title);
        
        // If titles share greater than an 85% match tolerance threshold
        if (similarityScore > 0.85) {
            return {
                action: 'BLOCK_COLLISION',
                reason: `Fuzzy Title Collision (>85%). Matches legacy inventory line: ${existingItem.sku}`
            };
        }
    }
    
    return { action: 'PROCEED' };
}

// Levenshtein Text Vector Similarity Optimization Loop
function calculateTitleSimilarity(str1: string, str2: string): number {
    const s1 = (str1 || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const s2 = (str2 || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (!s1 || !s2) return 0;
    
    const track = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
    for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
    for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;
    
    for (let j = 1; j <= s2.length; j += 1) {
        for (let i = 1; i <= s1.length; i += 1) {
            const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
            track[j][i] = Math.min(
                track[j][i - 1] + 1, // deletion
                track[j - 1][i] + 1, // insertion
                track[j - 1][i - 1] + indicator // substitution
            );
        }
    }
    const distance = track[s2.length][s1.length];
    const maxLength = Math.max(s1.length, s2.length);
    return (maxLength - distance) / maxLength;
}
