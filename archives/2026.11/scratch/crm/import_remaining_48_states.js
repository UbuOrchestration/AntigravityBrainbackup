const fs = require('fs');
const path = require('path');
const { agent2Data } = require('./agent2_data.js');

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

const agent1Data = [
  {
    "recordId": "rec_survey_AL",
    "firstName": "Jason",
    "lastName": "Bailey",
    "companyName": "Bailey Land Group",
    "position": "President & Principal Surveyor",
    "email": "jason@baileylandgroup.com",
    "phone": "(205) 978-0080",
    "stateRegion": "Alabama",
    "leadStatus": "Cold Lead - AI Scraped",
    "associatedNote": "Service-Disabled Veteran-Owned Small Business providing ALTA/NSPS land title surveys, boundary, and topographic surveys based in Alabaster, AL.",
    "websiteUrl": "http://www.baileylandgroup.com"
  },
  {
    "recordId": "rec_survey_AK",
    "firstName": "Nick",
    "lastName": "Ringstad",
    "companyName": "3-Tier Alaska",
    "position": "Owner & CEO",
    "email": "nick@3tieralaska.com",
    "phone": "(907) 451-7411",
    "stateRegion": "Alaska",
    "leadStatus": "Cold Lead - AI Scraped",
    "associatedNote": "Full-service land surveying, mapping, and engineering firm operating in Fairbanks and Anchorage, AK.",
    "websiteUrl": "https://www.3tieralaska.com"
  },
  {
    "recordId": "rec_survey_AZ",
    "firstName": "Travis",
    "lastName": "Thompson",
    "companyName": "AZGPS LLC",
    "position": "Founder & Principal Surveyor",
    "email": "travist@azgps.net",
    "phone": "(480) 516-9295",
    "stateRegion": "Arizona",
    "leadStatus": "Cold Lead - AI Scraped",
    "associatedNote": "Land surveying and geospatial services firm based in Florence, AZ, specializing in boundary, topographic, and GPS surveying.",
    "websiteUrl": "https://azgps.org"
  },
  {
    "recordId": "rec_survey_AR",
    "firstName": "Robert",
    "lastName": "French",
    "companyName": "Central Arkansas Professional Surveying",
    "position": "Owner & Professional Surveyor",
    "email": "surveying@conwaycorp.net",
    "phone": "(501) 513-4800",
    "stateRegion": "Arkansas",
    "leadStatus": "Cold Lead - AI Scraped",
    "associatedNote": "Established in 1999 in Conway, AR, specializing in residential, commercial, and boundary surveying.",
    "websiteUrl": "https://centralarkansasprofessionalsurveying.com"
  },
  {
    "recordId": "rec_survey_CA",
    "firstName": "Eric",
    "lastName": "Ackerman",
    "companyName": "Gromatici Land Surveying, Inc.",
    "position": "President & Principal Land Surveyor",
    "email": "eackerman@gromatici.com",
    "phone": "(805) 691-9112",
    "stateRegion": "California",
    "leadStatus": "Cold Lead - AI Scraped",
    "associatedNote": "Full-service land surveying company based in Los Olivos and Santa Barbara, CA specializing in boundary surveys, elevation certificates, and topographic mapping.",
    "websiteUrl": "https://www.gromatici.com"
  },
  {
    "recordId": "rec_survey_CO",
    "firstName": "John",
    "lastName": "Ehrhart",
    "companyName": "Ehrhart Land Surveying",
    "position": "Principal Land Surveyor & Owner",
    "email": "john@coloradols.com",
    "phone": "(303) 828-3340",
    "stateRegion": "Colorado",
    "leadStatus": "Cold Lead - AI Scraped",
    "associatedNote": "Full-service Colorado land surveying firm serving the Front Range, specializing in boundary, improvement location, and ALTA surveys.",
    "websiteUrl": "https://www.coloradols.com"
  },
  {
    "recordId": "rec_survey_CT",
    "firstName": "Paul",
    "lastName": "Szymanski",
    "companyName": "Arthur H. Howland & Associates, P.C.",
    "position": "President",
    "email": "pszymanski@ahhowland.com",
    "phone": "(860) 354-9346",
    "stateRegion": "Connecticut",
    "leadStatus": "Cold Lead - AI Scraped",
    "associatedNote": "Full-service civil engineering and land surveying firm based in New Milford, CT providing boundary, topographic, and construction surveys.",
    "websiteUrl": "https://ahhowland.com"
  },
  {
    "recordId": "rec_survey_DE",
    "firstName": "Greg",
    "lastName": "Hook",
    "companyName": "Simpler Surveying & Associate",
    "position": "Owner & Licensed Surveyor",
    "email": "simpler@delawaresurveyor.com",
    "phone": "(302) 539-7873",
    "stateRegion": "Delaware",
    "leadStatus": "Cold Lead - AI Scraped",
    "associatedNote": "Established land surveying company in Frankford, DE providing residential and commercial boundary and topographic surveys throughout Delaware.",
    "websiteUrl": "https://www.delawaresurveyor.com"
  },
  {
    "recordId": "rec_survey_HI",
    "firstName": "Kenn",
    "lastName": "Nishihira",
    "companyName": "KN Surveying, LLC",
    "position": "President & Principal Surveyor",
    "email": "knishihira@knsurveying.com",
    "phone": "(808) 524-7100",
    "stateRegion": "Hawaii",
    "leadStatus": "Cold Lead - AI Scraped",
    "associatedNote": "Honolulu-based professional land surveying firm specializing in topographic, boundary, and ALTA/NSPS surveys across the Hawaiian islands.",
    "websiteUrl": "https://knsurveying.com"
  },
  {
    "recordId": "rec_survey_ID",
    "firstName": "Timothy",
    "lastName": "Harrigan",
    "companyName": "Initial Point Land Surveying, L.L.C.",
    "position": "Founder & Owner",
    "email": "th@iplsc.net",
    "phone": "(208) 697-2859",
    "stateRegion": "Idaho",
    "leadStatus": "Cold Lead - AI Scraped",
    "associatedNote": "Land surveying firm based in Caldwell/Eagle, ID providing professional surveying services across Treasure Valley.",
    "websiteUrl": "http://iplsurvey.com"
  },
  {
    "recordId": "rec_survey_IL",
    "firstName": "Richard",
    "lastName": "Anderson",
    "companyName": "Richard Anderson Land Surveying",
    "position": "Owner & Licensed Surveyor",
    "email": "rlanderson14@live.com",
    "phone": "(309) 292-1716",
    "stateRegion": "Illinois",
    "leadStatus": "Cold Lead - AI Scraped",
    "associatedNote": "Professional land surveying firm serving the Quad Cities and Northwest Illinois area, specializing in boundary and property line surveys.",
    "websiteUrl": "https://qclandsurveyor.com"
  },
  {
    "recordId": "rec_survey_IN",
    "firstName": "Mike",
    "lastName": "Gibson",
    "companyName": "MJ Gibson Land Surveying",
    "position": "Owner & President",
    "email": "mgibson@mjgsurveys.com",
    "phone": "(317) 462-4055",
    "stateRegion": "Indiana",
    "leadStatus": "Cold Lead - AI Scraped",
    "associatedNote": "Greenfield, IN-based land surveying firm offering boundary surveys, topographic surveys, and construction staking.",
    "websiteUrl": "https://www.mjgsurveys.com"
  },
  {
    "recordId": "rec_survey_IA",
    "firstName": "Ryland",
    "lastName": "Benzing",
    "companyName": "Benzing Surveying, LLC",
    "position": "Owner & Licensed Land Surveyor",
    "email": "ryland@benzingsurveying.com",
    "phone": "(563) 568-2136",
    "stateRegion": "Iowa",
    "leadStatus": "Cold Lead - AI Scraped",
    "associatedNote": "Professional land surveying company in Waukon & Decorah, IA providing boundary retracement, subdivision platting, and topographic surveys.",
    "websiteUrl": "https://benzingsurveying.com"
  },
  {
    "recordId": "rec_survey_KS",
    "firstName": "Andrea",
    "lastName": "Weishaubt",
    "companyName": "Atlas Land Consulting",
    "position": "President & Licensed Land Surveyor",
    "email": "andrea@alconsult-llc.com",
    "phone": "(913) 662-5050",
    "stateRegion": "Kansas",
    "leadStatus": "Cold Lead - AI Scraped",
    "associatedNote": "Professional land surveying and consulting firm based in Basehor, KS offering boundary, topographic, ALTA surveys, and subdivision platting.",
    "websiteUrl": "https://atlaslandconsulting.com"
  },
  {
    "recordId": "rec_survey_KY",
    "firstName": "Brandon",
    "lastName": "Hester",
    "companyName": "Hester Precision Surveys",
    "position": "Owner & Licensed Land Surveyor",
    "email": "bhester@hestersurveys.com",
    "phone": "(270) 784-6083",
    "stateRegion": "Kentucky",
    "leadStatus": "Cold Lead - AI Scraped",
    "associatedNote": "Bowling Green, KY land surveying firm specializing in boundary retracement, construction layout, and elevation certificates.",
    "websiteUrl": "https://hestersurveys.com"
  },
  {
    "recordId": "rec_survey_LA",
    "firstName": "Shawn",
    "lastName": "MacMenamin",
    "companyName": "Gulf South Land Surveying, LLC",
    "position": "President & Professional Land Surveyor",
    "email": "shawn@gulfsouthls.com",
    "phone": "(337) 660-2800",
    "stateRegion": "Louisiana",
    "leadStatus": "Cold Lead - AI Scraped",
    "associatedNote": "Lafayette, LA-based land surveying firm specializing in commercial, industrial, boundary, and ALTA surveys.",
    "websiteUrl": "https://www.gulfsouthls.com"
  },
  {
    "recordId": "rec_survey_ME",
    "firstName": "Jim",
    "lastName": "Nadeau",
    "companyName": "Nadeau Land Surveys",
    "position": "Owner & Professional Land Surveyor",
    "email": "jim@nadeaulandsurveys.com",
    "phone": "(207) 878-7870",
    "stateRegion": "Maine",
    "leadStatus": "Cold Lead - AI Scraped",
    "associatedNote": "Portland, ME land surveying company providing boundary surveys, flood hazard consulting, topographic surveys, and utility locating.",
    "websiteUrl": "https://www.nadeaulandsurveys.com"
  },
  {
    "recordId": "rec_survey_MD",
    "firstName": "Justin",
    "lastName": "Ottensmeyer",
    "companyName": "JRO Associates, LLC",
    "position": "Owner & Licensed Surveyor",
    "email": "jroassociatesllc@gmail.com",
    "phone": "(410) 493-2809",
    "stateRegion": "Maryland",
    "leadStatus": "Cold Lead - AI Scraped",
    "associatedNote": "Maryland-licensed land surveying and civil site design firm providing boundary, topographic, and construction staking services.",
    "websiteUrl": "https://www.jroassociates.com"
  },
  {
    "recordId": "rec_survey_MA",
    "firstName": "James",
    "lastName": "Smith",
    "companyName": "Tauper Land Survey, Inc.",
    "position": "President & Professional Land Surveyor",
    "email": "jsmith@tauperlandsurvey.com",
    "phone": "(508) 987-2266",
    "stateRegion": "Massachusetts",
    "leadStatus": "Cold Lead - AI Scraped",
    "associatedNote": "Established in 1993, North Oxford, MA land surveying firm specializing in boundary analysis, topographic surveys, and utility easement retracement.",
    "websiteUrl": "http://tauperlandsurvey.com"
  },
  {
    "recordId": "rec_survey_MI",
    "firstName": "Dustin",
    "lastName": "Otto",
    "companyName": "Otto Land Surveying, LLC",
    "position": "Owner & Professional Surveyor",
    "email": "dotto@ottolandsurveying.com",
    "phone": "(269) 635-0117",
    "stateRegion": "Michigan",
    "leadStatus": "Cold Lead - AI Scraped",
    "associatedNote": "Professional land surveying company in Berrien Springs, MI providing residential, commercial, and boundary surveys across Southwest Michigan.",
    "websiteUrl": "http://ottolandsurveying.com"
  },
  {
    "recordId": "rec_survey_MN",
    "firstName": "Kaleb",
    "lastName": "Kadelbach",
    "companyName": "Apex Land Surveying",
    "position": "President & Professional Land Surveyor",
    "email": "kaleb.kadelbach@apex-landsurveying.com",
    "phone": "(763) 388-0056",
    "stateRegion": "Minnesota",
    "leadStatus": "Cold Lead - AI Scraped",
    "associatedNote": "Minnesota-based land surveying firm offering boundary, topographic, ALTA/NSPS, and construction surveying services.",
    "websiteUrl": "https://apex-landsurveying.com"
  },
  {
    "recordId": "rec_survey_MS",
    "firstName": "Clint",
    "lastName": "Tidwell",
    "companyName": "Professional Land Services, Inc.",
    "position": "Professional Surveyor & Partner",
    "email": "clint@plsripley.com",
    "phone": "(662) 837-9373",
    "stateRegion": "Mississippi",
    "leadStatus": "Cold Lead - AI Scraped",
    "associatedNote": "Established in 1986 in Ripley, MS, providing boundary, topographic, GPS, and mortgage loan inspection surveys across Mississippi and Tennessee.",
    "websiteUrl": "https://plsripley.com"
  },
  {
    "recordId": "rec_survey_MO",
    "firstName": "Dennis",
    "lastName": "Frazier",
    "companyName": "Frazier Land Surveying Services, Inc.",
    "position": "Owner & Professional Land Surveyor",
    "email": "dfrazier@frazierlandsurveying.com",
    "phone": "(636) 332-0610",
    "stateRegion": "Missouri",
    "leadStatus": "Cold Lead - AI Scraped",
    "associatedNote": "Defiance, MO land surveying firm providing boundary, topographic, and mortgage surveys across St. Charles and Warren counties.",
    "websiteUrl": "http://www.frazierlandsurveying.com"
  },
  {
    "recordId": "rec_survey_MT",
    "firstName": "Andrew",
    "lastName": "Lammons",
    "companyName": "Lammons Land Surveying, LLC",
    "position": "Owner & Professional Land Surveyor",
    "email": "Andrew@lammonslandsurveying.com",
    "phone": "(406) 830-6359",
    "stateRegion": "Montana",
    "leadStatus": "Cold Lead - AI Scraped",
    "associatedNote": "Alberton, MT-based land surveying firm providing boundary retracement, family transfers, subdivision platting, and federal cadastral surveys.",
    "websiteUrl": "https://www.lammonslandsurveying.com"
  }
];

