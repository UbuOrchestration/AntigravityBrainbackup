const fs = require('fs');
const path = require('path');

const DATABASE_MD_FILE = path.join(__dirname, 'contacts_database.md');
const BATCHES_FILE = path.join(__dirname, 'ingestion_batches_database.json');
const BACKUP_DIR = path.join('C:', 'Users', 'Ubu', '.gemini', 'antigravity', 'KANNEM CRM', 'Contacts');

function parseCSVField(field) {
    if (!field) return '';
    let f = field.trim();
    if (f.startsWith('"') && f.endsWith('"')) {
        f = f.substring(1, f.length - 1).replace(/""/g, '"');
    }
    return f;
}

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

const floridaContacts = [
    {
        recordId: 'rec_fl_survey_01',
        firstName: 'Gary',
        lastName: 'Allen',
        companyName: 'Gary Allen Land Surveying',
        position: 'President',
        email: 'gary@garyallenlandsurveying.com',
        phone: '(850) 877-0541',
        stateRegion: 'Florida',
        leadStatus: 'Cold Lead - AI Scraped',
        associatedNote: '[Florida Surveyors Scrape] Tallahassee firm specializing in boundary & topographical surveys.',
        websiteUrl: 'https://garyallenlandsurveying.com'
    },
    {
        recordId: 'rec_fl_survey_02',
        firstName: 'Brandon',
        lastName: 'Lauster',
        companyName: 'Lauster Land Surveying LLC',
        position: 'Owner & President',
        email: 'brlauster@llsurvey.org',
        phone: '(727) 258-4147',
        stateRegion: 'Florida',
        leadStatus: 'Cold Lead - AI Scraped',
        associatedNote: '[Florida Surveyors Scrape] St. Petersburg firm specializing in boundary & elevation certificates.',
        websiteUrl: 'https://lausterlandsurvey.com'
    },
    {
        recordId: 'rec_fl_survey_03',
        firstName: 'David',
        lastName: 'Williams',
        companyName: 'GeoPoint Surveying, Inc.',
        position: 'President',
        email: 'info@geopointsurvey.com',
        phone: '(813) 248-8888',
        stateRegion: 'Florida',
        leadStatus: 'Cold Lead - AI Scraped',
        associatedNote: '[Florida Surveyors Scrape] Tampa full-service land surveying & geospatial mapping firm.',
        websiteUrl: 'https://geopointsurvey.com'
    },
    {
        recordId: 'rec_fl_survey_04',
        firstName: 'Martin',
        lastName: 'Britt',
        companyName: 'MSB Surveying, Inc.',
        position: 'Owner & President',
        email: 'msb@msbsurveying.com',
        phone: '(941) 341-9935',
        stateRegion: 'Florida',
        leadStatus: 'Cold Lead - AI Scraped',
        associatedNote: '[Florida Surveyors Scrape] Sarasota land surveying firm specializing in commercial & construction layout.',
        websiteUrl: 'https://msbsurveying.com'
    },
    {
        recordId: 'rec_fl_survey_05',
        firstName: 'David',
        lastName: 'York',
        companyName: 'Davris Inc.',
        position: 'President',
        email: 'info@davrisinc.com',
        phone: '(727) 848-1854',
        stateRegion: 'Florida',
        leadStatus: 'Cold Lead - AI Scraped',
        associatedNote: '[Florida Surveyors Scrape] New Port Richey surveying & engineering solutions firm.',
        websiteUrl: 'https://davrisinc.com'
    },
    {
        recordId: 'rec_fl_survey_06',
        firstName: 'Charles',
        lastName: 'Park',
        companyName: 'Park Coastal Surveying, LLC',
        position: 'President & Managing Partner',
        email: 'skip@parkcoastalsurveying.com',
        phone: '(941) 416-1611',
        stateRegion: 'Florida',
        leadStatus: 'Cold Lead - AI Scraped',
        associatedNote: '[Florida Surveyors Scrape] Palmetto land & hydrographic surveying firm.',
        websiteUrl: 'https://parkcoastalsurveying.com'
    },
    {
        recordId: 'rec_fl_survey_07',
        firstName: 'John',
        lastName: 'Webb',
        companyName: 'John B. Webb & Associates, Inc.',
        position: 'President',
        email: 'john.webb@webbengr.com',
        phone: '(407) 622-9322',
        stateRegion: 'Florida',
        leadStatus: 'Cold Lead - AI Scraped',
        associatedNote: '[Florida Surveyors Scrape] Winter Park land surveying and civil engineering firm.',
        websiteUrl: 'https://webbengr.com'
    },
    {
        recordId: 'rec_fl_survey_08',
        firstName: 'Target',
        lastName: 'Management',
        companyName: 'Target Surveying, LLC',
        position: 'Operations Manager',
        email: 'orders@targetsurveying.net',
        phone: '(561) 640-4800',
        stateRegion: 'Florida',
        leadStatus: 'Cold Lead - AI Scraped',
        associatedNote: '[Florida Surveyors Scrape] West Palm Beach boundary & ALTA survey specialist.',
        websiteUrl: 'https://targetsurveying.net'
    },
    {
        recordId: 'rec_fl_survey_09',
        firstName: 'Lee',
        lastName: 'Clymer',
        companyName: 'Clymer Farner Barley (CFB Inc.)',
        position: 'President',
        email: 'info@cfb-inc.com',
        phone: '(352) 748-3126',
        stateRegion: 'Florida',
        leadStatus: 'Cold Lead - AI Scraped',
        associatedNote: '[Florida Surveyors Scrape] Ocala & Central Florida land surveying and engineering firm.',
        websiteUrl: 'https://cfb-inc.com'
    },
    {
        recordId: 'rec_fl_survey_10',
        firstName: 'Murphy',
        lastName: 'Leadership',
        companyName: "Murphy's Land Surveying, Inc.",
        position: 'Owner',
        email: 'info@murphyslandsurveying.com',
        phone: '(727) 347-8740',
        stateRegion: 'Florida',
        leadStatus: 'Cold Lead - AI Scraped',
        associatedNote: "[Florida Surveyors Scrape] St. Petersburg residential & commercial surveying firm.",
        websiteUrl: 'https://murphyslandsurveying.com'
    },
    {
        recordId: 'rec_fl_survey_11',
        firstName: 'Madelin',
        lastName: 'Estrella',
        companyName: 'New Bearings Inc.',
        position: 'President, South Florida Division',
        email: 'madelin@surveyinflorida.com',
        phone: '(305) 362-7926',
        stateRegion: 'Florida',
        leadStatus: 'Cold Lead - AI Scraped',
        associatedNote: '[Florida Surveyors Scrape] Miami surveying firm providing ALTA & boundary surveys.',
        websiteUrl: 'http://www.surveyinflorida.com'
    },
    {
        recordId: 'rec_fl_survey_12',
        firstName: 'Abraham',
        lastName: 'Hadad',
        companyName: 'HADONNE',
        position: 'President',
        email: 'Frank.Paruas@HADONNE.com',
        phone: '(305) 266-1188',
        stateRegion: 'Florida',
        leadStatus: 'Cold Lead - AI Scraped',
        associatedNote: '[Florida Surveyors Scrape] Miami geospatial mapping and land surveying company.',
        websiteUrl: 'https://www.hadonne.com'
    },
    {
        recordId: 'rec_fl_survey_13',
        firstName: 'James',
        lastName: 'Stoner',
        companyName: 'Stoner & Associates, Inc.',
        position: 'President',
        email: 'jstoner@stonersurveyors.com',
        phone: '(954) 585-0997',
        stateRegion: 'Florida',
        leadStatus: 'Cold Lead - AI Scraped',
        associatedNote: '[Florida Surveyors Scrape] Fort Lauderdale commercial & infrastructure surveying firm.',
        websiteUrl: 'https://www.stonersurveyors.com'
    },
    {
        recordId: 'rec_fl_survey_14',
        firstName: 'Jerald',
        lastName: 'McLaughlin',
        companyName: 'Control Point Associates',
        position: 'Branch Manager & Principal',
        email: 'JMclaughlin@cpasurvey.com',
        phone: '(954) 763-7611',
        stateRegion: 'Florida',
        leadStatus: 'Cold Lead - AI Scraped',
        associatedNote: '[Florida Surveyors Scrape] Fort Lauderdale land surveying and 3D laser scanning firm.',
        websiteUrl: 'https://www.cpasurvey.com'
    },
    {
        recordId: 'rec_fl_survey_15',
        firstName: 'Wes',
        lastName: 'Cannady',
        companyName: 'River City Surveying',
        position: 'Owner & Principal Surveyor',
        email: 'info@rivercitysurveyors.com',
        phone: '(904) 675-9300',
        stateRegion: 'Florida',
        leadStatus: 'Cold Lead - AI Scraped',
        associatedNote: '[Florida Surveyors Scrape] Jacksonville professional land surveying firm.',
        websiteUrl: 'https://rivercitysurveyors.com'
    }
];

