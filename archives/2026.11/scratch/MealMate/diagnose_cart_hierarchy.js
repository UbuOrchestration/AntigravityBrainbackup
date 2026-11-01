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
    
    const hierarchy = await targetPage.evaluate(() => {
      const all = Array.from(document.querySelectorAll('button, a, span, div, p'));
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

      if (!bestEl) return [];

      const chain = [];
      let curr = bestEl;
      while (curr && curr !== document.body) {
        chain.push({
          tagName: curr.tagName,
          className: curr.className,
          id: curr.id,
          role: curr.getAttribute('role'),
          ariaLabel: curr.getAttribute('aria-label'),
          clickable: typeof curr.onclick === 'function' || curr.getAttribute('onclick') !== null
        });
        curr = curr.parentElement;
      }
      return chain;
    });

    console.log('DOM Hierarchy from leaf to root:');
    hierarchy.forEach((el, idx) => {
      console.log(`[${idx}] ${el.tagName} | Class: "${el.className}" | ID: "${el.id}" | Role: "${el.role}" | AriaLabel: "${el.ariaLabel}"`);
    });

    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

diagnose();
