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
            digestTitle: 'KANNEM CRM Daily 9 AM Flagged Action Items Email Digest'
        }));
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
});
