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
    
    console.log(`Current page URL: ${targetPage.url()}`);
    
    const headerHtml = await targetPage.evaluate(() => {
      const header = document.querySelector('header.e-1xtssqm, header, [class*="header" i]');
      return header ? header.outerHTML : 'Header not found';
    });

    console.log('Header HTML Structure:');
    console.log(headerHtml.substring(0, 10000));

    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

diagnose();
