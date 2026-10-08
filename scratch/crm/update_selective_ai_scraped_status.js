const fs = require('fs');

const md = fs.readFileSync('contacts_database.md', 'utf-8');
const comparisonData = JSON.parse(fs.readFileSync('cold_leads_comparison.json', 'utf-8'));

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

function escapeCSVField(str) {
    if (str === null || str === undefined) return '""';
    const clean = String(str).replace(/"/g, '""').replace(/\r?\n/g, ' ');
    return `"${clean}"`;
}

const csvMatch = md.match(/```csv\r?\n([\s\S]*?)\r?\n```/);
const csvText = csvMatch ? csvMatch[1] : md;
const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);

const headers = parseCSVLine(lines[0]).map(h => {
    let clean = h.trim();
    if (clean.startsWith('"') && clean.endsWith('"')) {
        clean = clean.substring(1, clean.length - 1).replace(/""/g, '"');
    }
    return clean;
});

// Map of enriched comparison data
const comparisonMap = new Map();
comparisonData.forEach(item => {
    comparisonMap.set(String(item.id), item);
});

let updatedToAiScrapedCount = 0;
let keptColdLeadCount = 0;

const updatedRows = [];

for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]).map(f => {
        let clean = f.trim();
        if (clean.startsWith('"') && clean.endsWith('"')) {
            clean = clean.substring(1, clean.length - 1).replace(/""/g, '"');
        }
        return clean;
    });

    const recordId = String(row[0]);
    if (comparisonMap.has(recordId)) {
        const comp = comparisonMap.get(recordId);
        const isEnrichedWithScrapedData = comp.verificationStatus === 'Confirmed & Enriched';

        if (isEnrichedWithScrapedData) {
            row[8] = 'Cold Lead - AI Scraped';
            updatedToAiScrapedCount++;
        } else {
            row[8] = 'Cold Lead';
            keptColdLeadCount++;
        }
    }
    updatedRows.push(row);
}

// Write back to contacts_database.md
let newMd = `# KANNEM CRM - Local Contacts Database\n\n`;
newMd += `*This file is synced live with the KANNEM CRM web application. Edits made in the browser or directly in this file persist in real-time. Last audited: ${new Date().toISOString()}*\n\n`;
newMd += `\`\`\`csv\n`;
newMd += headers.map(escapeCSVField).join(',') + '\n';

updatedRows.forEach(row => {
    newMd += row.map(escapeCSVField).join(',') + '\n';
});

newMd += `\`\`\`\n`;

fs.writeFileSync('contacts_database.md', newMd, 'utf-8');
console.log(`Status update complete!`);
console.log(`- Changed to "Cold Lead - AI Scraped": ${updatedToAiScrapedCount} leads (modified with scraped data)`);
console.log(`- Retained "Cold Lead": ${keptColdLeadCount} leads (unmodified / no scraped data)`);
