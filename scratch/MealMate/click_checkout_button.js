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

    console.log('Locating the checkout button element...');
    const result = await targetPage.evaluate(() => {
      const dialog = document.querySelector('#cart_dialog');
      if (!dialog) return { clicked: false, msg: 'Dialog not found' };

      // Find all buttons inside the dialog
      const buttons = Array.from(dialog.querySelectorAll('button, a'));
      const checkoutBtn = buttons.find(btn => {
        const text = (btn.innerText || btn.textContent || '').toLowerCase();
        return text.includes('checkout');
      });

      if (checkoutBtn) {
        // Dispatch MouseEvent directly on the button element
        const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
        checkoutBtn.dispatchEvent(ev);
        return { clicked: true, tagName: checkoutBtn.tagName, text: checkoutBtn.innerText };
      }

      return { clicked: false, msg: 'No button containing checkout found' };
    });

    console.log(`Click result: ${JSON.stringify(result)}`);

    if (result.clicked) {
      console.log('Waiting 5 seconds for Checkout page to load...');
      await new Promise(r => setTimeout(r, 5000));
      console.log(`Final URL: ${targetPage.url()}`);
    }

    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

goCheckout();
