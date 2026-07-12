const puppeteer = require('puppeteer');

async function inspect() {
  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });
  } catch (err) {
    console.error('Could not connect to Chrome:', err.message);
    return;
  }

  const pages = await browser.pages();
  for (const page of pages) {
    const url = page.url();
    if (url.includes('publix') || url.includes('aldi') || url.includes('instacart')) {
      console.log(`\n========================================`);
      console.log(`Inspecting page: ${url}`);
      console.log(`========================================`);

      const elements = await page.evaluate(() => {
        const results = [];
        // Find elements with "cart" in text or class or ID
        const all = Array.from(document.querySelectorAll('button, a, div, span'));
        all.forEach(el => {
          const text = (el.innerText || el.textContent || '').trim();
          const className = el.className || '';
          const id = el.id || '';
          const ariaLabel = el.getAttribute('aria-label') || '';
          
          if (
            (text.toLowerCase().includes('cart') || ariaLabel.toLowerCase().includes('cart')) &&
            (el.tagName === 'BUTTON' || el.tagName === 'A' || className.includes('cart') || id.includes('cart'))
          ) {
            results.push({
              tag: el.tagName,
              text: text.slice(0, 50),
              class: className,
              id: id,
              ariaLabel: ariaLabel,
              outerHTML: el.outerHTML.slice(0, 150)
            });
          }
        });
        return results;
      });

      console.log(`Found ${elements.length} potential cart elements:`);
      elements.slice(0, 10).forEach((el, index) => {
        console.log(`[${index}] TAG: ${el.tag} | TEXT: "${el.text}" | ARIA: "${el.ariaLabel}"`);
        console.log(`    HTML: ${el.outerHTML}`);
      });
    }
  }

  await browser.disconnect();
}

inspect();
