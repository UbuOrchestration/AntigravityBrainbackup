const fs = require('fs');
const path = require('path');

const DATABASE_MD_FILE = path.join(__dirname, 'contacts_database.md');
const AUDIT_HISTORY_FILE = path.join(__dirname, 'data_quality_audit_history.json');
const BACKUP_DIR = path.join('C:', 'Users', 'Ubu', '.gemini', 'antigravity', 'KANNEM CRM', 'Contacts');

// US State abbreviations to full names mapping for standardization
const STATE_MAP = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
    'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
    'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
    'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
    'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
    'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
    'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
    'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
    'DC': 'District of Columbia'
};

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
    return phone.trim();
}

function normalizeDigits(phone) {
    if (!phone) return '';
    let d = String(phone).replace(/\D/g, '');
    if (d.length === 11 && d.startsWith('1')) d = d.substring(1);
    return d;
}

function readContacts() {
    if (!fs.existsSync(DATABASE_MD_FILE)) return { headers: [], contacts: [] };
    const md = fs.readFileSync(DATABASE_MD_FILE, 'utf-8');
    const csvMatch = md.match(/```csv\r?\n([\s\S]*?)\r?\n```/);
    const csvText = csvMatch ? csvMatch[1] : md;
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) return { headers: [], contacts: [] };

    const headers = parseCSVLine(lines[0]).map(parseCSVField);
    const contacts = [];

    for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]).map(parseCSVField);
        if (row.length < 2) continue;

        contacts.push({
            id: row[0] || '',
            recordId: row[0] || '',
            firstName: row[1] || '',
            lastName: row[2] || '',
            name: `${row[1] || ''} ${row[2] || ''}`.trim() || 'Unnamed Contact',
            companyName: row[3] || '',
            position: row[4] || '',
            email: row[5] || '',
            phone: row[6] || '',
            stateRegion: row[7] || '',
            leadStatus: row[8] || 'No Contact Yet',
            associatedNote: row[9] || '',
            websiteUrl: row[10] || ''
        });
    }

    return { headers, contacts };
}

