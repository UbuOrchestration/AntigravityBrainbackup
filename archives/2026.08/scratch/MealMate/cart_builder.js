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
    const clicked = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('button, div[role="button"]'));
      const btn = elements.find(el => {
        const text = (el.innerText || el.textContent || '').trim().toLowerCase();
        return text === 'confirm' || text === 'confirm store' || text === 'use address' || 
               text === 'confirm address' || text === 'got it!' || text === 'got it' || 
               text === 'close' || text === 'no thanks';
      });
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    if (clicked) {
      log('✅ Auto-dismissed overlay/modal.');
      await new Promise(r => setTimeout(r, 2000));
    }
  } catch (err) {
    // Ignore modal errors
  }
}

async function emptyCartInSidebar(page) {
  log('Opening cart sidebar pop-out to empty existing items...');
  try {
    let open = false;
    for (let retry = 0; retry < 3; retry++) {
      open = await page.evaluate(() => {
        const el = document.querySelector('#cart_dialog');
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.left < window.innerWidth &&
               window.getComputedStyle(el).display !== 'none' && !el.hasAttribute('hidden');
      });

      if (open) break;

      log(`[Open Cart Attempt ${retry + 1}/3] Cart drawer closed. Clicking cart button natively...`);
      const rect = await page.evaluate(() => {
        const el = document.getElementById('floating-cart-button') || document.querySelector('[data-testid="floating-cart-button"]');
        if (!el) return null;
        const box = el.getBoundingClientRect();
        return { x: box.x, y: box.y, width: box.width, height: box.height };
      });

      if (rect) {
        const clickX = Math.round(rect.x + rect.width / 2);
        const clickY = Math.round(rect.y + rect.height / 2);
        await page.mouse.click(clickX, clickY);
      } else {
        try {
          await page.click('#floating-cart-button, [data-testid="floating-cart-button"], button[aria-label*="cart" i]');
        } catch (e) {}
      }

      await new Promise(r => setTimeout(r, 4000));
      await dismissModals(page); // Dismiss any preference modals interrupting drawer open!
    }

    if (!open) {
      log('⚠️ Could not open cart sidebar after 3 attempts. Proceeding with caution...');
      return;
    }

    log('Beginning item removal loop in sidebar...');
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      // Re-verify it remains open
      const stillOpen = await page.evaluate(() => {
        const el = document.querySelector('#cart_dialog');
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.left < window.innerWidth &&
               window.getComputedStyle(el).display !== 'none' && !el.hasAttribute('hidden');
      });

      if (!stillOpen) {
        log('Sidebar closed unexpectedly. Re-opening...');
        const rect = await page.evaluate(() => {
          const el = document.getElementById('floating-cart-button') || document.querySelector('[data-testid="floating-cart-button"]');
          if (!el) return null;
          const box = el.getBoundingClientRect();
          return { x: box.x, y: box.y, width: box.width, height: box.height };
        });
        if (rect) {
          const clickX = Math.round(rect.x + rect.width / 2);
          const clickY = Math.round(rect.y + rect.height / 2);
          await page.mouse.click(clickX, clickY);
        }
        await new Promise(r => setTimeout(r, 2000));
      }

      const buttonData = await page.evaluate(() => {
        const dialog = document.querySelector('#cart_dialog');
        if (!dialog) return { found: false, msg: 'Cart dialog not found.' };

        const text = (dialog.innerText || dialog.textContent || '').toLowerCase();
        if (text.includes('your cart is empty') || text.includes('empty cart') || text.includes('no items')) {
          return { found: false, msg: 'Cart is empty!' };
        }

        const buttons = Array.from(dialog.querySelectorAll('button, a, [role="button"]'));
        const target = buttons.find(b => {
          const label = (b.getAttribute('aria-label') || '').toLowerCase();
          const textVal = (b.innerText || b.textContent || '').trim();
          return label.includes('decrement') || label.includes('minus') || label.includes('remove') || label.includes('delete') || 
                 textVal === '-' || textVal.toLowerCase().includes('remove') || textVal.toLowerCase().includes('delete');
        });

        if (target) {
          const box = target.getBoundingClientRect();
          return {
            found: true,
            box: { x: box.x, y: box.y, width: box.width, height: box.height }
          };
        }
        return { found: false, msg: 'No remove/decrement buttons found in cart.' };
      });

      if (!buttonData.found) {
        log(buttonData.msg);
        break;
      }

      // Click natively at coordinates
      const clickX = Math.round(buttonData.box.x + buttonData.box.width / 2);
      const clickY = Math.round(buttonData.box.y + buttonData.box.height / 2);
      await page.mouse.click(clickX, clickY);

      attempts++;
      await new Promise(r => setTimeout(r, 1500)); // wait for item removal transition
    }

    log('Closing cart sidebar pop-out...');
    await page.evaluate(() => {
      const dialog = document.querySelector('#cart_dialog');
      if (dialog) {
        const closeBtn = dialog.querySelector('button[aria-label*="Close" i], button[aria-label*="close" i], button[class*="close" i]');
        if (closeBtn) closeBtn.click();
      }
    });
    await new Promise(r => setTimeout(r, 1500));

  } catch (err) {
    log(`Failed to empty cart: ${err.message}`);
  }
}