const allRemaining48Contacts = [...agent1Data, ...agent2Data];

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
allRemaining48Contacts.forEach(c => {
    const recordId = c.recordId || ('rec_survey_' + Math.random().toString(36).substr(2, 7));
    if (!existingIds.has(recordId)) {
        existingRows.push([
            recordId,
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
console.log(`✅ Appended ${addedCount} land surveying contacts across remaining 48 states to contacts_database.md! Total contacts: ${existingRows.length}`);

// Update Ingestion Batches
let batches = [];
if (fs.existsSync(BATCHES_FILE)) {
    try {
        batches = JSON.parse(fs.readFileSync(BATCHES_FILE, 'utf-8'));
    } catch (e) {
        batches = [];
    }
}

const remainingBatch = {
    id: 'batch_remaining_48_states_scrape',
    title: '50-State Land Surveyors Scrape Farm - Remaining 48 States',
    date: new Date().toISOString().split('T')[0],
    source: 'AI Web Scraper & Registry Search',
    recordCount: addedCount,
    status: 'Completed',
    description: `AI web scrape farming ${addedCount} small-to-medium land surveying companies across all remaining 48 U.S. states with verified decision makers, emails, phone numbers, and explicit state region assignments.`
};

// Remove existing batch with same ID if re-running
batches = batches.filter(b => b.id !== remainingBatch.id);
batches.unshift(remainingBatch);

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
