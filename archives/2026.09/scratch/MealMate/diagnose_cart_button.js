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
    
    console.log(`Analyzing cart button on URL: ${targetPage.url()}`);
    
    const matchedBtn = await targetPage.evaluate(() => {
      const all = Array.from(document.querySelectorAll('button, a, span, div, p'));
      // Find the element with the shortest text content that contains "view cart" or "items in cart"
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

      if (bestEl) {
        return {
          tagName: bestEl.tagName,
          text: (bestEl.innerText || bestEl.textContent || '').trim().substring(0, 100),
          className: bestEl.className,
          ariaLabel: bestEl.getAttribute('aria-label')
        };
      }
      return null;
    });

    if (matchedBtn) {
      console.log(`SUCCESS! Matched leaf element: <${matchedBtn.tagName} class="${matchedBtn.className}" aria-label="${matchedBtn.ariaLabel}"> text="${matchedBtn.text}"`);
    } else {
      console.log('FAILED to match any button!');
    }

    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

diagnose();
