const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const DATABASE_MD_FILE = path.join(__dirname, 'contacts_database.md');

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
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

function parseCSVField(field) {
    if (!field) return '';
    let f = field.trim();
    if (f.startsWith('"') && f.endsWith('"')) {
        f = f.substring(1, f.length - 1).replace(/""/g, '"');
    }
    return f;
}

const md = fs.readFileSync(DATABASE_MD_FILE, 'utf-8');
const csvMatch = md.match(/```csv\r?\n([\s\S]*?)\r?\n```/);
const csvText = csvMatch ? csvMatch[1] : md;
const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);

const contacts = [];
for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]).map(parseCSVField);
    if (row.length < 11) continue;
    const leadStatus = row[8];
    const websiteUrl = row[10];
    if (websiteUrl && websiteUrl.startsWith('http')) {
        contacts.push({
            id: row[0],
            name: `${row[1]} ${row[2]}`.trim(),
            company: row[3],
            position: row[4],
            email: row[5],
            phone: row[6],
            state: row[7],
            leadStatus: leadStatus,
            website: websiteUrl
        });
    }
}

console.log(`Analyzing websites for ${contacts.length} CRM contacts...`);

function fetchUrl(targetUrl, timeoutMs = 6000) {
    return new Promise((resolve) => {
        try {
            const urlObj = new URL(targetUrl);
            const client = urlObj.protocol === 'https:' ? https : http;
            const req = client.get(targetUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                timeout: timeoutMs
            }, (res) => {
                let data = '';
                // Handle redirects
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    let redirectUrl = res.headers.location;
                    if (!redirectUrl.startsWith('http')) {
                        redirectUrl = new URL(redirectUrl, targetUrl).toString();
                    }
                    fetchUrl(redirectUrl, timeoutMs).then(resolve);
                    return;
                }
                res.on('data', chunk => data += chunk.toString());
                res.on('end', () => resolve({ status: res.statusCode, body: data }));
            });
            req.on('error', (err) => resolve({ error: err.message }));
            req.on('timeout', () => { req.destroy(); resolve({ error: 'timeout' }); });
        } catch (e) {
            resolve({ error: e.message });
        }
    });
}

async function runCheck() {
    const hiringContacts = [];

    for (let i = 0; i < contacts.length; i++) {
        const c = contacts[i];
        console.log(`[${i + 1}/${contacts.length}] Checking ${c.company} (${c.website})...`);

        let res = await fetchUrl(c.website);
        let bodyText = (res.body || '').toLowerCase();

        // Check if there's a careers or hiring link
        let careersUrl = null;
        if (bodyText) {
            const match = bodyText.match(/href=["']([^"']*(?:career|job|hiring|employment|join-our-team|opportunity)[^"']*)["']/i);
            if (match) {
                let rawLink = match[1];
                if (!rawLink.startsWith('http')) {
                    try {
                        careersUrl = new URL(rawLink, c.website).toString();
                    } catch (e) {}
                } else {
                    careersUrl = rawLink;
                }
            }
        }

        let careersBody = '';
        if (careersUrl) {
            const res2 = await fetchUrl(careersUrl);
            careersBody = (res2.body || '').toLowerCase();
        }

        const combinedText = bodyText + ' ' + careersBody;

        const hasCad = combinedText.includes('cad') || combinedText.includes('drafter') || combinedText.includes('drafting') || combinedText.includes('civil 3d') || combinedText.includes('carlson') || combinedText.includes('autocad');
        const hasHiring = combinedText.includes('hiring') || combinedText.includes('careers') || combinedText.includes('join our team') || combinedText.includes('open position') || combinedText.includes('employment') || combinedText.includes('job opening') || combinedText.includes('apply now');

        if (hasCad && hasHiring) {
            let matchedKeywords = [];
            if (combinedText.includes('cad technician') || combinedText.includes('cad tech')) matchedKeywords.push('CAD Technician');
            if (combinedText.includes('drafter') || combinedText.includes('draftsperson')) matchedKeywords.push('Drafter');
            if (combinedText.includes('civil 3d')) matchedKeywords.push('Civil 3D');
            if (combinedText.includes('autocad')) matchedKeywords.push('AutoCAD');
            if (combinedText.includes('carlson')) matchedKeywords.push('Carlson');

            hiringContacts.push({
                ...c,
                careersUrl: careersUrl || c.website,
                keywords: matchedKeywords.length > 0 ? matchedKeywords.join(', ') : 'CAD / Drafting / Hiring',
                details: 'Actively features hiring / careers page referencing CAD drafting or technical survey support.'
            });
            console.log(`  🔥 MATCH FOUND: ${c.company} is hiring CAD help!`);
        }
    }

    fs.writeFileSync('cad_hiring_results.json', JSON.stringify(hiringContacts, null, 2), 'utf-8');
    console.log(`\nAnalysis completed! Found ${hiringContacts.length} contacts hiring CAD help. Saved to cad_hiring_results.json`);
}

runCheck();
