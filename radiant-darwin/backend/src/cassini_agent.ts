import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
dotenv.config();

export interface CassiniMetadata {
  optimized_title: string;
  item_specifics_json: string;
  listing_description: string;
}

const SYSTEM_PROMPT = `
[SYSTEM INSTRUCTION: CASSINI TITLE & METADATA GENERATOR]

You are generating the front-end listing metadata payload for the eBay API. You must optimize exclusively for the 2026 Cassini Search Algorithm while preserving strict token efficiency.

1. TITLE TOKENS CONSTRAINTS (80-CHARACTER MAX)
   - Maximize search surface: Generate titles strictly between 65 and 80 characters.
   - Core Formula: [Brand Name] + [Exact Model Number/MPN] + [Core Product Noun] + [Key Specification/Variant] + [Condition Token]
   - Example Vector: "Logitech MX Master 3S Wireless Mouse Ergonomic 8K DPI Graphite New Sealed"
   - FORBIDDEN SEARCH WASTERS: Never include punctuation (-, *, !, |). Never use promotional fluff keywords ("WOW", "L@@K", "FREE SHIPPING", "BARGAIN", "AMAZING").
   - NO SHOUTING: Capitalize only the first letter of distinct nouns and acronyms. Never use ALL-CAPS titles.

2. ITEM SPECIFICS STRUCTURAL CONVERGENCE
   - Parse the product data payload from the supplier. Extract structured parameters into a key-value JSON string for \`item_specifics_json\`.
   - Prioritize indexing the following target keys: "Brand", "MPN", "Type", "Color", "Material", "Model", "Features".
   - CRITICAL: If a specific key is missing, populate with an accurate deduction based on the supplier text. This prevents search suppression from sidebar filter drop-outs.

3. DESCRIPTION SANITIZATION (MOBILE COMPLIANCE)
   - Do not copy-paste long, promotional blocks from Amazon/Walmart.
   - Clean structure format:
     * Line 1: Single direct summary sentence defining the item.
     * Line 2-6: Plain-text markdown bullet points denoting explicit dimensions, technical specifications, and box contents.
     * Line 7: Strict compliance notice: "Brand new retail inventory, sealed in original packaging."
   - FORMAT CONSTRAINT: Stick entirely to standard typography. Do not generate embedded HTML templates, custom CSS, or inline image code blocks. Keep descriptions small, crisp, and under 500 characters total.

OUTPUT FORMAT:
Respond exclusively with a JSON object containing the exact three keys:
{
  "optimized_title": "string",
  "item_specifics_json": "stringified JSON of key value pairs",
  "listing_description": "string"
}
`;

export async function generateCassiniMetadata(productData: any): Promise<CassiniMetadata> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('[CASSINI AGENT] No GEMINI_API_KEY found. Falling back to simple heuristic generation.');
    return {
      optimized_title: (productData.title || '').substring(0, 80).replace(/[^\w\s]/gi, ''),
      item_specifics_json: JSON.stringify({ Brand: 'Unbranded', Type: 'Item' }),
      listing_description: `${productData.title}\n\nBrand new retail inventory, sealed in original packaging.`
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `Analyze this item data and return eBay Cassini parameters: ${JSON.stringify(productData)}`,
      config: {
        responseMimeType: 'application/json',
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.2
      }
    });

    const content = response.text || '{}';
    const parsed = JSON.parse(content);
    return {
      optimized_title: parsed.optimized_title || '',
      item_specifics_json: parsed.item_specifics_json || '{}',
      listing_description: parsed.listing_description || ''
    };
  } catch (err: any) {
    console.error('[CASSINI AGENT] Gemini LLM Generation Failed:', err.message);
    // Fallback on error
    return {
      optimized_title: (productData.title || '').substring(0, 80).replace(/[^\w\s]/gi, ''),
      item_specifics_json: '{}',
      listing_description: 'Brand new retail inventory, sealed in original packaging.'
    };
  }
}

export async function validateProductImages(imageUrls: string[]): Promise<string[]> {
  const cleanImageUrls: string[] = [];
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[CASSINI AGENT] No GEMINI_API_KEY found. Skipping image validation and returning all images.');
    return imageUrls;
  }

  const ai = new GoogleGenAI({ apiKey });

  for (const url of imageUrls) {
    try {
      // Fetch image binary to pass directly to Gemini Vision
      const imageResponse = await fetch(url);
      const imageBuffer = await imageResponse.arrayBuffer();

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [
          {
            inlineData: {
              data: Buffer.from(imageBuffer).toString("base64"),
              mimeType: "image/jpeg"
            }
          },
          "Analyze this retail product image. Check for: 1. Competitor logos (Amazon, Walmart, Target). 2. Watermarks. 3. Promotional text overlays ('Free Shipping', 'Prime', 'Sale', discounts). Return a clean JSON response matching the schema."
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: "OBJECT" as any, // using string to avoid Type enum import issues
            properties: {
              isValidForEbay: { type: "BOOLEAN" as any },
              reasonForRejection: { type: "STRING" as any }
            },
            required: ["isValidForEbay"]
          }
        }
      });

      const content = response.text || '{}';
      const result = JSON.parse(content);
      if (result.isValidForEbay) {
        cleanImageUrls.push(url);
      } else {
        console.log(`Image rejected (${url}): ${result.reasonForRejection}`);
      }
    } catch (error: any) {
      console.error(`Error validating image ${url}:`, error.message);
      // Fallback to accepting the image on network/API failure to avoid blocking
      cleanImageUrls.push(url);
    }
  }
  return cleanImageUrls;
}
