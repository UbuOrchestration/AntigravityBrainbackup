const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const finalCartPath = path.join(__dirname, 'final_cart_list.json');

function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

async function dismissModals(page) {
  try {
    const confirmBtn = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('button, div[role="button"], a, span, p'));
      const btn = elements.find(el => {
        const text = (el.innerText || el.textContent || '').trim().toLowerCase();
        return text === 'confirm' || text === 'confirm store' || text === 'use address' || text === 'confirm address';
      });
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    if (confirmBtn) {
      log('✅ Auto-clicked "Confirm" to dismiss preference modal.');
      await new Promise(r => setTimeout(r, 2000));
    }

    const gotItBtn = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('button, div[role="button"], a, span, p'));
      const btn = elements.find(el => {
        const text = (el.innerText || el.textContent || '').trim().toLowerCase();
        return text === 'got it!' || text === 'got it' || text === 'close' || text === 'no thanks';
      });
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    if (gotItBtn) {
      log('✅ Auto-clicked "Got it/Close" to dismiss informational popup.');
      await new Promise(r => setTimeout(r, 1000));
    }
  } catch (err) {
    // Ignore modal errors
  }
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

  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes('publix') || p.url().includes('instacart'));
  if (!page) {
    page = await browser.newPage();
    log('Opened a new browser tab.');
  } else {
    log(`Reusing active browser tab: ${page.url()}`);
    await page.bringToFront();
  }
  
  // Disable default timeouts to prevent crashes during manual CAPTCHA solves
  await page.setDefaultNavigationTimeout(0);
  await page.setDefaultTimeout(60000);

  try {
    // 1. Go to Publix storefront homepage
    log('Navigating to Publix storefront...');
    await page.goto('https://delivery.publix.com/store/publix/storefront', { waitUntil: 'domcontentloaded' });

    // Wait for initial page rendering
    await new Promise(r => setTimeout(r, 5000));
    await dismissModals(page);

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
      const loginButtonSelector = 'button, a';
      const buttons = await page.$$(loginButtonSelector);
      let loginButton = null;
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.innerText || el.textContent || '', btn);
        if (text.trim().toLowerCase() === 'log in') {
          loginButton = btn;
          break;
        }
      }

      if (loginButton) {
        log('Log In button detected. Clicking Log In...');
        await loginButton.click();
        await new Promise(r => setTimeout(r, 5000)); // Wait for modal to render

        // Now look for "Sign on with Publix" or "Log in with Publix"
        const modalButtons = await page.$$('button, a, div[role="button"]');
        let publixLoginBtn = null;
        for (const btn of modalButtons) {
          const text = await page.evaluate(el => el.innerText || el.textContent || '', btn);
          const normText = text.trim().toLowerCase();
          if (normText.includes('publix') && (normText.includes('sign') || normText.includes('log') || normText.includes('account'))) {
            publixLoginBtn = btn;
            break;
          }
        }

        if (publixLoginBtn) {
          log('✅ Clicking "Sign on with Publix"...');
          await publixLoginBtn.click();
          log('Waiting 15 seconds for automatic credentials recognition and redirect...');
          await new Promise(r => setTimeout(r, 15000));
        } else {
          log('⚠️ Could not locate the "Sign on with Publix" button inside the modal.');
        }
      } else {
        log('No "Log In" button found. Assuming session is already active.');
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
        const searchInput = await page.waitForSelector('input[placeholder*="Search" i], input[type="search"], #search-bar-input', { visible: true, timeout: 5000 });
        if (searchInput) {
          // 1. Clear DOM value and dispatch input/change events to update React bindings
          await page.evaluate(() => {
            const input = document.querySelector('input[placeholder*="Search" i], input[type="search"], #search-bar-input');
            if (input) {
              input.value = '';
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
          });

          // 2. Focus and trigger keyboard select-all and backspace to guarantee it is empty
          await searchInput.click();
          await page.keyboard.down('Control');
          await page.keyboard.press('A');
          await page.keyboard.up('Control');
          await page.keyboard.press('Backspace');

          // 3. Type item name and press Enter
          await searchInput.type(item.name, { delay: 100 });
          await page.keyboard.press('Enter');
          searchSuccess = true;
          log('Cleared search bar, typed item name, and submitted query.');
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
      await dismissModals(page);

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
