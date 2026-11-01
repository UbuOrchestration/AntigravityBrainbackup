const puppeteer = require('puppeteer');

async function nav() {
  console.log('Connecting to Chrome...');
  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });

    const pages = await browser.pages();
    let targetPage = pages.find(p => p.url().includes('publix') || p.url().includes('instacart')) || pages[0];
    
    console.log(`Navigating back to storefront homepage...`);
    await targetPage.goto('https://delivery.publix.com/store/publix/storefront', { waitUntil: 'domcontentloaded' });
    console.log('Navigated!');
    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

nav();
