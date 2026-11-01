import { getDb } from './src/db.js';
import fs from 'fs';
import path from 'path';

async function generateQcPreview() {
    console.log("Generating Visual QC Artifact...");
    const db = await getDb();
    const activeListings = await db.all("SELECT * FROM inventory WHERE status = 'ACTIVE'");

    const artifactDir = 'C:\\Users\\Ubu\\.gemini\\antigravity\\brain\\480448e1-a537-4204-9b4f-cb5bfda403c3';
    let markdown = `# Live Storefront Visual QC Sweep\n\n`;
    markdown += `> [!IMPORTANT]\n> The corrupted Valterra Leveling Blocks have been permanently ended and removed from the active storefront. Below is the visual QC report of all currently **ACTIVE** live listings on your eBay account.\n\n`;
    
    markdown += `Please review the images, titles, and pricing below to ensure they perfectly align with your quality standards.\n\n---\n\n`;

    let count = 0;
    for (const item of activeListings) {
        count++;
        let imageUrls = [];
        try {
            imageUrls = JSON.parse(item.valid_image_urls || '[]');
        } catch (e) {}

        let imageMarkdown = `*No image available*`;
        if (imageUrls.length > 0) {
            const firstUrl = imageUrls[0];
            let attempts = 0;
            let success = false;
            while (attempts < 3 && !success) {
                try {
                    const imgRes = await fetch(firstUrl, {
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
                    });
                    if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`);
                    const buffer = Buffer.from(await imgRes.arrayBuffer());
                    const localFileName = `${item.sku}_preview.jpg`;
                    const localFilePath = path.join(artifactDir, localFileName);
                    
                    fs.writeFileSync(localFilePath, buffer);
                    imageMarkdown = `![${item.sku} Image](file:///${localFilePath.replace(/\\/g, '/')})`;
                    success = true;
                } catch (err: any) {
                    attempts++;
                    if (attempts >= 3) {
                        console.error(`Failed to download image for ${item.sku}:`, err.message);
                        imageMarkdown = `*Failed to download preview image: ${firstUrl}*`;
                    }
                }
            }
        }

        markdown += `### ${count}. ${item.title}\n`;
        markdown += `${imageMarkdown}\n\n`;
        markdown += `- **eBay Listing ID:** ${item.ebay_item_id || 'PENDING DISPATCH'}\n`;
        markdown += `- **Local SKU:** ${item.sku}\n`;
        markdown += `- **Cost (Source):** $${item.p_source.toFixed(2)}\n`;
        markdown += `- **eBay Price (15% ROI Tier applied):** $${item.p_ebay.toFixed(2)}\n`;
        markdown += `- **Quantity Live:** ${item.quantity}\n`;
        markdown += `\n**Description Preview:**\n> ${item.listing_description.split('\n')[0]}...\n\n`;
        markdown += `---\n\n`;
    }

    if (activeListings.length === 0) {
        markdown += `*No active listings found in the database.*`;
    }

    const artifactPath = path.join(artifactDir, 'listing_preview.md');
    fs.writeFileSync(artifactPath, markdown);
    console.log(`Generated QC preview with ${activeListings.length} items at ${artifactPath}`);
}

generateQcPreview().catch(console.error);
