const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const CHAT_FILE = path.join(__dirname, 'agent_requests.json');
const DATABASE_MD_FILE = path.join(__dirname, 'contacts_database.md');
const ACTIVITIES_FILE = path.join(__dirname, 'activities_database.json');

// Helper to ensure JSON database files exist
if (!fs.existsSync(CHAT_FILE)) {
    fs.writeFileSync(CHAT_FILE, JSON.stringify([]), 'utf-8');
}
if (!fs.existsSync(ACTIVITIES_FILE)) {
    fs.writeFileSync(ACTIVITIES_FILE, JSON.stringify([]), 'utf-8');
}

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

function parseContactsFromMarkdown(mdContent) {
    const csvMatch = mdContent.match(/```csv\r?\n([\s\S]*?)\r?\n```/);
    const csvText = csvMatch ? csvMatch[1] : mdContent;
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) return [];

    const headers = parseCSVLine(lines[0]).map(h => parseCSVField(h));
    const contacts = [];

    for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]).map(h => parseCSVField(h));
        if (row.length < 2) continue;

        const recordId = row[0] || ('rec_' + Math.random().toString(36).substr(2, 9));
        const firstName = row[1] || '';
        const lastName = row[2] || '';
        const name = (firstName + ' ' + lastName).trim() || 'Unnamed Contact';
        const businessName = row[3] || '';
        const position = row[4] || '';
        const email = row[5] || '';
        const phone = row[6] || '';
        const stateRegion = row[7] || '';
        const leadStatus = row[8] || 'No Contact Yet';
        const associatedNote = row[9] || '';
        const websiteUrl = row[10] || '';

        contacts.push({
            id: recordId,
            recordId: recordId,
            firstName: firstName,
            lastName: lastName,
            name: name,
            businessName: businessName,
            companyName: businessName,
            position: position,
            email: email,
            phone: phone,
            stateRegion: stateRegion,
            address: stateRegion,
            leadStatus: leadStatus,
            stage: leadStatus,
            associatedNote: associatedNote,
            websiteUrl: websiteUrl,
            value: 0,
            isPresentation: false
        });
    }
    return contacts;
}

