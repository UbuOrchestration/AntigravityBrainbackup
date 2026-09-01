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
    
    const cartHtml = await targetPage.evaluate(() => {
      const all = Array.from(document.querySelectorAll('*'));
      let bestEl = null;
      let minLen = Infinity;

      all.forEach(el => {
        const text = (el.innerText || el.textContent || '').toLowerCase();
        const label = (el.getAttribute('aria-label') || '').toLowerCase();
        if (text.includes('view cart') || text.includes('items in cart') || label.includes('view cart') || label.includes('items in cart')) {
          if (text.length < minLen) {
            minLen = text.length;
            bestEl = el;
          }
        }
      });

      if (!bestEl) return 'Cart element not found';

      let out = `Leaf element: ${bestEl.outerHTML}\n\n`;
      let curr = bestEl.parentElement;
      let depth = 1;
      while (curr && depth <= 4) {
        out += `Parent Level ${depth} (${curr.tagName} class="${curr.className}" role="${curr.getAttribute('role')}" id="${curr.id}"): ${curr.outerHTML.substring(0, 500)}...\n\n`;
        curr = curr.parentElement;
        depth++;
      }
      return out;
    });

    console.log('Cart Button DOM Structure:');
    console.log(cartHtml);

    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

diagnose();
