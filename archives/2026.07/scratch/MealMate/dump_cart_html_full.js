const puppeteer = require('puppeteer');

async function diagnose() {
  console.log('Connecting to Chrome...');
  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });

    const pages = await browser.pages();
    let targetPage = pages.find(p => p.url().includes('publix') || p.url().includes('instacart')) || pages[0];
    
    const cartFullHtml = await targetPage.evaluate(() => {
      const el = document.querySelector('.e-stwia6');
      return el ? el.outerHTML : 'Not found';
    });

    console.log('Full Cart Button DIV HTML:');
    console.log(cartFullHtml);

    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

diagnose();
