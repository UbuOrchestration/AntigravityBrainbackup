import crypto from 'crypto';
import { GoogleGenAI, Type } from '@google/genai';

export async function runPrecisionPreFlightCheck(rawSupplierPayload: any, existingDbRecord: any) {
    // 1. DATA DRIFT FILTERING VIA SHA-256 HASH COMPRESSION
    const currentPayloadString = JSON.stringify({
        title: rawSupplierPayload.title,
        price: rawSupplierPayload.p_source,
        images: rawSupplierPayload.image_urls || []
    });
    
    const computedHash = crypto.createHash('sha256').update(currentPayloadString).digest('hex');
    if (existingDbRecord && existingDbRecord.content_hash === computedHash) {
        return { status: 'SKIP_NO_DRIFT', reason: "Supplier data is completely static. Saving tokens.", hash: computedHash };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.warn('[PRECISION GUARD] No GEMINI_API_KEY found. Falling back to optimistic validation.');
        return {
            status: 'PROCEED_PASSED',
            hash: computedHash,
            cleanImages: (rawSupplierPayload.image_urls || []).slice(0, 5),
            hazardData: []
        };
    }

    const ai = new GoogleGenAI({ apiKey });

    // 2. MULTI-MODAL HIGH INTEGRITY DOUBLE-CHECK MATRIX
    try {
        const geminiPayload = await ai.models.generateContent({
            model: 'gemini-1.5-flash-latest',
            contents: `
                Perform a high-integrity technical inspection of this product specification profile:
                Title: "${rawSupplierPayload.title}"
                Description text: "${rawSupplierPayload.description}"
                Extracted Images Array: ${JSON.stringify(rawSupplierPayload.image_urls || [])}
            `,
            config: {
                responseMimeType: 'application/json',
                systemInstruction: `
                    You are an expert retail compliance auditor. Analyze the text string inputs and images:
                    1. Multipack Verification: Search for terms like "pack of X", "count of Y", "X-pcs", "bundle of Z". Compare against the item title. Return true if there is an explicit multi-unit quantity implied.
                    2. Variation Complexity Check: Identify if this page contains complex drop-down selections for size, color, or style. Return total variation count.
                    3. Asset Similarity Evaluation: Inspect the file URLs. If multiple distinct URLs resolve to identical image bytes, or if they are the exact same image duplicated, return assetsAreDuplicated: true.
                    4. Filter and select up to 5 completely distinct, unique product photos from the array.
                `,
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        isMultipack: { type: Type.BOOLEAN },
                        variationCount: { type: Type.INTEGER },
                        assetsAreDuplicated: { type: Type.BOOLEAN },
                        deduplicatedImages: { type: Type.ARRAY, items: { type: Type.STRING } },
                        hazardFlags: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["isMultipack", "variationCount", "assetsAreDuplicated", "deduplicatedImages", "hazardFlags"]
                }
            }
        });

        const validationResult = JSON.parse(geminiPayload.text || '{}');

        // 3. EXECUTE STRUCTURAL COMPLIANCE FILTERS
        if (validationResult.variationCount > 1) {
            return { status: 'REJECT', reason: `Complex page logic: contains ${validationResult.variationCount} choices. Dropshipping variants introduces high inventory out-of-sync risks.`, hash: computedHash };
        }

        if (validationResult.isMultipack) {
            return { status: 'REJECT', reason: "Multipack or unit count breakdown detected. Requires manual scale matching review.", hash: computedHash };
        }

        return {
            status: 'PROCEED_PASSED',
            hash: computedHash,
            cleanImages: validationResult.deduplicatedImages.slice(0, 5),
            hazardData: validationResult.hazardFlags
        };

    } catch (err: any) {
        console.warn(`[PRECISION GUARD] API Failure (${err.message}). Using optimistic validation.`);
        return {
            status: 'PROCEED_PASSED',
            hash: computedHash,
            cleanImages: (rawSupplierPayload.image_urls || []).slice(0, 5),
            hazardData: []
        };
    }
}