// Read existing Markdown file
let mdContent = fs.readFileSync(DATABASE_MD_FILE, 'utf-8');
const csvMatch = mdContent.match(/```csv\r?\n([\s\S]*?)\r?\n```/);
const csvText = csvMatch ? csvMatch[1] : mdContent;
const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);

const headers = parseCSVLine(lines[0]).map(h => parseCSVField(h));
const existingRows = [];
const existingIds = new Set();

for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]).map(f => parseCSVField(f));
    if (row.length < 2) continue;
    existingRows.push(row);
    existingIds.add(row[0]);
}

let addedCount = 0;
floridaContacts.forEach(c => {
    if (!existingIds.has(c.recordId)) {
        existingRows.push([
            c.recordId,
            c.firstName,
            c.lastName,
            c.companyName,
            c.position,
            c.email,
            formatPhone(c.phone),
            c.stateRegion,
            c.leadStatus,
            c.associatedNote,
            c.websiteUrl
        ]);
        addedCount++;
    }
});

// Write updated markdown
let newMd = `# KANNEM CRM - Local Contacts Database\n\n`;
newMd += `*This file is synced live with the KANNEM CRM web application. Edits made in the browser or directly in this file persist in real-time. Last audited: ${new Date().toISOString()}*\n\n`;
newMd += `\`\`\`csv\n`;
newMd += headers.map(escapeCSVField).join(',') + '\n';
existingRows.forEach(r => {
    newMd += r.map(escapeCSVField).join(',') + '\n';
});
newMd += `\`\`\`\n`;

