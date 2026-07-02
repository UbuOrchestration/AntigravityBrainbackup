const puppeteer = require('puppeteer');

async function openDrawer() {
  console.log('Connecting to Chrome...');
  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });

    const pages = await browser.pages();
    let targetPage = pages.find(p => p.url().includes('publix') || p.url().includes('instacart')) || pages[0];
    
    console.log(`Current page URL: ${targetPage.url()}`);

    const clicked = await targetPage.evaluate(() => {
      const btn = document.querySelector('#floating-cart-button') || document.querySelector('[data-testid="floating-cart-button"]');
      if (btn) {
        const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
        btn.dispatchEvent(ev);
        return { success: true, selector: '#floating-cart-button' };
      }
      
      const wrapper = document.querySelector('.e-1qrca90') || document.querySelector('button[aria-label*="cart" i]');
      if (wrapper) {
        const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
        wrapper.dispatchEvent(ev);
        return { success: true, selector: 'wrapper class' };
      }

      return { success: false, msg: 'No cart button elements found' };
    });

    console.log(`Click result: ${JSON.stringify(clicked)}`);
    console.log('Waiting 3 seconds for drawer to open...');
    await new Promise(r => setTimeout(r, 3000));

    const screenshotPath = 'C:\\Users\\Ubu\\.gemini\\antigravity\\brain\\9e4b2519-acb8-4623-a3cd-0d977fb64924\\publix_opened_drawer.png';
    await targetPage.screenshot({ path: screenshotPath });
    console.log(`Saved screenshot to ${screenshotPath}`);

    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

openDrawer();
