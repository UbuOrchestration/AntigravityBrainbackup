import fs from 'fs';

const token = "v^1.1#i^1#f^0#p^3#r^1#I^3#t^Ul4xMF85OjVDMTBGNUNDNDgyRjg2MDY4NkI1RDA5QzJCMDA4QkNGXzJfMSNFXjI2MA==";

const config = JSON.parse(fs.readFileSync('config/ebay_credentials.json', 'utf8'));
config.accessToken = token;
config.refreshToken = token;
config.tokenExpiresAt = Date.now() + 10000000000;
fs.writeFileSync('config/ebay_credentials.json', JSON.stringify(config, null, 2));
console.log("Token injected successfully.");
