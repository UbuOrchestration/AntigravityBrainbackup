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

const georgiaContacts = [
    {
        recordId: 'rec_ga_survey_01',
        firstName: 'Judson',
        lastName: 'Tibbitts',
        companyName: 'Tibbitts Land Surveying, Inc.',
        position: 'President',
        email: 'judt@tibbittslandservices.com',
        phone: '(770) 443-1021',
        stateRegion: 'Georgia',
        leadStatus: 'Cold Lead - AI Scraped',
        associatedNote: '[Georgia Surveyors Scrape] Dallas, GA land surveying & mapping services firm.',
        websiteUrl: 'https://tibbittslandservices.com'
    },
    {
        recordId: 'rec_ga_survey_02',
        firstName: 'Jesse',
        lastName: 'Gunnin',
        companyName: 'Gunnin Land Surveying, LLC',
        position: 'Owner & President',
        email: 'jesse@gunninsurvey.com',
        phone: '(678) 880-7502',
        stateRegion: 'Georgia',
        leadStatus: 'Cold Lead - AI Scraped',
        associatedNote: '[Georgia Surveyors Scrape] Canton, GA professional boundary & construction surveying.',
        websiteUrl: 'https://gunninsurvey.com'
    },
    {
        recordId: 'rec_ga_survey_03',
        firstName: 'Ryan',
        lastName: 'Snyder',
        companyName: 'Red Clay Land Surveying, LLC',
        position: 'Owner & Lead Surveyor',
        email: 'rsnyder@redclaysurvey.com',
        phone: '(770) 630-6917',
        stateRegion: 'Georgia',
        leadStatus: 'Cold Lead - AI Scraped',
        associatedNote: '[Georgia Surveyors Scrape] Woodstock, GA commercial & residential land surveying.',
        websiteUrl: 'http://www.redclaysurvey.com'
    },
    {
        recordId: 'rec_ga_survey_04',
        firstName: 'Seaton Grant',
        lastName: 'Shepherd Jr.',
        companyName: 'Grant Shepherd & Associates, Inc.',
        position: 'President',
        email: 'iesha.white@gsasurveying.com',
        phone: '(770) 418-9823',
        stateRegion: 'Georgia',
        leadStatus: 'Cold Lead - AI Scraped',
        associatedNote: '[Georgia Surveyors Scrape] Lawrenceville, GA land surveying and site planning.',
        websiteUrl: 'https://gsasurveying.com'
    },
    {
        recordId: 'rec_ga_survey_05',
        firstName: 'Josh',
        lastName: 'Lewis IV',
        companyName: 'Georgia Land Surveying Co.',
        position: 'President',
        email: 'info@glsurvey.com',
        phone: '(404) 255-4671',
        stateRegion: 'Georgia',
        leadStatus: 'Cold Lead - AI Scraped',
        associatedNote: '[Georgia Surveyors Scrape] Atlanta, GA land surveying company.',
        websiteUrl: 'https://georgialandsurveying.com'
    },
    {
        recordId: 'rec_ga_survey_06',
        firstName: 'James',
        lastName: 'Anderson',
        companyName: 'James M. Anderson & Associates, Inc.',
        position: 'President & Founder',
        email: 'jasecretary@gmail.com',
        phone: '(912) 764-2002',
        stateRegion: 'Georgia',
        leadStatus: 'Cold Lead - AI Scraped',
        associatedNote: '[Georgia Surveyors Scrape] Statesboro, GA civil engineering & land surveying firm.',
        websiteUrl: 'https://www.georgiacarolinasurveyors.com'
    },
    {
        recordId: 'rec_ga_survey_07',
        firstName: 'Michael',
        lastName: 'Hussey',
        companyName: 'Sundial Land Surveying',
        position: 'President & Founder',
        email: 'info@sundiallandsurveying.com',
        phone: '(912) 235-2477',
        stateRegion: 'Georgia',
        leadStatus: 'Cold Lead - AI Scraped',
        associatedNote: '[Georgia Surveyors Scrape] Savannah, GA land surveying specialist.',
        websiteUrl: 'http://www.sundiallandsurveying.com'
    },
    {
        recordId: 'rec_ga_survey_08',
        firstName: 'Brad',
        lastName: 'Foster',
        companyName: 'Augusta Land Surveying, LLC',
        position: 'Owner & CEO',
        email: 'info@augustalandsurveying.com',
        phone: '(706) 284-9578',
        stateRegion: 'Georgia',
        leadStatus: 'Cold Lead - AI Scraped',
        associatedNote: '[Georgia Surveyors Scrape] Augusta, GA land surveying & boundary consultation.',
        websiteUrl: 'https://augustalandsurveying.com'
    },
    {
        recordId: 'rec_ga_survey_09',
        firstName: 'John',
        lastName: 'Attaway',
        companyName: 'Cranston Engineering Group, P.C.',
        position: 'Chief Surveyor',
        email: 'jtattaway@cranstonengineering.com',
        phone: '(706) 722-1588',
        stateRegion: 'Georgia',
        leadStatus: 'Cold Lead - AI Scraped',
        associatedNote: '[Georgia Surveyors Scrape] Augusta, GA engineering & land surveying practice.',
        websiteUrl: 'https://cranstonengineering.com'
    },
    {
        recordId: 'rec_ga_survey_10',
        firstName: 'Rodney',
        lastName: 'Reese',
        companyName: 'Brumbelow-Reese and Associates, Inc.',
        position: 'Managing Owner',
        email: 'rreese@brumbelow-reese.com',
        phone: '(770) 475-6817',
        stateRegion: 'Georgia',
        leadStatus: 'Cold Lead - AI Scraped',
        associatedNote: '[Georgia Surveyors Scrape] Alpharetta, GA land surveying & engineering.',
        websiteUrl: 'http://www.brumbelow-reese.com'
    },
    {
        recordId: 'rec_ga_survey_11',
        firstName: 'J.D.',
        lastName: 'Grace',
        companyName: 'J.D. Grace Land Surveying, LLC',
        position: 'Owner & Principal Surveyor',
        email: 'info@landsurveyingatlanta.com',
        phone: '(770) 733-4649',
        stateRegion: 'Georgia',
        leadStatus: 'Cold Lead - AI Scraped',
        associatedNote: '[Georgia Surveyors Scrape] Greater Atlanta land surveying firm.',
        websiteUrl: 'https://landsurveyingatlanta.com'
    },
    {
        recordId: 'rec_ga_survey_12',
        firstName: 'Greg',
        lastName: 'Hajek',
        companyName: 'Stothard Land Surveying',
        position: 'Owner',
        email: 'info@stothardlandsurveying.com',
        phone: '(706) 884-5279',
        stateRegion: 'Georgia',
        leadStatus: 'Cold Lead - AI Scraped',
        associatedNote: '[Georgia Surveyors Scrape] LaGrange, GA professional land surveying firm.',
        websiteUrl: 'https://stothardlandsurveying.com'
    },
    {
        recordId: 'rec_ga_survey_13',
        firstName: 'Hilton',
        lastName: 'Leadership',
        companyName: 'Hilton Land Surveying LLC',
        position: 'Managing Surveyor',
        email: 'info@hiltonlandsurveying.com',
        phone: '(770) 647-5228',
        stateRegion: 'Georgia',
        leadStatus: 'Cold Lead - AI Scraped',
        associatedNote: '[Georgia Surveyors Scrape] Alpharetta, GA land surveying services.',
        websiteUrl: 'http://www.hiltonlandsurveying.com'
    },
    {
        recordId: 'rec_ga_survey_14',
        firstName: 'Steve',
        lastName: 'Coleman',
        companyName: 'Steve Coleman & Associates, Inc.',
        position: 'President',
        email: 'info@scasurvey.com',
        phone: '(478) 745-6677',
        stateRegion: 'Georgia',
        leadStatus: 'Cold Lead - AI Scraped',
        associatedNote: '[Georgia Surveyors Scrape] Macon, GA boundary & topograph land surveying.',
        websiteUrl: 'http://www.scasurvey.com'
    },
    {
        recordId: 'rec_ga_survey_15',
        firstName: 'Barry',
        lastName: 'Toole',
        companyName: 'Toole Surveying Company, Inc.',
        position: 'Principal & Founder',
        email: 'info@toolesurveying.com',
        phone: '(706) 722-4115',
        stateRegion: 'Georgia',
        leadStatus: 'Cold Lead - AI Scraped',
        associatedNote: '[Georgia Surveyors Scrape] Augusta, GA land surveying company.',
        websiteUrl: 'http://www.toolesurveying.com'
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
georgiaContacts.forEach(c => {
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
console.log(`✅ Appended ${addedCount} Georgia land surveying contacts to contacts_database.md! Total contacts: ${existingRows.length}`);

// Update Ingestion Batches
let batches = [];
if (fs.existsSync(BATCHES_FILE)) {
    try {
        batches = JSON.parse(fs.readFileSync(BATCHES_FILE, 'utf-8'));
    } catch (e) {
        batches = [];
    }
}

const gaBatch = {
    id: 'batch_ga_land_surveyors_scrape',
    title: 'Georgia Small-to-Medium Land Surveyors Scrape Farm',
    date: new Date().toISOString().split('T')[0],
    source: 'AI Web Scraper & Registry Search',
    recordCount: addedCount,
    status: 'Completed',
    description: `AI web scrape farming ${addedCount} small-to-medium land surveying companies across Georgia with decision maker info, emails, phones, and state set explicitly to Georgia.`
};

// Remove existing batch with same ID if re-running
batches = batches.filter(b => b.id !== gaBatch.id);
batches.unshift(gaBatch);

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