async function buildStoreCart(page, storeName, items, homepageUrl, searchUrlPrefix) {
  log(`\n==================================================`);
  log(`   STARTING CART BUILDER FOR: ${storeName.toUpperCase()}`);
  log(`==================================================`);
  
  log(`Navigating to ${storeName} storefront...`);
  try {
    await page.goto(homepageUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
  } catch (err) {
    log(`Storefront navigation warning: ${err.message}. Continuing...`);
  }
  await new Promise(r => setTimeout(r, 6000));
  await dismissModals(page);

  // Try to ensure ZIP is correct
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
      log('✅ Auto-entered ZIP code 32825.');
      await new Promise(r => setTimeout(r, 1000));
      await page.keyboard.press('Enter');
      await new Promise(r => setTimeout(r, 4000));
    }
  } catch (err) {
    // Ignore zip entry errors
  }

  // Hydrate cart check
  log('Waiting for cart count hydration...');
  try {
    await page.waitForFunction(() => {
      const el = document.querySelector('#floating-cart-button') || document.querySelector('.e-1qrca90');
      if (!el) return false;
      const text = el.innerText || el.textContent || '';
      return /\d+/.test(text);
    }, { timeout: 15000 });
    log('✅ Cart count hydrated!');
  } catch (e) {
    log('⚠️ Timeout waiting for cart hydration. Proceeding anyway...');
  }

  // Purge cart
  await emptyCartInSidebar(page);
  await new Promise(r => setTimeout(r, 2000));

  // Loop and search items
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    // Clean query to drop weight
    const cleanSearchQuery = (name) => {
      // Remove parentheses and common weights inside them
      let clean = name.replace(/\s*\([^)]+\)/g, '');
      // Remove trailing weights like "15 oz", "1 lb", "18-ct", "18 ct", "3-pack", "3 pack"
      clean = clean.replace(/\b\d+[\s-]*(oz|ct|lb|lbs|g|gram|count|block|can|pack|bag|box|container)\b/i, '');
      return clean.trim();
    };
    const searchQuery = cleanSearchQuery(item.name);
    log(`--------------------------------------------------`);
    log(`[${storeName} - Item ${i+1}/${items.length}] Searching: "${searchQuery}" (Cleaned from "${item.name}")`);

    const searchUrl = `${searchUrlPrefix}${encodeURIComponent(searchQuery)}`;
    log(`Navigating directly to search URL: ${searchUrl}`);
    try {
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    } catch (gotoErr) {
      log(`Navigation warning: ${gotoErr.message}. Continuing...`);
    }

    await new Promise(r => setTimeout(r, 4000));
    await dismissModals(page);

    let targetQty = item.amount;
    if (item.bogo) {
      targetQty = Math.ceil(item.amount / 2) * 2;
      log(`BOGO optimization: target quantity set to ${targetQty}.`);
    }

    let clicked = false;
    try {
      const selectionResult = await page.evaluate((itemName) => {
        const words = itemName.toLowerCase().replace(/[()]/g, '').replace(/-/g, ' ').split(/\s+/).filter(w => w.length > 2);
        if (words.length === 0) return null;

        const keySynonyms = {
          'garbanzo': ['garbanzo', 'chickpea', 'chick-pea'],
          'feta': ['feta'],
          'shrimp': ['shrimp', 'prawn'],
          'peppers': ['pepper', 'peppers'],
          'zucchini': ['zucchini', 'squash'],
          'eggs': ['egg', 'eggs'],
          'chicken': ['chicken', 'poultry'],
          'salmon': ['salmon', 'fish'],
          'tomatoes': ['tomato', 'tomatoes']
        };

        const lowerItemName = itemName.toLowerCase();
        let requiredSynonyms = [];
        for (const [key, synonyms] of Object.entries(keySynonyms)) {
          if (lowerItemName.includes(key)) {
            requiredSynonyms = synonyms;
            break;
          }
        }

        const cards = Array.from(document.querySelectorAll('[class*="item-card" i], [class*="ItemCard" i], li[class*="item" i], [data-testid*="item" i]'));
        for (const card of cards) {
          const text = (card.innerText || card.textContent || '').toLowerCase();
          const title = text.split('\n')[0] || '';
          
          if (requiredSynonyms.length > 0) {
            const matchesSynonym = requiredSynonyms.some(syn => text.includes(syn));
            if (!matchesSynonym) continue;
          }

          const matches = words.every(word => text.includes(word)) || words.some(word => text.includes(word));
          if (matches) {
            const addBtn = card.querySelector('button[aria-label*="Add to cart" i], button[aria-label*="Add" i], button[aria-label*="add" i]');
            if (addBtn) {
              const rect = addBtn.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, title: title };
              }
            }
          }
        }
        return null;
      }, item.name);

      if (!selectionResult) {
        const fallbackBtnBox = await page.evaluate(() => {
          const addBtn = document.querySelector('button[aria-label*="Add to cart" i], button[aria-label*="Add" i], button[aria-label*="add" i]');
          if (addBtn) {
            const rect = addBtn.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, title: 'First Add Button' };
            }
          }
          return null;
        });
        if (fallbackBtnBox) {
          log(`Fallback matching: using first Add button on screen.`);
          const clickX = Math.round(fallbackBtnBox.x + fallbackBtnBox.width / 2);
          const clickY = Math.round(fallbackBtnBox.y + fallbackBtnBox.height / 2);
          await page.mouse.click(clickX, clickY);
          clicked = true;
          await new Promise(r => setTimeout(r, 2000));
        }
      } else {
        log(`Matched item: "${selectionResult.title}"`);
        const clickX = Math.round(selectionResult.x + selectionResult.width / 2);
        const clickY = Math.round(selectionResult.y + selectionResult.height / 2);
        await page.mouse.click(clickX, clickY);
        log(`✅ Clicked Add button natively at (${clickX}, ${clickY})`);
        clicked = true;
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (err) {
      log(`Evaluation failed: ${err.message}`);
    }

    if (!clicked) {
      log('⚠️ Could not automatically click Add button. Please click manually.');
    } else {
      if (targetQty > 1) {
        log(`Incrementing quantity to ${targetQty}...`);
        for (let q = 1; q < targetQty; q++) {
          const plusBtnBox = await page.evaluate((itemName) => {
            const words = itemName.toLowerCase().replace(/[()]/g, '').replace(/-/g, ' ').split(/\s+/).filter(w => w.length > 2);
            const cards = Array.from(document.querySelectorAll('[class*="item-card" i], [class*="ItemCard" i], li[class*="item" i], [data-testid*="item" i]'));
            
            for (const card of cards) {
              const text = (card.innerText || card.textContent || '').toLowerCase();
              const matches = words.some(w => text.includes(w));
              if (matches) {
                const plusBtn = card.querySelector('button[aria-label*="Increment" i], button[aria-label*="add another" i], button[aria-label*="plus" i], [class*="increment" i]');
                if (plusBtn) {
                  const rect = plusBtn.getBoundingClientRect();
                  if (rect.width > 0 && rect.height > 0) {
                    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
                  }
                }
              }
            }
            return null;
          }, item.name);

          if (plusBtnBox) {
            const clickX = Math.round(plusBtnBox.x + plusBtnBox.width / 2);
            const clickY = Math.round(plusBtnBox.y + plusBtnBox.height / 2);
            await page.mouse.click(clickX, clickY);
            log(`✅ Incremented (qty ${q + 1}/${targetQty}) at (${clickX}, ${clickY}).`);
            await new Promise(r => setTimeout(r, 1500));
          } else {
            log(`⚠️ Could not locate plus button for incrementing.`);
            break;
          }
        }
      }
    }

    await new Promise(r => setTimeout(r, 3000));
  }

  log(`Checkout navigation for ${storeName}...`);
  try {
    let checkoutBtnExists = await page.evaluate(() => {
      const btn = document.querySelector('#cart-checkout-button');
      if (!btn) return false;
      const rect = btn.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });

    if (!checkoutBtnExists) {
      await page.evaluate(() => {
        const floatBtn = document.querySelector('#floating-cart-button') || document.querySelector('[data-testid="floating-cart-button"]');
        if (floatBtn) {
          const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
          floatBtn.dispatchEvent(ev);
        }
      });
      await new Promise(r => setTimeout(r, 3000));
    }

    await page.evaluate(() => {
      const btn = document.querySelector('#cart-checkout-button');
      if (btn) {
        const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
        btn.dispatchEvent(ev);
        btn.click();
      }
    });
    await new Promise(r => setTimeout(r, 6000));
    log(`✅ Checkout page loaded! Current URL: ${page.url()}`);
  } catch (e) {
    log(`Error going to checkout: ${e.message}`);
  }
}

