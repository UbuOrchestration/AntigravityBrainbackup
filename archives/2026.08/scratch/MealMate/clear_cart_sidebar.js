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

    // Check if cart dialog is visible on the screen
    let isVisible = await targetPage.evaluate(() => {
      const el = document.querySelector('#cart_dialog');
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none';
    });

    if (!isVisible) {
      console.log('Cart sidebar drawer is not visible. Clicking .e-1qrca90 to open it...');
      await targetPage.evaluate(() => {
        const el = document.querySelector('.e-1qrca90');
        if (el) {
          const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
          el.dispatchEvent(ev);
        }
      });
      await new Promise(r => setTimeout(r, 3000));
    }

    console.log('Beginning item removal loop...');
    let attempts = 0;
    const maxAttempts = 60; // Safety cap

    while (attempts < maxAttempts) {
      const result = await targetPage.evaluate(() => {
        const dialog = document.querySelector('#cart_dialog');
        if (!dialog) return { empty: true, msg: 'Cart dialog #cart_dialog not found.' };

        const text = (dialog.innerText || dialog.textContent || '').toLowerCase();
        if (text.includes('your cart is empty') || text.includes('empty cart') || text.includes('no items')) {
          return { empty: true, msg: 'Cart is empty!' };
        }

        // Find remove/delete buttons inside the dialog
        const buttons = Array.from(dialog.querySelectorAll('button, a, div[role="button"]'));
        const removeBtn = buttons.find(btn => {
          const label = (btn.getAttribute('aria-label') || '').toLowerCase();
          const text = (btn.innerText || btn.textContent || '').toLowerCase();
          return label.includes('remove') || label.includes('delete') || text.trim() === 'remove' || text.trim() === 'delete';
        });

        if (removeBtn) {
          removeBtn.click();
          return { empty: false, msg: 'Clicked remove button.' };
        }

        return { empty: true, msg: 'No more remove buttons found inside the dialog.' };
      });

      console.log(`[Attempt ${attempts + 1}] ${result.msg}`);
      if (result.empty) {
        break;
      }

      attempts++;
      await new Promise(r => setTimeout(r, 2000)); // Wait for transition/re-render
    }

    console.log('Closing cart sidebar drawer...');
    await targetPage.evaluate(() => {
      const dialog = document.querySelector('#cart_dialog');
      if (dialog) {
        const closeBtn = dialog.querySelector('button[aria-label*="Close" i], button[aria-label*="close" i], button[class*="close" i]');
        if (closeBtn) closeBtn.click();
      }
    });
    await new Promise(r => setTimeout(r, 1500));

    console.log('Done!');
    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

clearCart();
