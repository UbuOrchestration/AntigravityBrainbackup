const puppeteer = require('puppeteer');

async function capture() {
  console.log('Connecting to Chrome...');
  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });

    const pages = await browser.pages();
    let targetPage = pages.find(p => p.url().includes('publix') || p.url().includes('instacart')) || pages[0];
    
    console.log(`Current page URL: ${targetPage.url()}`);
    
    const textLength = await targetPage.evaluate(() => document.body.innerText.length);
    console.log(`Page inner text length: ${textLength}`);

    const screenshotPath = 'C:\\Users\\Ubu\\.gemini\\antigravity\\brain\\9e4b2519-acb8-4623-a3cd-0d977fb64924\\publix_current_state.png';
    await targetPage.screenshot({ path: screenshotPath });
    console.log(`Saved screenshot to ${screenshotPath}`);

    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

capture();
