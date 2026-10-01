/**
 * server.js - Native Node.js HTTP Server with API Router
 * Serves dashboard files and manages log data in data.json
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3005;
const DATA_FILE = path.join(__dirname, 'data.json');

// MIME types for static file serving
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

/**
 * Initialize data.json with defaults if not present
 */
function initDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    // We'll let the client seed it or write basic structure
    const initialData = {
      profile: {
        name: 'Leo',
        birthdate: '2026-02-15',
        weight: 7.2,
        height: 66,
        headCircumference: 43
      },
      logs: [], // client db.js will seed this if empty
      prefs: {
        volumeUnit: 'ml',
        weightUnit: 'kg',
        lengthUnit: 'cm',
        theme: 'light'
      }
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
    console.log('Initialized data.json file.');
  }
}

/**
 * Helper to read JSON data from file
 */
function readData() {
  initDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading data.json:', e);
    return { profile: {}, logs: [], prefs: {} };
  }
}

/**
 * Helper to write JSON data to file
 */
function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Error writing data.json:', e);
    return false;
  }
}

/**
 * Parse JSON request body helper
 */
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

// Ensure data file is ready
initDataFile();

// Create server
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  console.log(`${method} ${pathname}`);

  // API ROUTER
  if (pathname.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');

    // GET /api/data
    if (pathname === '/api/data' && method === 'GET') {
      const data = readData();
      res.writeHead(200);
      return res.end(JSON.stringify(data));
    }

    // POST /api/sync
    // Client posts its complete state (e.g. after generating mock data or importing)
    if (pathname === '/api/sync' && method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        if (body.logs && body.profile && body.prefs) {
          writeData(body);
          res.writeHead(200);
          return res.end(JSON.stringify({ success: true }));
        } else {
          res.writeHead(400);
          return res.end(JSON.stringify({ error: 'Invalid data schema' }));
        }
      } catch (err) {
        res.writeHead(500);
        return res.end(JSON.stringify({ error: err.message }));
      }
    }

    // POST /api/logs (Add new log)
    if (pathname === '/api/logs' && method === 'POST') {
      try {
        const newLog = await parseJsonBody(req);
        const data = readData();
        
        newLog.id = newLog.id || 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        newLog.createdAt = newLog.createdAt || new Date().toISOString();
        
        data.logs.push(newLog);
        writeData(data);
        
        res.writeHead(201);
        return res.end(JSON.stringify(newLog));
      } catch (err) {
        res.writeHead(500);
        return res.end(JSON.stringify({ error: err.message }));
      }
    }

    // PUT /api/logs (Update existing log)
    if (pathname === '/api/logs' && method === 'PUT') {
      try {
        const updatedLog = await parseJsonBody(req);
        const data = readData();
        const index = data.logs.findIndex(l => l.id === updatedLog.id);
        
        if (index !== -1) {
          data.logs[index] = { ...data.logs[index], ...updatedLog, updatedAt: new Date().toISOString() };
          writeData(data);
          res.writeHead(200);
          return res.end(JSON.stringify(data.logs[index]));
        } else {
          res.writeHead(404);
          return res.end(JSON.stringify({ error: 'Log not found' }));
        }
      } catch (err) {
        res.writeHead(500);
        return res.end(JSON.stringify({ error: err.message }));
      }
    }

    // DELETE /api/logs
    if (pathname.startsWith('/api/logs/') && method === 'DELETE') {
      const parts = pathname.split('/');
      const logId = parts[parts.length - 1];
      const data = readData();
      const filtered = data.logs.filter(l => l.id !== logId);
      
      if (filtered.length !== data.logs.length) {
        data.logs = filtered;
        writeData(data);
        res.writeHead(200);
        return res.end(JSON.stringify({ success: true }));
      } else {
        res.writeHead(404);
        return res.end(JSON.stringify({ error: 'Log not found' }));
      }
    }

    // POST /api/profile
    if (pathname === '/api/profile' && method === 'POST') {
      try {
        const profile = await parseJsonBody(req);
        const data = readData();
        data.profile = profile;
        writeData(data);
        res.writeHead(200);
        return res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500);
        return res.end(JSON.stringify({ error: err.message }));
      }
    }

    // POST /api/prefs
    if (pathname === '/api/prefs' && method === 'POST') {
      try {
        const prefs = await parseJsonBody(req);
        const data = readData();
        data.prefs = prefs;
        writeData(data);
        res.writeHead(200);
        return res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500);
        return res.end(JSON.stringify({ error: err.message }));
      }
    }

    res.writeHead(404);
    return res.end(JSON.stringify({ error: 'Endpoint not found' }));
  }

  // STATIC FILE SERVING
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  const filePath = path.join(__dirname, safePath);
  const extname = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