function runAudit() {
    const { contacts } = readContacts();
    const totalRecords = contacts.length;

    let missingEmail = 0;
    let missingPhone = 0;
    let missingWebsite = 0;
    let missingDecisionMaker = 0;
    let missingState = 0;
    let unformattedPhone = 0;
    let nonStandardState = 0;

    const propertyIssues = [];
    const sourceBreakdown = {
        'HubSpot CSV Migration': { total: 0, issues: 0 },
        'Florida Scrape Farm': { total: 0, issues: 0 },
        'Georgia Scrape Farm': { total: 0, issues: 0 },
        '50-State Scrape Farm': { total: 0, issues: 0 },
        'Cold Leads Enrichment': { total: 0, issues: 0 },
        'Manual / Other': { total: 0, issues: 0 }
    };

    function detectSource(c) {
        const note = (c.associatedNote || '').toLowerCase();
        if (note.includes('hubspot')) return 'HubSpot CSV Migration';
        if (note.includes('florida surveyors scrape')) return 'Florida Scrape Farm';
        if (note.includes('georgia surveyors scrape')) return 'Georgia Scrape Farm';
        if (c.id && (c.id.startsWith('rec_survey_') || c.id.startsWith('REC-'))) return '50-State Scrape Farm';
        if (note.includes('ai enriched') || note.includes('cold lead')) return 'Cold Leads Enrichment';
        return 'Manual / Other';
    }

    // Duplicate detection maps
    const phoneMap = new Map();
    const emailMap = new Map();
    const companyMap = new Map();
    const duplicatePairs = [];
    const duplicateIds = new Set();

    contacts.forEach(c => {
        const src = detectSource(c);
        if (!sourceBreakdown[src]) sourceBreakdown[src] = { total: 0, issues: 0 };
        sourceBreakdown[src].total++;

        let hasIssue = false;
        const issuesForContact = [];

        // Check Email
        if (!c.email || c.email.trim() === '' || c.email.includes('example.com')) {
            missingEmail++;
            issuesForContact.push('Missing Email');
            hasIssue = true;
        }

        // Check Phone
        if (!c.phone || c.phone.trim() === '') {
            missingPhone++;
            issuesForContact.push('Missing Phone');
            hasIssue = true;
        } else {
            // Check formatting
            const phoneRegex = /^\(\d{3}\) \d{3}-\d{4}$/;
            if (!phoneRegex.test(c.phone.trim())) {
                unformattedPhone++;
                issuesForContact.push('Unformatted Phone Number');
                hasIssue = true;
            }
        }

        // Check Website
        if (!c.websiteUrl || c.websiteUrl.trim() === '') {
            missingWebsite++;
            issuesForContact.push('Missing Website');
            hasIssue = true;
        }

        // Check Decision Maker / Name
        if (!c.name || c.name === 'Unnamed Contact' || c.name === 'N/A' || c.name.toLowerCase() === 'null') {
            missingDecisionMaker++;
            issuesForContact.push('Missing Decision Maker Name');
            hasIssue = true;
        }

        // Check State / Region
        if (!c.stateRegion || c.stateRegion.trim() === '') {
            missingState++;
            issuesForContact.push('Missing State/Region');
            hasIssue = true;
        } else {
            const upperState = c.stateRegion.trim().toUpperCase();
            if (STATE_MAP[upperState]) {
                nonStandardState++;
                issuesForContact.push(`Non-standard State Abbreviation (${c.stateRegion})`);
                hasIssue = true;
            }
        }

        if (hasIssue) {
            sourceBreakdown[src].issues++;
            propertyIssues.push({
                contactId: c.id,
                name: c.name,
                company: c.companyName,
                source: src,
                issues: issuesForContact
            });
        }

        // Check duplicates by normalized phone
        const pNorm = normalizeDigits(c.phone);
        if (pNorm && pNorm.length === 10) {
            if (phoneMap.has(pNorm)) {
                const existing = phoneMap.get(pNorm);
                duplicatePairs.push({
                    type: 'Matching Phone Number',
                    matchKey: c.phone,
                    original: existing,
                    duplicate: c
                });
                duplicateIds.add(c.id);
                duplicateIds.add(existing.id);
            } else {
                phoneMap.set(pNorm, c);
            }
        }

        // Check duplicates by email
        if (c.email && c.email.includes('@')) {
            const eNorm = c.email.trim().toLowerCase();
            if (emailMap.has(eNorm)) {
                const existing = emailMap.get(eNorm);
                if (existing.id !== c.id) {
                    duplicatePairs.push({
                        type: 'Matching Email Address',
                        matchKey: c.email,
                        original: existing,
                        duplicate: c
                    });
                    duplicateIds.add(c.id);
                    duplicateIds.add(existing.id);
                }
            } else {
                emailMap.set(eNorm, c);
            }
        }
    });

    // Compute Health Score (0-100)
    // Formula weighs: Missing critical fields (phone, email), duplicates, formatting
    let penalty = 0;
    if (totalRecords > 0) {
        penalty += (missingPhone / totalRecords) * 20;
        penalty += (missingEmail / totalRecords) * 15;
        penalty += (missingWebsite / totalRecords) * 10;
        penalty += (missingDecisionMaker / totalRecords) * 15;
        penalty += (missingState / totalRecords) * 10;
        penalty += (unformattedPhone / totalRecords) * 15;
        penalty += (nonStandardState / totalRecords) * 5;
        penalty += (duplicateIds.size / totalRecords) * 20;
    }
    const healthScore = Math.max(10, Math.min(100, Math.round(100 - penalty)));

    // Auto-Generated Recommendations
    const recommendations = [];

    if (unformattedPhone > 0) {
        recommendations.push({
            id: 'rec_phone_formatting',
            title: `Format ${unformattedPhone} Inconsistent Phone Numbers`,
            description: `Standardize all contact phone numbers to uniform (XXX) XXX-XXXX presentation standard.`,
            category: 'Data Formatting',
            impact: 'High',
            actionName: 'Format All Phone Numbers',
            affectedCount: unformattedPhone
        });
    }

    if (nonStandardState > 0) {
        recommendations.push({
            id: 'rec_state_standardization',
            title: `Standardize ${nonStandardState} 2-Letter State Abbreviations`,
            description: `Convert postal abbreviations (e.g. "FL", "GA", "TX") to full standardized state names ("Florida", "Georgia", "Texas").`,
            category: 'Data Standardization',
            impact: 'Medium',
            actionName: 'Standardize State Names',
            affectedCount: nonStandardState
        });
    }

    if (duplicatePairs.length > 0) {
        recommendations.push({
            id: 'rec_duplicate_merge',
            title: `Review and Consolidate ${duplicatePairs.length} Suspected Duplicate Contacts`,
            description: `Found ${duplicatePairs.length} pairs of records with matching phone numbers or emails. Merge into consolidated profiles.`,
            category: 'Duplicate Management',
            impact: 'High',
            actionName: 'Review Duplicates',
            affectedCount: duplicatePairs.length
        });
    }

    if (missingWebsite > 0) {
        recommendations.push({
            id: 'rec_website_enrichment',
            title: `Enrich ${missingWebsite} Contacts Missing Official Website`,
            description: `Flag contacts without verified corporate URLs for AI web search and domain discovery.`,
            category: 'Property Completeness',
            impact: 'Medium',
            actionName: 'Flag for Web Discovery',
            affectedCount: missingWebsite
        });
    }

    const auditSnapshot = {
        auditId: 'audit_' + Date.now(),
        auditDate: new Date().toISOString(),
        totalRecords,
        healthScore,
        healthRating: healthScore >= 90 ? 'Excellent' : healthScore >= 75 ? 'Good' : healthScore >= 60 ? 'Fair' : 'Needs Attention',
        metrics: {
            missingEmail,
            missingPhone,
            missingWebsite,
            missingDecisionMaker,
            missingState,
            unformattedPhone,
            nonStandardState,
            duplicateContactsCount: duplicateIds.size,
            duplicatePairsCount: duplicatePairs.length
        },
        duplicatePairs,
        sourceBreakdown,
        recommendations,
        issuesCount: propertyIssues.length,
        nextScheduledRun: 'Sunday at 1:00 PM EST (Weekly)'
    };

    // Save to audit history log
    let history = [];
    if (fs.existsSync(AUDIT_HISTORY_FILE)) {
        try {
            history = JSON.parse(fs.readFileSync(AUDIT_HISTORY_FILE, 'utf-8'));
        } catch (e) {
            history = [];
        }
    }
    history.unshift(auditSnapshot);
    // Keep last 25 audits
    if (history.length > 25) history = history.slice(0, 25);
    fs.writeFileSync(AUDIT_HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');

    // Backup latest audit snapshot
    try {
        if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
        fs.writeFileSync(path.join(BACKUP_DIR, 'data_quality_audit_latest.json'), JSON.stringify(auditSnapshot, null, 2), 'utf-8');
    } catch (e) {}

    return auditSnapshot;
}

// Auto-fix remediation actions
function applyResolution(actionId) {
    const { headers, contacts } = readContacts();
    let modified = 0;

    if (actionId === 'rec_phone_formatting' || actionId === 'all') {
        contacts.forEach(c => {
            const formatted = formatPhone(c.phone);
            if (formatted && formatted !== c.phone) {
                c.phone = formatted;
                modified++;
            }
        });
    }

    if (actionId === 'rec_state_standardization' || actionId === 'all') {
        contacts.forEach(c => {
            if (c.stateRegion) {
                const upper = c.stateRegion.trim().toUpperCase();
                if (STATE_MAP[upper]) {
                    c.stateRegion = STATE_MAP[upper];
                    modified++;
                }
            }
        });
    }

    // Write back to contacts_database.md
    let newMd = `# KANNEM CRM - Local Contacts Database\n\n`;
    newMd += `*This file is synced live with the KANNEM CRM web application. Edits made in the browser or directly in this file persist in real-time. Last audited: ${new Date().toISOString()}*\n\n`;
    newMd += `\`\`\`csv\n`;
    newMd += headers.map(escapeCSVField).join(',') + '\n';
    contacts.forEach(c => {
        const row = [
            c.id,
            c.firstName,
            c.lastName,
            c.companyName,
            c.position,
            c.email,
            c.phone,
            c.stateRegion,
            c.leadStatus,
            c.associatedNote,
            c.websiteUrl
        ];
        newMd += row.map(escapeCSVField).join(',') + '\n';
    });
    newMd += `\`\`\`\n`;

    fs.writeFileSync(DATABASE_MD_FILE, newMd, 'utf-8');

    // Run new audit snapshot immediately
    const newSnapshot = runAudit();
    return {
        success: true,
        actionId,
        modifiedCount: modified,
        newHealthScore: newSnapshot.healthScore,
        snapshot: newSnapshot
    };
}

// Merge duplicate contacts
function mergeDuplicates(keepId, removeId) {
    const { headers, contacts } = readContacts();
    const keepIdx = contacts.findIndex(c => String(c.id) === String(keepId));
    const removeIdx = contacts.findIndex(c => String(c.id) === String(removeId));

    if (keepIdx === -1 || removeIdx === -1) {
        return { success: false, error: 'One or both contact IDs not found.' };
    }

    const keeper = contacts[keepIdx];
    const removed = contacts[removeIdx];

    // Combine fields intelligently (fill missing fields from removed contact)
    keeper.email = keeper.email || removed.email;
    keeper.phone = keeper.phone || removed.phone;
    keeper.companyName = keeper.companyName || removed.companyName;
    keeper.position = keeper.position || removed.position;
    keeper.stateRegion = keeper.stateRegion || removed.stateRegion;
    keeper.websiteUrl = keeper.websiteUrl || removed.websiteUrl;
    keeper.associatedNote = `${keeper.associatedNote || ''} | [Merged with Record ${removed.id}] ${removed.associatedNote || ''}`.trim();

    // Remove the duplicate record
    contacts.splice(removeIdx, 1);

    // Save back to Markdown
    let newMd = `# KANNEM CRM - Local Contacts Database\n\n`;
    newMd += `*This file is synced live with the KANNEM CRM web application. Edits made in the browser or directly in this file persist in real-time. Last audited: ${new Date().toISOString()}*\n\n`;
    newMd += `\`\`\`csv\n`;
    newMd += headers.map(escapeCSVField).join(',') + '\n';
    contacts.forEach(c => {
        const row = [
            c.id,
            c.firstName,
            c.lastName,
            c.companyName,
            c.position,
            c.email,
            c.phone,
            c.stateRegion,
            c.leadStatus,
            c.associatedNote,
            c.websiteUrl
        ];
        newMd += row.map(escapeCSVField).join(',') + '\n';
    });
    newMd += `\`\`\`\n`;

    fs.writeFileSync(DATABASE_MD_FILE, newMd, 'utf-8');

    const newSnapshot = runAudit();
    return {
        success: true,
        keepId,
        removeId,
        remainingTotal: contacts.length,
        snapshot: newSnapshot
    };
}

module.exports = {
    runAudit,
    applyResolution,
    mergeDuplicates,
    readContacts,
    STATE_MAP
};

