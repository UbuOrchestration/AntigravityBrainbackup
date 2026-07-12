const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testOpen() {
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
    console.error('No Publix page found.');
    await browser.disconnect();
    return;
  }

  console.log(`Testing open on page: ${publixPage.url()}`);
  await publixPage.bringToFront();

  // Try to click the floating cart button natively
  try {
    await publixPage.click('#floating-cart-button');
    console.log('Clicked #floating-cart-button natively.');
  } catch (e) {
    console.error('Failed native click:', e.message);
  }

  await new Promise(r => setTimeout(r, 4000));

  // Capture screenshot and check status of #cart_dialog
  const screenshotPath = path.join(__dirname, 'public', 'test_cart_opened.png');
  await publixPage.screenshot({ path: screenshotPath });
  console.log(`Saved screenshot to ${screenshotPath}`);

  const dialogState = await publixPage.evaluate(() => {
    const el = document.querySelector('#cart_dialog');
    if (!el) return 'Not found';
    const rect = el.getBoundingClientRect();
    return {
      id: el.id,
      hidden: el.hasAttribute('hidden'),
      rect: {
        width: rect.width,
        height: rect.height,
        left: rect.left,
        top: rect.top
      },
      outerHTML: el.outerHTML.slice(0, 200)
    };
  });

  console.log('Dialog state:', JSON.stringify(dialogState, null, 2));
  await browser.disconnect();
}

testOpen();
