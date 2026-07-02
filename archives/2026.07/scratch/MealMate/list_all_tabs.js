const puppeteer = require('puppeteer');
const path = require('path');

async function list() {
  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });
    const pages = await browser.pages();
    console.log(`Found ${pages.length} tabs:`);
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const url = page.url();
      console.log(`  Tab ${i}: ${url}`);
      
      const screenshotPath = path.join(__dirname, 'public', `tab_${i}.png`);
      try {
        await page.screenshot({ path: screenshotPath });
        console.log(`  Saved screenshot of Tab ${i} to ${screenshotPath}`);
      } catch (err) {
        console.log(`  Failed to screenshot Tab ${i}: ${err.message}`);
      }
    }
    await browser.disconnect();
  } catch (err) {
    console.error('Error listing tabs:', err.message);
  }
}

list();
