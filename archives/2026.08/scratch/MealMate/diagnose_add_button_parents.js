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
    
    console.log(`Analyzing storefront page: ${targetPage.url()}`);
    
    const parentsInfo = await targetPage.evaluate(() => {
      const btn = document.querySelector('button[aria-label*="Add" i], button[aria-label*="Add to cart" i]');
      if (!btn) return 'No Add button found';

      const results = [];
      let curr = btn;
      let depth = 0;
      while (curr && depth < 10) {
        results.push({
          depth: depth,
          tagName: curr.tagName,
          className: curr.className,
          text: (curr.innerText || curr.textContent || '').trim().substring(0, 200)
        });
        curr = curr.parentElement;
        depth++;
      }
      return results;
    });

    console.log('Add Button Parents Chain:');
    if (typeof parentsInfo === 'string') {
      console.log(parentsInfo);
    } else {
      parentsInfo.forEach(p => {
        console.log(`[Depth ${p.depth}] ${p.tagName} class="${p.className}" | Text (first 200 chars): "${p.text}"`);
      });
    }

    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

diagnose();
