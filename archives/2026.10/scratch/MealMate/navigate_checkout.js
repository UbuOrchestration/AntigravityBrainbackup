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
    const isVisible = await targetPage.evaluate(() => {
      const el = document.querySelector('#cart_dialog');
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.left < window.innerWidth;
    });

    if (!isVisible) {
      console.log('Opening cart sidebar drawer...');
      await targetPage.evaluate(() => {
        const floatBtn = document.querySelector('#floating-cart-button');
        if (floatBtn) {
          floatBtn.click();
        } else {
          const wrapper = document.querySelector('.e-1qrca90');
          if (wrapper) wrapper.click();
        }
      });
      await new Promise(r => setTimeout(r, 3000));
    }

    console.log('Finding and clicking Go to Checkout button...');
    const clicked = await targetPage.evaluate(() => {
      const dialog = document.querySelector('#cart_dialog');
      if (!dialog) return false;

      const buttons = Array.from(dialog.querySelectorAll('button, a, div[role="button"], span'));
      const checkoutBtn = buttons.find(btn => {
        const text = (btn.innerText || btn.textContent || '').toLowerCase();
        const label = (btn.getAttribute('aria-label') || '').toLowerCase();
        return text.includes('checkout') || label.includes('checkout');
      });

      if (checkoutBtn) {
        checkoutBtn.click();
        return true;
      }
      return false;
    });

    if (clicked) {
      console.log('Clicked Checkout button! Waiting 4 seconds for navigation...');
      await new Promise(r => setTimeout(r, 4000));
      console.log(`Final URL: ${targetPage.url()}`);
    } else {
      console.log('Could not find Checkout button in the cart sidebar.');
    }

    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

goCheckout();
