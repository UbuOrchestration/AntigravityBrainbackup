const fs = require('fs');
const path = require('path');
const https = require('https');

const ENV_PATH = path.join(__dirname, '.env');

// Load environment variables
if (fs.existsSync(ENV_PATH)) {
  const content = fs.readFileSync(ENV_PATH, 'utf8');
  content.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      process.env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  });
}

const APP_ID = process.env.EBAY_APP_ID;
const CERT_ID = process.env.EBAY_CERT_ID;
const REFRESH_TOKEN = process.env.EBAY_REFRESH_TOKEN;

if (!APP_ID || !CERT_ID || !REFRESH_TOKEN) {
  console.error('Error: Missing eBay credentials in .env file.');
  process.exit(1);
}

// Function to fetch a new User Access Token using the Refresh Token
function getAccessToken() {
  return new Promise((resolve, reject) => {
    const authHeader = Buffer.from(`${APP_ID}:${CERT_ID}`).toString('base64');
    
    const postData = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: REFRESH_TOKEN
    }).toString();

    const options = {
      hostname: 'api.ebay.com',
      path: '/identity/v1/oauth2/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authHeader}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.access_token) {
            resolve(data.access_token);
          } else {
            reject(new Error('No access token in response: ' + JSON.stringify(data)));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Function to call eBay Sell Inventory API and check connection
function testInventoryAPI(accessToken) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.ebay.com',
      path: '/sell/inventory/v1/inventory_item?limit=5',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          // A 200 status code means success. Even if inventory is empty, it proves the connection is authorized.
          if (res.statusCode === 200) {
            const data = JSON.parse(body);
            resolve({ status: 'Success', code: res.statusCode, data });
          } else {
            resolve({ status: 'API Error', code: res.statusCode, raw: body });
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function runTest() {
  console.log('Refreshing eBay Access Token...');
  try {
    const accessToken = await getAccessToken();
    console.log('Access token successfully generated!');
    console.log('Testing connection to eBay Inventory API...');
    const result = await testInventoryAPI(accessToken);
    console.log('\n--- CONNECTION TEST RESULT ---');
    console.log(`Status Code: ${result.code}`);
    console.log(`Connection Status: ${result.status}`);
    if (result.status === 'Success') {
      console.log('Details: Connection verified. Ready to fetch/upload items!');
      console.log(`Monitored Items Found: ${result.data.total || 0}`);
    } else {
      console.log('Details:', result.raw);
    }
  } catch (err) {
    console.error('Test Failed:', err.message);
  }
}

runTest();
