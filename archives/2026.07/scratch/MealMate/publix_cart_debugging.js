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
    await page.goto('https://delivery.publix.com/store/publix/storefront', { waitUntil: 'domcontentloaded' });

    // Wait for initial page rendering
    await new Promise(r => setTimeout(r, 5000));

    // Try to auto-select "Delivery"
    log('Attempting to automatically select Delivery...');
    try {
      const clickedDelivery = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('button, div[role="button"], a, span, p'));
        const deliveryEl = elements.find(el => {
          const text = el.innerText || el.textContent || '';
          return text.trim().toLowerCase() === 'delivery';
        });
        if (deliveryEl) {
          deliveryEl.click();
          return true;
        }
        return false;
      });
      if (clickedDelivery) {
        log('✅ Auto-clicked "Delivery" button!');
        await new Promise(r => setTimeout(r, 3000));
      } else {
        log('⚠️ Could not find "Delivery" button text. Proceeding...');
      }
    } catch (err) {
      log(`Error auto-clicking Delivery: ${err.message}`);
    }

    // Try to auto-enter ZIP code if prompted
    try {
      const addressEntered = await page.evaluate((zip) => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const zipInput = inputs.find(i => {
          const placeholder = (i.placeholder || '').toLowerCase();
          const name = (i.name || '').toLowerCase();
          const id = (i.id || '').toLowerCase();
          return placeholder.includes('zip') || placeholder.includes('address') || 
                 name.includes('zip') || name.includes('address') || 
                 id.includes('zip') || id.includes('address');
        });
        if (zipInput) {
          zipInput.focus();
          zipInput.value = zip;
          zipInput.dispatchEvent(new Event('input', { bubbles: true }));
          zipInput.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
        return false;
      }, '32825');

      if (addressEntered) {
        log('✅ Auto-entered ZIP code 32825 into input field!');
        await new Promise(r => setTimeout(r, 1000));
        await page.keyboard.press('Enter');
        await new Promise(r => setTimeout(r, 4000));
      }
    } catch (err) {
      log(`Error entering ZIP code: ${err.message}`);
    }

    // Try to ensure we are logged in
    log('Checking if login is required...');
    try {
      const needsLogin = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('button, a, div[role="button"], span, p'));
        const loginEl = elements.find(el => {
          const text = (el.innerText || el.textContent || '').trim().toLowerCase();
          return text === 'log in' || text === 'sign in';
        });
        if (loginEl) {
          loginEl.click();
          return true;
        }
        return false;
      });

      if (needsLogin) {
        log('Log In prompt detected. Clicking and waiting for login options to load...');
        await new Promise(r => setTimeout(r, 4000));

        const clickedPublixLogin = await page.evaluate(() => {
          const elements = Array.from(document.querySelectorAll('button, a, div[role="button"], span, p'));
          const publixBtn = elements.find(el => {
            const text = (el.innerText || el.textContent || '').toLowerCase();
            return text.includes('publix') && (text.includes('sign') || text.includes('log') || text.includes('account'));
          });
          if (publixBtn) {
            publixBtn.click();
            return true;
          }
          return false;
        });

        if (clickedPublixLogin) {
          log('✅ Clicked "Log in with Publix". Waiting 10 seconds for automatic profile recognition and sign-in...');
          await new Promise(r => setTimeout(r, 10000));
        } else {
          log('⚠️ Could not locate "Log in with Publix" button. Trying to continue...');
        }
      } else {
        log('No "Log In" button detected. Assuming session is already active.');
      }
    } catch (err) {
      log(`Error during login check: ${err.message}`);
    }

    log('Setup finished. Waiting 5 seconds before beginning items addition...');
    await new Promise(r => setTimeout(r, 5000));

    // 2. Iterate and add items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      log(`--------------------------------------------------`);
      log(`[Item ${i+1}/${items.length}] Searching for: "${item.name}"`);

      let searchSuccess = false;
      try {
        const searchInput = await page.$('input[placeholder*="Search" i], input[type="search"], #search-bar-input');
        if (searchInput) {
          await searchInput.click({ clickCount: 3 });
          await page.keyboard.press('Backspace');
          await searchInput.type(item.name, { delay: 100 });
          await page.keyboard.press('Enter');
          searchSuccess = true;
          log('Typed item name into search input and submitted query.');
        }
      } catch (e) {
        log(`Failed search bar entry: ${e.message}. Falling back to direct URL search.`);
      }

      if (!searchSuccess) {
        const searchUrl = `https://delivery.publix.com/store/publix/search/${encodeURIComponent(item.name)}`;
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
      }

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
