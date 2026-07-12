const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function capture() {
  console.log('Connecting to Chrome...');
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
  const stores = [
    { name: 'Publix', pattern: 'publix.com', cartUrl: 'https://delivery.publix.com/store/publix/cart' },
    { name: 'Aldi', pattern: 'aldi.us', cartUrl: 'https://www.aldi.us/store/aldi/cart' }
  ];

  for (const store of stores) {
    const page = pages.find(p => p.url().includes(store.pattern));
    if (!page) continue;

    console.log(`\nNavigating to ${store.name} cart page...`);
    await page.bringToFront();
    await page.goto(store.cartUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 6000));

    const shotName = `cart_page_${store.name.toLowerCase()}.png`;
    const dest = path.join(__dirname, 'public', shotName);
    await page.screenshot({ path: dest });
    console.log(`Saved screenshot to ${dest}`);

    // Dump first 20 buttons on the page
    const buttons = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
      return items.map(el => ({
        tag: el.tagName,
        text: (el.innerText || el.textContent || '').trim().substring(0, 60),
        ariaLabel: el.getAttribute('aria-label') || '',
        class: el.className,
        outerHTML: el.outerHTML.slice(0, 150)
      }));
    });

    console.log(`Found ${buttons.length} buttons/clickable elements:`);
    buttons.slice(0, 30).forEach((b, idx) => {
      console.log(`[${idx}] TAG: ${b.tag} | TEXT: "${b.text}" | ARIA: "${b.ariaLabel}" | CLASS: "${b.class}"`);
      console.log(`    HTML: ${b.outerHTML}`);
    });
  }

  await browser.disconnect();
}

capture();
