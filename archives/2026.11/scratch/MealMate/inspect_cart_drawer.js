const puppeteer = require('puppeteer');

async function inspect() {
  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });
    const pages = await browser.pages();
    const page = pages.find(p => p.url().includes('aldi.us') || p.url().includes('publix.com'));
    
    if (page) {
      console.log(`Inspecting Tab: ${page.url()}`);
      const elements = await page.evaluate(() => {
        const dialog = document.querySelector('#cart_dialog');
        if (!dialog) return 'Cart dialog not found.';
        
        // Find all clickable elements or elements with text
        const results = [];
        const all = Array.from(dialog.querySelectorAll('button, a, div, span, svg'));
        all.forEach(el => {
          const text = (el.innerText || el.textContent || '').trim();
          const aria = el.getAttribute('aria-label') || '';
          const classStr = el.className || '';
          
          if (aria || text || classStr.includes('button') || classStr.includes('close') || classStr.includes('delete') || classStr.includes('remove')) {
            results.push({
              tagName: el.tagName,
              id: el.id,
              className: classStr,
              ariaLabel: aria,
              textSnippet: text.substring(0, 100),
              attributes: Array.from(el.attributes).map(a => `${a.name}="${a.value}"`)
            });
          }
        });
        return results;
      });
      console.log(JSON.stringify(elements, null, 2));
    } else {
      console.log('No storefront tab found.');
    }
    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

inspect();
