const puppeteer = require('puppeteer');

async function diagnose() {
  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });
    const pages = await browser.pages();
    const page = pages.find(p => p.url().includes('aldi.us'));
    
    if (page) {
      console.log(`Targeting Aldi Tab: ${page.url()}`);
      const inputs = await page.evaluate(() => {
        const results = [];
        const allInputs = Array.from(document.querySelectorAll('input'));
        allInputs.forEach(el => {
          results.push({
            tagName: el.tagName,
            id: el.id,
            className: el.className,
            placeholder: el.placeholder,
            type: el.type,
            name: el.name
          });
        });
        return results;
      });
      console.log('All inputs on Aldi tab:', JSON.stringify(inputs, null, 2));
    } else {
      console.log('No Aldi tab found.');
    }
    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

diagnose();
