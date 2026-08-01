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
    
    const cartHtml = await targetPage.evaluate(() => {
      const all = Array.from(document.querySelectorAll('span'));
      const statusSpan = all.find(el => {
        const text = (el.innerText || el.textContent || '').toLowerCase();
        return text.includes('items in cart');
      });

      if (!statusSpan) return 'Status span not found';
      
      // Find the ancestor div.e-stwia6
      let curr = statusSpan;
      while (curr && curr !== document.body) {
        if (curr.className === 'e-stwia6') {
          return curr.outerHTML;
        }
        curr = curr.parentElement;
      }
      return 'Ancestor div.e-stwia6 not found. Parent is: ' + statusSpan.parentElement.tagName;
    });

    console.log('Real Cart Button DIV HTML:');
    console.log(cartHtml);

    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

diagnose();
