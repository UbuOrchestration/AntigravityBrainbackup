const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function clearCart() {
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
    if (!page) {
      console.log(`No active tab for ${store.name}. Skipping.`);
      continue;
    }

    console.log(`\n========================================`);
    console.log(`Clearing cart for ${store.name} on tab: ${page.url()}`);
    console.log(`========================================`);

    try {
      await page.bringToFront();
      console.log(`Navigating directly to cart URL: ${store.cartUrl}`);
      await page.goto(store.cartUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await new Promise(r => setTimeout(r, 5000));

      let cleared = false;
      let attempts = 0;
      const maxAttempts = 50;

      while (attempts < maxAttempts) {
        // Find remove buttons on the cart page
        const removeBtnSelector = await page.evaluate(() => {
          // Look for remove buttons on the main cart page
          const buttons = Array.from(document.querySelectorAll('button, a, div[role="button"], [aria-label*="remove" i], [aria-label*="delete" i]'));
          const btn = buttons.find(b => {
            const label = (b.getAttribute('aria-label') || '').toLowerCase();
            const text = (b.innerText || b.textContent || '').trim().toLowerCase();
            return label.includes('remove') || label.includes('delete') || label.includes('remove item') ||
                   text === 'remove' || text === 'delete' || text.includes('remove from cart');
          });
          
          if (btn) {
            // Highlight it for debugging
            btn.style.border = '2px solid red';
            // Click it
            btn.click();
            return true;
          }
          return false;
        });

        if (!removeBtnSelector) {
          console.log('No more remove buttons found.');
          break;
        }

        console.log(`[Attempt ${attempts + 1}] Clicked remove/delete button.`);
        attempts++;
        await new Promise(r => setTimeout(r, 2000)); // Wait for transition
      }

      console.log(`Finished clearing cart for ${store.name}.`);
    } catch (e) {
      console.error(`Error clearing ${store.name} cart:`, e.message);
    }
  }

  await browser.disconnect();
}

clearCart();