async function runLiveCartBuilder() {
  log('Connecting to Chrome on port 9222...');
  if (!fs.existsSync(finalCartPath)) {
    log('final_cart_list.json not found.');
    return;
  }

  const finalCart = JSON.parse(fs.readFileSync(finalCartPath, 'utf8'));
  const items = Object.values(finalCart);

  if (items.length === 0) {
    log('Shopping list is empty.');
    return;
  }

  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });
    log('Successfully connected to Chrome!');
  } catch (err) {
    log(`Could not connect to Chrome on 9222. Details: ${err.message}`);
    return;
  }

  const pages = await browser.pages();

  const targetStoreArg = process.argv[2] ? process.argv[2].trim().toLowerCase() : null;
  if (targetStoreArg) {
    log(`🎯 Target store filter active: "${targetStoreArg}"`);
  }

  // Group items by store
  const storeGroups = {};
  items.forEach(item => {
    const store = (item.store || 'Publix').trim();
    if (!storeGroups[store]) {
      storeGroups[store] = [];
    }
    storeGroups[store].push(item);
  });

  try {
    // Process Publix
    if ((!targetStoreArg || targetStoreArg === 'publix') && storeGroups['Publix'] && storeGroups['Publix'].length > 0) {
      // Look for an existing Publix tab or create one
      let publixPage = pages.find(p => p.url().includes('publix.com') && p.url().includes('storefront'));
      if (!publixPage) publixPage = pages.find(p => p.url().includes('publix.com'));
      if (!publixPage) publixPage = await browser.newPage();
      
      await publixPage.setDefaultNavigationTimeout(30000);
      await publixPage.setDefaultTimeout(60000);
      await publixPage.bringToFront();

      await buildStoreCart(
        publixPage,
        'Publix',
        storeGroups['Publix'],
        'https://delivery.publix.com/store/publix/storefront',
        'https://delivery.publix.com/store/publix/s?k='
      );
    }

    // Process Aldi
    if ((!targetStoreArg || targetStoreArg === 'aldi') && storeGroups['Aldi'] && storeGroups['Aldi'].length > 0) {
      // Look for an existing Aldi tab or create one
      let aldiPage = pages.find(p => p.url().includes('aldi.us') && p.url().includes('storefront'));
      if (!aldiPage) aldiPage = pages.find(p => p.url().includes('aldi.us') || p.url().includes('store/aldi'));
      if (!aldiPage) aldiPage = await browser.newPage();
      
      await aldiPage.setDefaultNavigationTimeout(30000);
      await aldiPage.setDefaultTimeout(60000);
      await aldiPage.bringToFront();

      await buildStoreCart(
        aldiPage,
        'Aldi',
        storeGroups['Aldi'],
        'https://www.aldi.us/store/aldi/storefront',
        'https://www.aldi.us/store/aldi/s?k='
      );
    }

    // Process other stores
    for (const storeName of Object.keys(storeGroups)) {
      if (storeName !== 'Publix' && storeName !== 'Aldi') {
        const slug = storeName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        if (targetStoreArg && targetStoreArg !== slug) continue;
        
        let otherPage = pages.find(p => p.url().includes(slug));
        if (!otherPage) otherPage = await browser.newPage();
        
        await otherPage.setDefaultNavigationTimeout(30000);
        await otherPage.setDefaultTimeout(60000);
        await otherPage.bringToFront();

        await buildStoreCart(
          otherPage,
          storeName,
          storeGroups[storeName],
          `https://www.instacart.com/store/${slug}/storefront`,
          `https://www.instacart.com/store/${slug}/s?k=`
        );
      }
    }

  } catch (err) {
    log(`Cart builder error: ${err.message}`);
  } finally {
    await browser.disconnect();
    log('Disconnected from Chrome browser.');
  }
}

runLiveCartBuilder();