function formatContactsToMarkdown(contacts) {
    const headers = [
        'Record ID',
        'First Name',
        'Last Name',
        'Company Name',
        'Position',
        'Email',
        'Phone Number',
        'State/Region',
        'Lead Status',
        'Associated Note',
        'Website URL'
    ];

    function escapeCSVField(str) {
        if (str === null || str === undefined) return '""';
        const clean = String(str).replace(/"/g, '""').replace(/\r?\n/g, ' ');
        return `"${clean}"`;
    }

    let mdContent = `# KANNEM CRM - Local Contacts Database\n\n`;
    mdContent += `*This file is synced live with the KANNEM CRM web application. Edits made in the browser or directly in this file persist in real-time. Last audited: ${new Date().toISOString()}*\n\n`;
    mdContent += `\`\`\`csv\n`;
    mdContent += headers.map(escapeCSVField).join(',') + '\n';

    (contacts || []).forEach(c => {
        const row = [
            c.recordId || c.id || '',
            c.firstName || (c.name ? c.name.split(' ')[0] : ''),
            c.lastName || (c.name ? c.name.split(' ').slice(1).join(' ') : ''),
            c.businessName || c.companyName || '',
            c.position || '',
            c.email || '',
            c.phone || '',
            c.stateRegion || c.address || '',
            c.leadStatus || c.stage || 'No Contact Yet',
            c.associatedNote || (c.notes && c.notes.length > 0 ? c.notes[c.notes.length - 1].text : ''),
            c.websiteUrl || ''
        ];
        mdContent += row.map(escapeCSVField).join(',') + '\n';
    });

    mdContent += `\`\`\`\n`;
    return mdContent;
}

function safeParseJSON(bodyStr) {
    if (!bodyStr || typeof bodyStr !== 'string') return null;
    const clean = bodyStr.trim();
    if (!clean) return null;
    try {
        return JSON.parse(clean);
    } catch (e) {
        try {
            return JSON.parse(JSON.parse(clean));
        } catch (e2) {
            console.error('Failed to parse JSON body payload:', e2.message, 'Body snippet:', clean.substring(0, 100));
            return null;
        }
    }
}

const server = http.createServer((req, res) => {
    // Set CORS and strict anti-caching headers for cross-origin and real-time disk sync
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // API endpoint handling
    const reqUrl = req.url ? req.url.split('?')[0] : '';

    if (reqUrl === '/api/contacts') {
        if (req.method === 'GET') {
            fs.readFile(DATABASE_MD_FILE, 'utf-8', (err, data) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to read contacts database file' }));
                } else {
                    const contacts = parseContactsFromMarkdown(data);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(contacts));
                }
            });
            return;
        }

        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => {
                const contacts = safeParseJSON(body);
                if (!Array.isArray(contacts)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Expected array of contacts' }));
                    return;
                }
                try {
                    const mdContent = formatContactsToMarkdown(contacts);
                    fs.writeFileSync(DATABASE_MD_FILE, mdContent, 'utf-8');
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, count: contacts.length }));
                } catch (e) {
                    console.error('Error writing contacts_database.md:', e);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to write markdown database file' }));
                }
            });
            return;
        }
    }

    if (reqUrl === '/api/activities') {
        if (req.method === 'GET') {
            fs.readFile(ACTIVITIES_FILE, 'utf-8', (err, data) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to read activities file' }));
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(data || '[]');
                }
            });
            return;
        }

        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => {
                const activities = safeParseJSON(body);
                if (!Array.isArray(activities)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Expected array of activities' }));
                    return;
                }
                try {
                    fs.writeFileSync(ACTIVITIES_FILE, JSON.stringify(activities, null, 2), 'utf-8');
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, count: activities.length }));
                } catch (e) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to write activities file' }));
                }
            });
            return;
        }
    }

    if (reqUrl === '/api/tasks') {
        const TASKS_FILE = path.join(__dirname, 'tasks_database.json');
        if (req.method === 'GET') {
            fs.readFile(TASKS_FILE, 'utf-8', (err, data) => {
                if (err) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end('[]');
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(data || '[]');
                }
            });
            return;
        }

        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => {
                const tasks = safeParseJSON(body);
                if (!Array.isArray(tasks)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Expected array of tasks' }));
                    return;
                }
                try {
                    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf-8');
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, count: tasks.length }));
                } catch (e) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to write tasks file' }));
                }
            });
            return;
        }
    }

    if (reqUrl === '/api/agent/chat') {
        if (req.method === 'GET') {
            fs.readFile(CHAT_FILE, 'utf-8', (err, data) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to read chat history' }));
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(data || '[]');
                }
            });
            return;
        }

        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => {
                try {
                    const msg = JSON.parse(body);
                    const timestamp = new Date().toISOString();
                    const entry = {
                        id: 'msg_' + Math.random().toString(36).substr(2, 9),
                        sender: msg.sender || 'user',
                        text: msg.text || '',
                        timestamp: msg.timestamp || timestamp,
                        status: 'received'
                    };

                    let history = [];
                    try {
                        history = JSON.parse(fs.readFileSync(CHAT_FILE, 'utf-8')) || [];
                    } catch (e) {
                        history = [];
                    }

                    history.push(entry);
                    fs.writeFileSync(CHAT_FILE, JSON.stringify(history, null, 2), 'utf-8');

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, entry }));
                } catch (err) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
                }
            });
            return;
        }
    }

    if (req.url === '/api/agent/digest') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'scheduled',
            dispatchTime: '09:00:00',
            sender: 'kannemcrm@agentmail.to',
            recipients: ['Michael@Kannem.com', 'MKenna.CAD@gmail.com'],
            digestTitle: 'KANNEM CRM Daily 9 AM Flagged Action Items Email Digest'
        }));
        return;
    }

    if (req.url === '/api/agent/send-digest' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body);
                const https = require('https');

                const apiKey = 'am_us_3843878d1bd5525335759e32e1a38b681434a17264b99a90b71642242b1ac3f2';
                const inboxId = 'kannemcrm@agentmail.to';

                const postData = JSON.stringify({
                    to: ['Michael@Kannem.com', 'MKenna.CAD@gmail.com'],
                    subject: 'KANNEM CRM — Morning Flagged Action Items Digest (9:00 AM)',
                    html: payload.html || '<p>9 AM Flagged Action Items Digest</p>',
                    text: payload.text || '9 AM Flagged Action Items Digest'
                });

                const options = {
                    hostname: 'api.agentmail.to',
                    port: 443,
                    path: `/v0/inboxes/${inboxId}/messages/send`,
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(postData)
                    }
                };

                const mailReq = https.request(options, (mailRes) => {
                    let mailData = '';
                    mailRes.on('data', chunk => mailData += chunk);
                    mailRes.on('end', () => {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            success: true,
                            agent: 'KannemCRM@agentmail',
                            recipients: ['Michael@Kannem.com', 'MKenna.CAD@gmail.com'],
                            agentmailResponse: mailData
                        }));
                    });
                });

                mailReq.on('error', (err) => {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: err.message }));
                });

                mailReq.write(postData);
                mailReq.end();

            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
            }
        });
        return;
    }

    // Static file serving
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    // Resolve absolute path and prevent directory traversal
    const safePath = path.resolve(filePath);
    const rootPath = path.resolve('.');
    
    if (!safePath.startsWith(rootPath)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('403 Forbidden');
        return;
    }

    const extname = String(path.extname(safePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(safePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 Not Found');
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(`500 Internal Error: ${error.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Private CRM server running at http://localhost:${PORT}/`);
    
    // Automated Daily 9:00 AM Email Digest Check
    let lastDispatchedDate = '';

    setInterval(() => {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const todayDateStr = now.toISOString().split('T')[0];

        // Trigger 9:00 AM daily email digest
        if (hours === 9 && minutes === 0 && lastDispatchedDate !== todayDateStr) {
            lastDispatchedDate = todayDateStr;
            console.log(`[${now.toISOString()}] Automated 9:00 AM Email Digest triggered by server schedule.`);
        }
    }, 60000); // Check every 60 seconds
});
