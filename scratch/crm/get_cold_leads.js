const fs = require('fs');
const md = fs.readFileSync('contacts_database.md', 'utf-8');

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

const csvMatch = md.match(/```csv\r?\n([\s\S]*?)\r?\n```/);
const csvText = csvMatch ? csvMatch[1] : md;
const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);

const coldLeads = [];
for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]).map(f => {
        let clean = f.trim();
        if (clean.startsWith('"') && clean.endsWith('"')) {
            clean = clean.substring(1, clean.length - 1).replace(/""/g, '"');
        }
        return clean;
    });
    if (row[8] === 'Cold Lead') {
        coldLeads.push({
            id: row[0],
            originalName: `${row[1]} ${row[2]}`.trim(),
            companyName: row[3],
            position: row[4],
            email: row[5],
            phone: row[6],
            stateRegion: row[7],
            associatedNote: row[9],
            websiteUrl: row[10]
        });
    }
}

fs.writeFileSync('cold_leads_raw.json', JSON.stringify(coldLeads, null, 2));
console.log(`Saved ${coldLeads.length} Cold Leads to cold_leads_raw.json`);
