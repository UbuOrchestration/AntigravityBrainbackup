const puppeteer = require('puppeteer');

async function check() {
  console.log('Connecting to Chrome...');
  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });

    const pages = await browser.pages();
    let targetPage = pages.find(p => p.url().includes('publix') || p.url().includes('instacart')) || pages[0];
    
    const rect = await targetPage.evaluate(() => {
      const el = document.querySelector('#cart_dialog');
      if (!el) return 'Not found';
      const r = el.getBoundingClientRect();
      return {
        left: r.left,
        right: r.right,
        top: r.top,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
        windowWidth: window.innerWidth,
        display: window.getComputedStyle(el).display,
        visibility: window.getComputedStyle(el).visibility,
        opacity: window.getComputedStyle(el).opacity
      };
    });

    console.log('Cart Dialog Rect Info:');
    console.log(rect);

    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

check();
