const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function run() {
  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });
  } catch (err) {
    console.error('Could not connect to Chrome:', err.message);
    return;
  }

  const pages = await browser.pages();
  const publixPage = pages.find(p => p.url().includes('publix.com'));
  if (!publixPage) {
    console.error('No Publix page found');
    await browser.disconnect();
    return;
  }

  console.log('Navigating back to Publix storefront homepage...');
  await publixPage.bringToFront();
  await publixPage.goto('https://delivery.publix.com/store/publix/storefront', { waitUntil: 'domcontentloaded', timeout: 20000 });
  
  console.log('Waiting 8 seconds for page loading and React hydration...');
  await new Promise(r => setTimeout(r, 8000));

  const rect = await publixPage.evaluate(() => {
    const el = document.getElementById('floating-cart-button') || document.querySelector('[data-testid="floating-cart-button"]');
    if (!el) return null;
    const box = el.getBoundingClientRect();
    const center = {
      x: box.left + box.width / 2,
      y: box.top + box.height / 2
    };
    const elementAtPoint = document.elementFromPoint(center.x, center.y);
    return {
      id: el.id,
      text: el.innerText,
      box: { x: box.x, y: box.y, width: box.width, height: box.height },
      visible: box.width > 0 && box.height > 0,
      elementAtPoint: elementAtPoint ? {
        tag: elementAtPoint.tagName,
        id: elementAtPoint.id,
        class: elementAtPoint.className
      } : null
    };
  });

  console.log('Cart Button Info on Storefront:', JSON.stringify(rect, null, 2));

  if (rect && rect.visible) {
    console.log('Clicking the cart button natively...');
    // We can click at the center coordinates
    const clickX = Math.round(rect.box.x + rect.box.width / 2);
    const clickY = Math.round(rect.box.y + rect.box.height / 2);
    await publixPage.mouse.click(clickX, clickY);
    console.log(`Fired native mouse click at: (${clickX}, ${clickY})`);

    console.log('Waiting 4 seconds for cart sidebar to slide open...');
    await new Promise(r => setTimeout(r, 4000));

    // Capture screenshot
    const shotPath = path.join(__dirname, 'public', 'publix_storefront_clicked_cart.png');
    await publixPage.screenshot({ path: shotPath });
    console.log(`Saved screenshot to ${shotPath}`);

    // Check dialog status
    const dialogStatus = await publixPage.evaluate(() => {
      const el = document.querySelector('#cart_dialog');
      if (!el) return 'Not found';
      const box = el.getBoundingClientRect();
      return {
        id: el.id,
        hidden: el.hasAttribute('hidden') || window.getComputedStyle(el).display === 'none',
        rect: { width: box.width, height: box.height, left: box.left }
      };
    });
    console.log('Dialog status:', JSON.stringify(dialogStatus, null, 2));
  } else {
    console.log('Cart button is not visible or not found.');
  }

  await browser.disconnect();
}

run();
