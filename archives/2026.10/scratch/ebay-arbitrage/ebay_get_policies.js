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

function fetchPolicies(accessToken, policyType) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.ebay.com',
      path: `/sell/account/v1/${policyType}?marketplace_id=EBAY_US`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const data = JSON.parse(body);
            resolve(data);
          } else {
            resolve({ error: `API HTTP ${res.statusCode}`, body });
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

async function run() {
  try {
    const token = await getAccessToken();
    console.log('Access token generated.');
    
    console.log('Fetching Fulfillment Policies...');
    const fulfillment = await fetchPolicies(token, 'fulfillment_policy');
    console.log('Fulfillment Policies:', JSON.stringify(fulfillment, null, 2));

    console.log('\nFetching Return Policies...');
    const returnPolicies = await fetchPolicies(token, 'return_policy');
    console.log('Return Policies:', JSON.stringify(returnPolicies, null, 2));

    console.log('\nFetching Payment Policies...');
    const payment = await fetchPolicies(token, 'payment_policy');
    console.log('Payment Policies:', JSON.stringify(payment, null, 2));

  } catch (e) {
    console.error('Error running check:', e.message);
  }
}

run();
