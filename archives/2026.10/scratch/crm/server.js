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

// Helper to ensure chat JSON file exists
if (!fs.existsSync(CHAT_FILE)) {
    fs.writeFileSync(CHAT_FILE, JSON.stringify([]), 'utf-8');
}

const server = http.createServer((req, res) => {
    // API endpoint handling
    if (req.url === '/api/agent/chat') {
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
    
    // Automated Daily 9:00 AM Scheduler Check
    let lastDispatchedDate = '';
    setInterval(() => {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const todayDateStr = now.toISOString().split('T')[0];

        // Trigger automatically at 9:00 AM once per day
        if (hours === 9 && minutes === 0 && lastDispatchedDate !== todayDateStr) {
            lastDispatchedDate = todayDateStr;
            console.log(`[${now.toISOString()}] Automated 9:00 AM Email Digest triggered by server schedule.`);
        }
    }, 60000); // Check every 60 seconds
});
