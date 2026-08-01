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

    // Check if the checkout button is already present and visible in the DOM
    let checkoutBtnExists = await targetPage.evaluate(() => {
      const btn = document.querySelector('#cart-checkout-button');
      if (!btn) return false;
      const rect = btn.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && window.getComputedStyle(btn).display !== 'none';
    });

    if (!checkoutBtnExists) {
      console.log('Checkout button not visible. Opening cart drawer first...');
      
      // Dispatch bubbling click MouseEvent to floatBtn or count wrapper
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
      
      console.log('Waiting 3 seconds for cart drawer to open...');
      await new Promise(r => setTimeout(r, 3000));
    }

    console.log('Clicking #cart-checkout-button...');
    const result = await targetPage.evaluate(() => {
      const btn = document.querySelector('#cart-checkout-button');
      if (btn) {
        const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
        btn.dispatchEvent(ev);
        btn.click(); // Call native click as well for safety
        return { clicked: true, text: btn.innerText };
      }
      return { clicked: false };
    });

    console.log(`Click result: ${JSON.stringify(result)}`);

    if (result.clicked) {
      console.log('Waiting 6 seconds for Checkout page navigation...');
      await new Promise(r => setTimeout(r, 6000));
      
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
