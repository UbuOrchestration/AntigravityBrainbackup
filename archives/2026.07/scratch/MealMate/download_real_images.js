const https = require('https');
const fs = require('fs');
const path = require('path');

const menuStatusPath = path.join(__dirname, 'menu_status.json');
const imagesDir = path.join(__dirname, 'public', 'images');

// Ensure folder exists
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Load menu
if (!fs.existsSync(menuStatusPath)) {
  console.error('menu_status.json not found. Run generate_menu.js first.');
  process.exit(1);
}

const menuStatus = JSON.parse(fs.readFileSync(menuStatusPath, 'utf8'));
const menu = menuStatus.menu;

if (!menu) {
  console.error('No menu data in menu_status.json.');
  process.exit(1);
}

// Map selected recipe images to local files for the mailer
const downloads = [];

if (menu.breakfast && menu.breakfast.image) {
  downloads.push({ url: menu.breakfast.image, dest: 'spinach_feta_scramble.jpg' });
}
if (menu.lunch && menu.lunch.image) {
  downloads.push({ url: menu.lunch.image, dest: 'chicken_spinach_wrap.jpg' });
}
if (menu.dinners && Array.isArray(menu.dinners)) {
  const dinnerFileNames = [
    'grilled_chicken_zucchini.jpg',
    'sauteed_chicken_spinach.jpg',
    'mediterranean_chicken_stir_fry.jpg'
  ];
  menu.dinners.forEach((dinner, idx) => {
    if (dinner.image && idx < dinnerFileNames.length) {
      downloads.push({ url: dinner.image, dest: dinnerFileNames[idx] });
    }
  });
}

function downloadFile(url, destName) {
  return new Promise((resolve, reject) => {
    const destPath = path.join(imagesDir, destName);
    const file = fs.createWriteStream(destPath);
    
    console.log(`[Image Sync] Downloading ${url} -> ${destName}...`);
    
    https.get(url, (response) => {
      // Handle redirect status codes 301/302
      if (response.statusCode === 301 || response.statusCode === 302) {
        https.get(response.headers.location, (redirectResponse) => {
          redirectResponse.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log(`[Image Sync] Successfully saved: ${destName}`);
            resolve();
          });
        }).on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`[Image Sync] Successfully saved: ${destName}`);
          resolve();
        });
      }
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function runDownloads() {
  for (const item of downloads) {
    try {
      await downloadFile(item.url, item.dest);
    } catch (e) {
      console.error(`[Image Sync] Error downloading ${item.dest}:`, e.message);
    }
  }
  console.log('[Image Sync] All downloads completed!');
}

runDownloads();
