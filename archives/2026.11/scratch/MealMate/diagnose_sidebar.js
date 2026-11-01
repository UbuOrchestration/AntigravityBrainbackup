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
    
    // Click the cart leaf element directly
    const clicked = await targetPage.evaluate(() => {
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

      if (bestEl) {
        bestEl.click();
        return {
          tagName: bestEl.tagName,
          text: (bestEl.innerText || bestEl.textContent || '').trim().substring(0, 100),
          className: bestEl.className
        };
      }
      return null;
    });

    if (clicked) {
      console.log(`Clicked leaf element directly: <${clicked.tagName} class="${clicked.className}"> text="${clicked.text}"`);
    } else {
      console.log('Failed to find cart leaf element!');
    }

    console.log('Waiting 4 seconds for sidebar to render...');
    await new Promise(r => setTimeout(r, 4000));

    // Capture screenshot of sidebar
    const screenshotPath = 'C:\\Users\\Ubu\\.gemini\\antigravity\\brain\\9e4b2519-acb8-4623-a3cd-0d977fb64924\\publix_sidebar_screenshot.png';
    await targetPage.screenshot({ path: screenshotPath });
    console.log(`Saved screenshot to ${screenshotPath}`);

    // Dump dialog elements
    const dialogInfo = await targetPage.evaluate(() => {
      const results = [];
      const dialogs = Array.from(document.querySelectorAll('[role="dialog"], [class*="drawer" i], [class*="sidebar" i], [class*="cart" i], [class*="dialog" i]'));
      dialogs.forEach((diag, dIdx) => {
        if (diag.innerText.trim().length > 0 && diag.innerText.length < 5000) {
          const clickable = Array.from(diag.querySelectorAll('button, a, div[role="button"], span'));
          clickable.forEach((el, cIdx) => {
            results.push({
              dialogIdx: dIdx,
              tagName: el.tagName,
              text: (el.innerText || el.textContent || '').trim().substring(0, 100),
              className: el.className,
              ariaLabel: el.getAttribute('aria-label')
            });
          });
        }
      });
      return results;
    });

    console.log(`Found clickable elements in dialogs (${dialogInfo.length}):`);
    dialogInfo.forEach((info, idx) => {
      console.log(`[D-${info.dialogIdx}][C-${idx}] ${info.tagName} - Text: "${info.text}" | Class: "${info.className}" | AriaLabel: "${info.ariaLabel}"`);
    });

    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

diagnose();
