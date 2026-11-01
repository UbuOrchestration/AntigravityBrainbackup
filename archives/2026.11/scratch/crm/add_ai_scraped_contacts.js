const fs = require('fs');
const path = require('path');

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

function formatPhone(phone) {
    if (!phone) return '';
    let digits = String(phone).replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) {
        digits = digits.substring(1);
    }
    if (digits.length === 10) {
        return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6, 10)}`;
    }
    let clean = String(phone).trim().replace(/^\+?1[\s-.]?/, '');
    if (clean.startsWith('(') && clean.includes(')')) {
        clean = clean.replace(/^\(1(\d{3})\)/, '($1)');
    }
    return clean || phone;
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

// Map of enriched contacts by ID
const comparisonMap = new Map();
comparisonData.forEach(item => {
    comparisonMap.set(String(item.id), item);
});

const updatedRows = [];
let updatedCount = 0;

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
        const ed = comp.enrichedData || {};
        
        const dmName = ed.decisionMakerName || row[1] + ' ' + row[2];
        const parts = (dmName || '').trim().split(/\s+/);
        const firstName = parts[0] || row[1] || '';
        const lastName = parts.slice(1).join(' ') || row[2] || '';
        
        const companyName = ed.companyName && ed.companyName !== 'Disregarded (No Confirmable Data)' ? ed.companyName : row[3];
        const position = ed.decisionMakerRole || row[4] || 'Decision Maker';
        const email = ed.decisionMakerEmail || row[5] || '';
        const phone = formatPhone(ed.decisionMakerPhone || row[6] || '');
        const stateRegion = ed.stateRegion || row[7] || '';
        const leadStatus = 'Cold Lead - AI Scraped';
        const websiteUrl = ed.websiteUrl || row[10] || '';
        const note = row[9] ? `${row[9]} | [AI Enriched]` : `[AI Enriched] Decision Maker: ${dmName} (${position}). Verification: ${comp.verificationStatus}`;

        const newRow = [
            recordId,
            firstName,
            lastName,
            companyName,
            position,
            email,
            phone,
            stateRegion,
            leadStatus,
            note,
            websiteUrl
        ];
        updatedRows.push(newRow);
        updatedCount++;
    } else {
        updatedRows.push(row);
    }
}

// Build new Markdown database file content
let newMd = `# KANNEM CRM - Local Contacts Database\n\n`;
newMd += `*This file is synced live with the KANNEM CRM web application. Edits made in the browser or directly in this file persist in real-time. Last audited: ${new Date().toISOString()}*\n\n`;
newMd += `\`\`\`csv\n`;
newMd += headers.map(escapeCSVField).join(',') + '\n';

updatedRows.forEach(row => {
    newMd += row.map(escapeCSVField).join(',') + '\n';
});

newMd += `\`\`\`\n`;

fs.writeFileSync('contacts_database.md', newMd, 'utf-8');
console.log(`Successfully updated ${updatedCount} contacts in contacts_database.md to role "Cold Lead - AI Scraped"!`);
