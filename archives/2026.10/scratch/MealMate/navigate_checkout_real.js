const puppeteer = require('puppeteer');

async function goCheckout() {
  console.log('Connecting to Chrome...');
  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });

    const pages = await browser.pages();
    let targetPage = pages.find(p => p.url().includes('publix') || p.url().includes('instacart')) || pages[0];
    
    console.log(`Current URL: ${targetPage.url()}`);

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
    let open = await isSidebarOpen();
    if (!open) {
      console.log('Cart drawer is closed. Clicking floating-cart-button to open it...');
      await targetPage.evaluate(() => {
        const floatBtn = document.querySelector('#floating-cart-button') || document.querySelector('[data-testid="floating-cart-button"]');
        if (floatBtn) {
          floatBtn.click();
        } else {
          const wrapper = document.querySelector('.e-1qrca90') || document.querySelector('button[aria-label*="cart" i]');
          if (wrapper) {
            const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
            wrapper.dispatchEvent(ev);
          }
        }
      });
      await new Promise(r => setTimeout(r, 3000));
    }

    // Re-verify open
    open = await isSidebarOpen();
    if (!open) {
      console.log('Failed to open cart drawer!');
      await browser.disconnect();
      return;
    }

    console.log('Cart drawer is open. Clicking Checkout button...');
    const result = await targetPage.evaluate(() => {
      const dialog = document.querySelector('#cart_dialog');
      if (!dialog) return { clicked: false, msg: 'Dialog not found' };

      const all = Array.from(dialog.querySelectorAll('*'));
      const checkoutBtn = all.find(el => {
        const text = (el.innerText || el.textContent || '').toLowerCase();
        return text.includes('checkout');
      });

      if (checkoutBtn) {
        const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
        checkoutBtn.dispatchEvent(ev);
        return { clicked: true, tagName: checkoutBtn.tagName, text: checkoutBtn.innerText };
      }

      return { clicked: false, msg: 'Checkout button not found inside dialog' };
    });

    console.log(`Click result: ${JSON.stringify(result)}`);

    if (result.clicked) {
      console.log('Waiting 5 seconds for Checkout page navigation...');
      await new Promise(r => setTimeout(r, 5000));
      
      const screenshotPath = 'C:\\Users\\Ubu\\.gemini\\antigravity\\brain\\9e4b2519-acb8-4623-a3cd-0d977fb64924\\publix_checkout_navigated.png';
      await targetPage.screenshot({ path: screenshotPath });
      console.log(`Saved screenshot to ${screenshotPath}`);
      console.log(`Final URL: ${targetPage.url()}`);
    }

    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

goCheckout();
