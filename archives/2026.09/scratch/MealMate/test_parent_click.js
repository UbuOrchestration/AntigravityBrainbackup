const puppeteer = require('puppeteer');

async function test() {
  console.log('Connecting to Chrome...');
  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });

    const pages = await browser.pages();
    let targetPage = pages.find(p => p.url().includes('publix') || p.url().includes('instacart')) || pages[0];
    
    console.log(`Current page URL: ${targetPage.url()}`);
    
    // Dismiss preference modal or banner first if visible
    await targetPage.evaluate(() => {
      const dismiss = Array.from(document.querySelectorAll('button, span, div, p'));
      const confirmBtn = dismiss.find(el => {
        const txt = (el.innerText || el.textContent || '').trim().toLowerCase();
        return txt === 'got it!' || txt === 'got it' || txt === 'confirm';
      });
      if (confirmBtn) confirmBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Dispatch bubbling MouseEvent on status span, parent span, and parent div
    const clicked = await targetPage.evaluate(() => {
      const all = Array.from(document.querySelectorAll('span'));
      const statusSpan = all.find(el => {
        const text = (el.innerText || el.textContent || '').toLowerCase();
        return text.includes('items in cart');
      });

      if (!statusSpan) return 'Status span not found';

      let clickedTags = [];

      // Helper to dispatch MouseEvent
      function clickEvent(el) {
        const ev = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true
        });
        el.dispatchEvent(ev);
        clickedTags.push(el.tagName + (el.className ? '.' + el.className : ''));
      }

      // Click the span itself
      clickEvent(statusSpan);
      
      // Click the parent span
      if (statusSpan.parentElement) {
        clickEvent(statusSpan.parentElement);
        // Click the grandparent div
        if (statusSpan.parentElement.parentElement) {
          clickEvent(statusSpan.parentElement.parentElement);
        }
      }

      return clickedTags;
    });

    console.log(`Dispatched click events to: ${JSON.stringify(clicked)}`);

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
              className: el.className
            });
          });
        }
      });
      return results;
    });

    console.log(`Found clickable elements in dialogs (${dialogInfo.length}):`);
    dialogInfo.forEach((info, idx) => {
      console.log(`[D-${info.dialogIdx}][C-${idx}] ${info.tagName} - Text: "${info.text}" | Class: "${info.className}"`);
    });

    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
