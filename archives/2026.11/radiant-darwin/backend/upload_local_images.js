const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { parseStringPromise } = require('xml2js');

const configPath = path.join(__dirname, 'config', 'ebay_credentials.json');
const mapsPath = path.join(__dirname, 'config', 'listings_metadata.json');

const artifactsDir = path.join('C:', 'Users', 'Ubu', '.gemini', 'antigravity', 'brain', '480448e1-a537-4204-9b4f-cb5bfda403c3');

const imageMap = {
  '800273275316': 'rv_leveling_blocks_ready_to_ship_1782925687901.jpg',
  '800273404258': 'rv_water_filter_ready_to_ship_1782943892512.jpg',
  '800273407865': 'rv_sewer_hose_ready_to_ship_1782943899335.jpg',
  '800274164837': 'rv_pressure_regulator_ready_to_ship_1782943906261.jpg',
  '800274166958': 'rv_surge_protector_ready_to_ship_1782943915267.jpg'
};

async function uploadImageToEbay(imagePath, token) {
  try {
    const base64Data = fs.readFileSync(imagePath).toString('base64');
    
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<UploadSiteHostedPicturesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <PictureData>${base64Data}</PictureData>
</UploadSiteHostedPicturesRequest>`;

    const response = await axios.post('https://api.ebay.com/ws/api.dll', xml, {
      headers: {
        'Content-Type': 'text/xml',
        'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
        'X-EBAY-API-SITEID': '0',
        'X-EBAY-API-CALL-NAME': 'UploadSiteHostedPictures',
        'X-EBAY-API-IAF-TOKEN': `Bearer ${token}`
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    const result = await parseStringPromise(response.data, { explicitArray: false });
    const uploadResp = result.UploadSiteHostedPicturesResponse;
    
    if (uploadResp.Ack === 'Success' || uploadResp.Ack === 'Warning') {
      return uploadResp.SiteHostedPictureDetails.FullURL;
    } else {
      console.error('Upload failed:', JSON.stringify(uploadResp.Errors));
      return null;
    }
  } catch (err) {
    console.error('Error uploading to eBay EPS:', err.message);
    return null;
  }
}

async function main() {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    let token = config.accessToken;
    const isExpired = !token || !config.tokenExpiresAt || (Date.now() + 300000 > config.tokenExpiresAt);
    if (isExpired) {
      console.log('Refreshing token...');
      const tokenUrl = 'https://api.ebay.com/identity/v1/oauth2/token';
      const authHeader = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: config.refreshToken,
        scope: 'https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.marketing'
      });
      const response = await axios.post(tokenUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authHeader}`
        }
      });
      token = response.data.access_token;
      config.accessToken = token;
      config.tokenExpiresAt = Date.now() + (response.data.expires_in * 1000);
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }

    for (const [itemId, filename] of Object.entries(imageMap)) {
      const fullPath = path.join(artifactsDir, filename);
      console.log(`Processing Item ${itemId} using image ${filename}...`);
      
      const epsUrl = await uploadImageToEbay(fullPath, token);
      if (!epsUrl) {
        console.log(`Failed to get EPS URL for ${itemId}`);
        continue;
      }
      
      console.log(`Uploaded! EPS URL: ${epsUrl}`);
      
      const xml = `<?xml version="1.0" encoding="utf-8"?>
<ReviseItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <Item>
    <ItemID>${itemId}</ItemID>
    <PictureDetails>
      <PictureURL>${epsUrl}</PictureURL>
    </PictureDetails>
  </Item>
</ReviseItemRequest>`;

      const response = await axios.post('https://api.ebay.com/ws/api.dll', xml, {
        headers: {
          'Content-Type': 'text/xml',
          'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
          'X-EBAY-API-SITEID': '0',
          'X-EBAY-API-CALL-NAME': 'ReviseItem',
          'X-EBAY-API-IAF-TOKEN': `Bearer ${token}`
        }
      });

      const result = await parseStringPromise(response.data, { explicitArray: false });
      const reviseResponse = result.ReviseItemResponse;

      if (reviseResponse.Ack === 'Success' || reviseResponse.Ack === 'Warning') {
        console.log(`SUCCESS: Image updated for ${itemId}`);
      } else {
        console.error(`FAILED to update image for ${itemId}:`, JSON.stringify(reviseResponse.Errors));
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
