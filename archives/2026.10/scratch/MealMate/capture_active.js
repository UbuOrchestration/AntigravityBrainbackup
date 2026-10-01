const puppeteer = require('puppeteer');
const path = require('path');

async function capture() {
  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });
    const pages = await browser.pages();
    const page = pages[0];
    if (page) {
      console.log(`Active URL: ${page.url()}`);
      const screenshotPath = path.join(__dirname, 'public', 'active_tab.png');
      await page.screenshot({ path: screenshotPath });
      console.log(`Saved screenshot to: ${screenshotPath}`);
    } else {
      console.log('No pages found in Chrome.');
    }
    await browser.disconnect();
  } catch (err) {
    console.error('Error taking screenshot:', err.message);
  }
}

capture();