fs.writeFileSync(DATABASE_MD_FILE, newMd, 'utf-8');
console.log(`✅ Appended ${addedCount} Florida land surveying contacts to contacts_database.md! Total contacts: ${existingRows.length}`);

// Update Ingestion Batches
let batches = [];
if (fs.existsSync(BATCHES_FILE)) {
    try {
        batches = JSON.parse(fs.readFileSync(BATCHES_FILE, 'utf-8'));
    } catch (e) {
        batches = [];
    }
}

const flBatch = {
    id: 'batch_fl_land_surveyors_scrape',
    title: 'Florida Small-to-Medium Land Surveyors Scrape Farm',
    date: new Date().toISOString().split('T')[0],
    source: 'AI Web Scraper & Registry Search',
    recordCount: addedCount,
    status: 'Completed',
    description: `AI web scrape farming ${addedCount} small-to-medium land surveying companies across Florida with decision maker info, emails, phones, and state set explicitly to Florida.`
};

// Remove existing batch with same ID if re-running
batches = batches.filter(b => b.id !== flBatch.id);
batches.unshift(flBatch);

fs.writeFileSync(BATCHES_FILE, JSON.stringify(batches, null, 2), 'utf-8');
console.log(`✅ Registered batch entry in ingestion_batches_database.json!`);

// Perform Backup
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}
const dateStr = new Date().toISOString().split('T')[0];
fs.writeFileSync(path.join(BACKUP_DIR, `contacts_backup_${dateStr}.md`), newMd, 'utf-8');
fs.writeFileSync(path.join(BACKUP_DIR, `contacts_latest_backup.md`), newMd, 'utf-8');
console.log(`💾 Disk backup synced to ${BACKUP_DIR}`);
