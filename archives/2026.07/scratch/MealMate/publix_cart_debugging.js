const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const finalCartPath = path.join(__dirname, 'final_cart_list.json');

function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

async function runLiveCartBuilder() {
  log('Connecting to your active Chrome browser on port 9222...');

  if (!fs.existsSync(finalCartPath)) {
    log('Error: final_cart_list.json not found. Aborting.');
    return;
  }

  const finalCart = JSON.parse(fs.readFileSync(finalCartPath, 'utf8'));
  const items = Object.values(finalCart);

  if (items.length === 0) {
    log('No items in the shopping list. Aborting.');
    return;
  }

  let browser;
  try {
    // Connect to the user's running Chrome window
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });
    log('Successfully connected to Chrome!');
  } catch (err) {
    log(`Error: Could not connect to Chrome on port 9222. Make sure Chrome was started with --remote-debugging-port=9222. Details: ${err.message}`);
    return;
  }

  const page = await browser.newPage();
  // Disable default timeouts to prevent crashes during manual CAPTCHA solves
  await page.setDefaultNavigationTimeout(0);
  await page.setDefaultTimeout(60000);

  try {
    // 1. Go to Publix storefront homepage
    log('Navigating to Publix storefront...');
    await page.goto('https://delivery.publix.com', { waitUntil: 'domcontentloaded' });

    // Wait a brief period for any location/zip code prompts
    log('Please ensure your store location is selected in your Chrome window. Waiting 10 seconds...');
    await new Promise(r => setTimeout(r, 10000));

    // 2. Iterate and add items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      log(`--------------------------------------------------`);
      log(`[Item ${i+1}/${items.length}] Searching for: "${item.name}"`);

      const searchUrl = `https://delivery.publix.com/store/publix/search/${encodeURIComponent(item.name)}`;
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });

      // Wait for results to load
      await new Promise(r => setTimeout(r, 4000));

      // Attempt to click the Add to Cart button
      let clicked = false;
      
      const selectors = [
        'button[aria-label*="Add to cart" i]',
        'button[aria-label*="Add" i]',
        'button[aria-label*="Add item" i]',
        'button.legacy-button-primary',
        'button[aria-label*="Increment" i]'
      ];

      for (const selector of selectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            const isVisible = await page.evaluate(el => {
              const rect = el.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none';
            }, button);

            if (isVisible) {
              await button.click();
              log(`✅ Automatically clicked "Add" button using selector: ${selector}`);
              clicked = true;
              break;
            }
          }
        } catch (e) {
          // Try next selector
        }
      }

      if (!clicked) {
        // Try XPath search for button containing "Add" text
        try {
          const xpathSelector = "xpath///button[contains(translate(., 'ADD', 'add'), 'add')]";
          const button = await page.$(xpathSelector);
          if (button) {
            await button.click();
            log(`✅ Automatically clicked "Add" button using XPath search.`);
            clicked = true;
          }
        } catch (e) {
          // Ignore XPath error
        }
      }

      if (!clicked) {
        log(`⚠️ Could not automatically click "Add" button. Please click it manually in your Chrome window.`);
      } else {
        log(`Successfully added: "${item.name}"`);
      }

      // Wait 3 seconds before next search
      await new Promise(r => setTimeout(r, 3000));
    }

    log('==================================================');
    log('All items processed! Opening your checkout cart page...');
    log('==================================================');

    await page.goto('https://delivery.publix.com/store/cart', { waitUntil: 'domcontentloaded' });

  } catch (error) {
    log(`Error during Publix cart automation: ${error.message}`);
  } finally {
    // We disconnect so the browser remains open for the user!
    await browser.disconnect();
    log('Disconnected from Chrome. The browser window remains open for you.');
  }
}

runLiveCartBuilder();
