const puppeteer = require('puppeteer');

async function clearCart() {
  console.log('Connecting to Chrome...');
  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });

    const pages = await browser.pages();
    let targetPage = pages.find(p => p.url().includes('publix') || p.url().includes('instacart')) || pages[0];
    
    console.log(`Current page URL: ${targetPage.url()}`);

    // Helper: check if sidebar is visible on-screen
    async function isSidebarOpen() {
      return await targetPage.evaluate(() => {
        const el = document.querySelector('#cart_dialog');
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.left < window.innerWidth;
      });
    }

    // Open drawer if closed
    let open = false;
    for (let retry = 0; retry < 3; retry++) {
      open = await isSidebarOpen();
      if (open) break;

      console.log(`[Open Attempt ${retry + 1}/3] Cart drawer closed. Clicking cart button...`);
      await targetPage.evaluate(() => {
        const floatBtn = document.querySelector('#floating-cart-button') || document.querySelector('[data-testid="floating-cart-button"]');
        if (floatBtn) {
          const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
          floatBtn.dispatchEvent(ev);
        }
      });
      await new Promise(r => setTimeout(r, 3000));
    }

    if (!open) {
      console.log('Failed to open cart sidebar.');
      await browser.disconnect();
      return;
    }

    console.log('Cart sidebar is open. Starting decrement purge loop...');
    let attempts = 0;
    const maxAttempts = 150; // High cap since we have multiple items with quantity > 1

    while (attempts < maxAttempts) {
      const result = await targetPage.evaluate(() => {
        const dialog = document.querySelector('#cart_dialog');
        if (!dialog) return { empty: true, msg: 'Dialog not found' };

        const text = (dialog.innerText || dialog.textContent || '').toLowerCase();
        if (text.includes('your cart is empty') || text.includes('empty cart') || text.includes('no items')) {
          return { empty: true, msg: 'Cart is empty!' };
        }

        // Find all buttons inside the dialog
        const buttons = Array.from(dialog.querySelectorAll('button, a, div[role="button"]'));
        const decBtn = buttons.find(btn => {
          const label = (btn.getAttribute('aria-label') || '').toLowerCase();
          const textVal = (btn.innerText || btn.textContent || '').trim();
          return label.includes('decrement') || label.includes('minus') || label.includes('remove') || label.includes('delete') || textVal === '-';
        });

        if (decBtn) {
          // Find item name for log
          let itemName = 'Unknown Item';
          let parent = decBtn.parentElement;
          for (let depth = 0; depth < 5; depth++) {
            if (!parent) break;
            const titleEl = parent.querySelector('span, a, p, h3');
            if (titleEl && titleEl.innerText.trim().length > 2 && !titleEl.innerText.toLowerCase().includes('remove') && titleEl.innerText.trim() !== '-') {
              itemName = titleEl.innerText.trim();
              break;
            }
            parent = parent.parentElement;
          }

          decBtn.click();
          return { empty: false, msg: `Decremented/Removed item: "${itemName.replace(/\n/g, ' ')}"` };
        }

        return { empty: true, msg: 'No more decrement/remove buttons found in cart sidebar.' };
      });

      console.log(`[Step ${attempts + 1}] ${result.msg}`);
      if (result.empty) {
        break;
      }

      attempts++;
      await new Promise(r => setTimeout(r, 1200)); // wait for quantity change animation
    }

    console.log('Closing cart sidebar...');
    await targetPage.evaluate(() => {
      const dialog = document.querySelector('#cart_dialog');
      if (dialog) {
        const closeBtn = dialog.querySelector('button[aria-label*="Close" i], button[aria-label*="close" i], button[class*="close" i]');
        if (closeBtn) closeBtn.click();
      }
    });
    await new Promise(r => setTimeout(r, 1000));

    console.log('Done!');
    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

clearCart();
