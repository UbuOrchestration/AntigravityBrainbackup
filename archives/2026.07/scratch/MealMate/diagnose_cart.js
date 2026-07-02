const puppeteer = require('puppeteer');

async function diagnose() {
  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });
    const pages = await browser.pages();
    const page = pages.find(p => p.url().includes('storefront'));
    
    if (page) {
      console.log(`Targeting storefront tab: ${page.url()}`);
      const matches = await page.evaluate(() => {
        const results = [];
        const all = Array.from(document.querySelectorAll('button, a, div, span, p'));
        all.forEach(el => {
          const text = (el.innerText || el.textContent || '').trim();
          if (text.toLowerCase().includes('checkout')) {
            results.push({
              tagName: el.tagName,
              id: el.id,
              className: el.className,
              textSnippet: text.substring(0, 50)
            });
          }
        });
        return results;
      });
      console.log('Matches on storefront tab:', matches.slice(0, 15));
    } else {
      console.log('No storefront tab found.');
    }
    await browser.disconnect();
  } catch (err) {
    console.error('Error during diagnosis:', err.message);
  }
}

diagnose();
