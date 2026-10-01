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
    
    const info = await targetPage.evaluate(() => {
      const all = Array.from(document.querySelectorAll('span'));
      const statusSpan = all.find(el => {
        const text = (el.innerText || el.textContent || '').toLowerCase();
        return text.includes('items in cart');
      });

      if (!statusSpan) return 'Status span not found';
      
      const results = [];
      let curr = statusSpan;
      let depth = 0;
      while (curr && depth < 5) {
        results.push({
          depth: depth,
          tagName: curr.tagName,
          className: curr.className,
          id: curr.id,
          role: curr.getAttribute('role'),
          ariaLabel: curr.getAttribute('aria-label'),
          htmlSummary: curr.outerHTML.substring(0, 150)
        });
        curr = curr.parentElement;
        depth++;
      }
      return results;
    });

    console.log('Cart Container DOM Structure:');
    if (typeof info === 'string') {
      console.log(info);
    } else {
      info.forEach(el => {
        console.log(`[Depth ${el.depth}] ${el.tagName} class="${el.className}" role="${el.role}" aria-label="${el.ariaLabel}" | Summary: ${el.htmlSummary}`);
      });
    }

    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

diagnose();
