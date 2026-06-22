const fs = require('fs');
const path = require('path');
const https = require('https');

const ENV_PATH = path.join(__dirname, '.env');

// Load existing environment variables
function loadEnv() {
  if (fs.existsSync(ENV_PATH)) {
    const content = fs.readFileSync(ENV_PATH, 'utf8');
    content.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        process.env[parts[0].trim()] = parts.slice(1).join('=').trim();
      }
    });
  }
}

// Save config to .env
function saveToEnv(key, value) {
  let content = '';
  if (fs.existsSync(ENV_PATH)) {
    content = fs.readFileSync(ENV_PATH, 'utf8');
  }
  
  const lines = content.split('\n').filter(line => line.trim() !== '');
  const keyExists = lines.some((line, index) => {
    if (line.startsWith(`${key}=`)) {
      lines[index] = `${key}=${value}`;
      return true;
    }
    return false;
  });

  if (!keyExists) {
    lines.push(`${key}=${value}`);
  }

  fs.writeFileSync(ENV_PATH, lines.join('\n') + '\n', 'utf8');
  process.env[key] = value;
}

loadEnv();

const APP_ID = process.env.EBAY_APP_ID || '';
const CERT_ID = process.env.EBAY_CERT_ID || '';
const RUNAME = process.env.EBAY_RUNAME || '';

const SCOPES = [
  'https://api.ebay.com/oauth/api_scope/sell.inventory',
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment'
].join(' ');

function showHelp() {
  console.log(`
eBay Auth Setup Helper
----------------------
Commands:
  node ebay_auth.js init <AppID> <CertID> <RuName>
    Saves your App credentials.
    
  node ebay_auth.js url
    Generates the eBay authorization URL you must click.
    
  node ebay_auth.js token <code>
    Exchanges the temporary code from the redirect URL for a permanent Refresh Token.
  `);
}

const command = process.argv[2];

if (command === 'init') {
  const appId = process.argv[3];
  const certId = process.argv[4];
  const ruName = process.argv[5];

  if (!appId || !certId || !ruName) {
    console.error('Error: Please provide AppID, CertID, and RuName.');
    process.exit(1);
  }

  saveToEnv('EBAY_APP_ID', appId);
  saveToEnv('EBAY_CERT_ID', certId);
  saveToEnv('EBAY_RUNAME', ruName);

  console.log('Credentials saved to .env!');
  console.log('Next, run: node ebay_auth.js url');

} else if (command === 'url') {
  if (!APP_ID || !RUNAME) {
    console.error('Error: AppID or RuName is missing. Run "node ebay_auth.js init" first.');
    process.exit(1);
  }

  const encodedRuName = encodeURIComponent(RUNAME);
  const encodedScopes = encodeURIComponent(SCOPES);
  
  // Production URL for authorization
  const authUrl = `https://auth.ebay.com/oauth2/authorize?client_id=${APP_ID}&redirect_uri=${RUNAME}&response_type=code&scope=${encodedScopes}&prompt=login`;

  console.log('\n--- EBAY AUTHORIZATION URL ---');
  console.log('Copy and paste the URL below into your browser, log in, and grant access:');
  console.log('\n' + authUrl + '\n');
  console.log('After approving, you will be redirected to your Redirect URL.');
  console.log('The URL bar will look like: https://example.com/?code=v%5E1.1%23i%5E1...');
  console.log('Copy that long code starting after "?code=" and run:');
  console.log('node ebay_auth.js token <paste_code_here>');

} else if (command === 'token') {
  const code = process.argv[3];
  if (!code) {
    console.error('Error: Please provide the code.');
    process.exit(1);
  }

  if (!APP_ID || !CERT_ID || !RUNAME) {
    console.error('Error: Credentials missing. Run init first.');
    process.exit(1);
  }

  const decodedCode = decodeURIComponent(code);
  const authHeader = Buffer.from(`${APP_ID}:${CERT_ID}`).toString('base64');
  
  const postData = new URLSearchParams({
    grant_type: 'authorization_code',
    code: decodedCode,
    redirect_uri: RUNAME
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
        if (data.refresh_token) {
          saveToEnv('EBAY_REFRESH_TOKEN', data.refresh_token);
          console.log('\nSuccess! Refresh Token saved to .env.');
          console.log('Your eBay account is now fully connected.');
        } else {
          console.error('Failed to get token:', data);
        }
      } catch (e) {
        console.error('Error parsing response:', e);
        console.log('Raw body:', body);
      }
    });
  });

  req.on('error', (e) => {
    console.error('Request error:', e);
  });

  req.write(postData);
  req.end();

} else {
  showHelp();
}
