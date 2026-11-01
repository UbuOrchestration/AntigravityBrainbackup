const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const finalCartPath = path.join(__dirname, 'final_cart_list.json');

function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

async function runPublixCartBuilder() {
  log('Starting Live Publix Cart Builder in-browser...');

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

  log(`Launching Google Chrome for live automation...`);
  
  // Launch the user's local Google Chrome browser visibly
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Avoid timeouts and set real browser headers
  await page.setDefaultNavigationTimeout(0);
  await page.setDefaultTimeout(60000);
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  try {
    // 1. Go to Publix storefront homepage
    log('Navigating to Publix storefront...');
    await page.goto('https://delivery.publix.com', { waitUntil: 'domcontentloaded' });

    // Wait a brief period for any location/zip code prompts
    log('Please ensure your store location is selected in the opened Chrome window. Waiting 10 seconds...');
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

      // Attempt to click the first Add to Cart button
      let clicked = false;
      
      // We try different selectors that match Instacart's "Add to Cart" or "+" button
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
            // Check if element is visible and clickable
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
          // Ignore error and try next selector
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
        log(`⚠️ Could not automatically click "Add" button. Please click it manually in the Chrome window if needed.`);
      } else {
        log(`Successfully added: "${item.name}"`);
      }

      // Wait 3 seconds before next search
      await new Promise(r => setTimeout(r, 3000));
    }

    log('==================================================');
    log('All items processed! Keeping browser open so you can review your cart.');
    log('==================================================');

    // Keep browser open for 10 minutes (600 seconds) so user can complete order
    await new Promise(r => setTimeout(r, 600000));

  } catch (error) {
    log(`Error during Publix cart automation: ${error.message}`);
  } finally {
    try {
      await browser.close();
      log('Browser closed.');
    } catch (e) {}
  }
}

runPublixCartBuilder();
