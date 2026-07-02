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

    // Helper to dismiss modals
    async function dismissModals() {
      await targetPage.evaluate(() => {
        const dismiss = Array.from(document.querySelectorAll('button, span, div, p'));
        const confirmBtn = dismiss.find(el => {
          const txt = (el.innerText || el.textContent || '').trim().toLowerCase();
          return txt === 'got it!' || txt === 'got it' || txt === 'confirm';
        });
        if (confirmBtn) confirmBtn.click();
      });
    }

    // Open cart drawer if closed (using 3-retry loop)
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
        } else {
          const wrapper = document.querySelector('.e-1qrca90');
          if (wrapper) {
            const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
            wrapper.dispatchEvent(ev);
          }
        }
      });
      await new Promise(r => setTimeout(r, 3000));
      await dismissModals();
    }

    if (!open) {
      console.log('Failed to open cart sidebar after 3 attempts.');
      await browser.disconnect();
      return;
    }

    console.log('Cart sidebar is open on-screen. Starting removal loop...');
    let attempts = 0;
    const maxAttempts = 60;

    while (attempts < maxAttempts) {
      // Re-verify it is open
      const stillOpen = await isSidebarOpen();
      if (!stillOpen) {
        console.log('Sidebar closed unexpectedly. Re-opening...');
        await targetPage.evaluate(() => {
          const floatBtn = document.querySelector('#floating-cart-button') || document.querySelector('[data-testid="floating-cart-button"]');
          if (floatBtn) {
            const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
            floatBtn.dispatchEvent(ev);
          }
        });
        await new Promise(r => setTimeout(r, 2000));
      }

      const result = await targetPage.evaluate(() => {
        const dialog = document.querySelector('#cart_dialog');
        if (!dialog) return { empty: true, msg: 'Dialog not found' };

        const text = (dialog.innerText || dialog.textContent || '').toLowerCase();
        if (text.includes('your cart is empty') || text.includes('empty cart') || text.includes('no items')) {
          return { empty: true, msg: 'Cart is empty!' };
        }

        // Find remove/delete buttons inside the dialog
        const buttons = Array.from(dialog.querySelectorAll('button, a, div[role="button"]'));
        const removeBtn = buttons.find(btn => {
          const label = (btn.getAttribute('aria-label') || '').toLowerCase();
          const textVal = (btn.innerText || btn.textContent || '').toLowerCase();
          return label.includes('remove') || label.includes('delete') || textVal.trim() === 'remove' || textVal.trim() === 'delete';
        });

        if (removeBtn) {
          let itemName = 'Unknown Item';
          let parent = removeBtn.parentElement;
          for (let depth = 0; depth < 5; depth++) {
            if (!parent) break;
            const titleEl = parent.querySelector('span, a, p, h3');
            if (titleEl && titleEl.innerText.trim().length > 2 && !titleEl.innerText.toLowerCase().includes('remove')) {
              itemName = titleEl.innerText.trim();
              break;
            }
            parent = parent.parentElement;
          }

          removeBtn.click();
          return { empty: false, msg: `Removed item: "${itemName}"` };
        }

        return { empty: true, msg: 'No more remove buttons found in cart sidebar.' };
      });

      console.log(`[Item ${attempts + 1}] ${result.msg}`);
      if (result.empty) {
        break;
      }

      attempts++;
      await new Promise(r => setTimeout(r, 1500)); // wait for item removal transition
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
