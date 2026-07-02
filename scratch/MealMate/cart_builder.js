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
        return rect.width > 0 && rect.height > 0 && rect.left < window.innerWidth;
      });

      if (open) break;

      log(`[Open Cart Attempt ${retry + 1}/3] Cart drawer closed. Clicking cart button...`);
      await page.evaluate(() => {
        const cartBtn = document.querySelector('button[aria-label*="cart" i], a[href*="cart" i], [class*="cart" i], .e-1qrca90, #floating-cart-button, [data-testid="floating-cart-button"]');
        if (cartBtn) {
          cartBtn.click();
        }
      });

      await new Promise(r => setTimeout(r, 3000));
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
        return rect.width > 0 && rect.height > 0 && rect.left < window.innerWidth;
      });

      if (!stillOpen) {
        log('Sidebar closed unexpectedly. Re-opening...');
        await page.evaluate(() => {
          const floatBtn = document.querySelector('#floating-cart-button') || document.querySelector('[data-testid="floating-cart-button"]');
          if (floatBtn) {
            const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
            floatBtn.dispatchEvent(ev);
          }
        });
        await new Promise(r => setTimeout(r, 2000));
      }

      const result = await page.evaluate(() => {
        const dialog = document.querySelector('#cart_dialog');
        if (!dialog) return { empty: true, msg: 'Cart dialog #cart_dialog not found.' };

        const text = (dialog.innerText || dialog.textContent || '').toLowerCase();
        if (text.includes('your cart is empty') || text.includes('empty cart') || text.includes('no items')) {
          return { empty: true, msg: 'Cart is empty!' };
        }

        // Find all buttons inside the dialog (including decrement/minus and remove buttons)
        const buttons = Array.from(dialog.querySelectorAll('button, a, [role="button"], [aria-label*="remove" i], [aria-label*="delete" i], [aria-label*="minus" i], [aria-label*="decrement" i]'));
        const decBtn = buttons.find(btn => {
          const label = (btn.getAttribute('aria-label') || '').toLowerCase();
          const textVal = (btn.innerText || btn.textContent || '').trim();
          return label.includes('decrement') || label.includes('minus') || label.includes('remove') || label.includes('delete') || textVal === '-' || textVal.includes('Remove') || textVal.includes('Delete');
        });

        if (decBtn) {
          decBtn.click();
          return { empty: false, msg: 'Clicked decrement/remove button.' };
        }

        return { empty: true, msg: 'No more decrement/remove buttons found in cart sidebar.' };
      });

      if (result.empty) {
        log(result.msg);
        break;
      }

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

    let searchSuccess = false;
    try {
      const searchInput = await page.waitForSelector('input[placeholder*="Search" i], input[placeholder*="Try" i], input[type="search"], #search-bar-input', { timeout: 2000 });
      if (searchInput) {
        await searchInput.click();
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        
        await page.type('input[placeholder*="Search" i], input[placeholder*="Try" i], input[type="search"], #search-bar-input', searchQuery, { delay: 30 });
        await new Promise(r => setTimeout(r, 500));
        await page.keyboard.press('Enter');
        searchSuccess = true;
        log('Entered query natively and submitted search.');
      }
    } catch (e) {
      log(`Failed search bar entry: ${e.message}. Using URL search fallback.`);
    }

    if (!searchSuccess) {
      const searchUrl = `${searchUrlPrefix}${encodeURIComponent(searchQuery)}`;
      try {
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      } catch (gotoErr) {
        log(`Navigation warning: ${gotoErr.message}. Continuing...`);
      }
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
        const words = itemName.toLowerCase().replace(/[()]/g, '').split(/\s+/).filter(w => w.length > 2);
        if (words.length === 0) return { clicked: false };

        function parseCardText(text) {
          const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          let price = 0;
          let originalPrice = 0;
          let sizeText = '';
          let title = '';
          let isBogo = false;

          const lowerText = text.toLowerCase();
          if (lowerText.includes('buy 1 get 1') || lowerText.includes('bogo') || lowerText.includes('buy 1, get 1')) {
            isBogo = true;
          }

          const priceMatches = [];
          lines.forEach(line => {
            const m = line.match(/\$(\d+\.\d{2})/);
            if (m) priceMatches.push(parseFloat(m[1]));
          });

          if (priceMatches.length > 0) {
            price = priceMatches[0];
            originalPrice = priceMatches[1] || price;
          }

          lines.forEach(line => {
            const lineLower = line.toLowerCase();
            if (lineLower === 'add' || lineLower.includes('add to cart') || lineLower.includes('increment') || lineLower.includes('in cart')) return;
            if (lineLower.includes('$') || lineLower.includes('price:')) return;
            if (lineLower.includes('stock') || lineLower.includes('% off')) return;

            const isSize = /\b(\d+\.?\d*)\s*(oz|lb|lbs|g|gram|ct|pack|block|container|bag|box|can)\b/i.test(lineLower);
            if (isSize) {
              sizeText = line;
            } else if (line.length > 3 && !title) {
              title = line;
            }
          });

          return { title, price, originalPrice, sizeText, isBogo };
        }

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

        const cards = Array.from(document.querySelectorAll('[class*="item-card" i], [class*="ItemCard" i], li[class*="item" i]'));

        const scoredCards = [];
        cards.forEach((card, idx) => {
          const cardText = card.innerText || card.textContent || '';
          const info = parseCardText(cardText);
          const titleLower = info.title.toLowerCase();

          // Synonym constraint check to prevent wrong items (e.g. refried beans instead of garbanzo)
          if (requiredSynonyms.length > 0) {
            const matchesSynonym = requiredSynonyms.some(syn => titleLower.includes(syn));
            if (!matchesSynonym) return;
          }

          let matchCount = 0;
          words.forEach(word => {
            if (titleLower.includes(word)) matchCount++;
          });

          if (matchCount === 0) return;

          const matchScore = matchCount / words.length;
          const effectivePrice = info.isBogo ? (info.price / 2) : info.price;
          const valueScore = effectivePrice > 0 ? (1 / effectivePrice) : 0;
          const totalScore = (matchScore * 0.4) + (valueScore * 0.6);

          scoredCards.push({ card, info, totalScore });
        });

        if (scoredCards.length > 0) {
          scoredCards.sort((a, b) => b.totalScore - a.totalScore);
          const best = scoredCards[0].card;
          const addBtn = best.querySelector('button[aria-label*="Add to cart" i], button[aria-label*="Add" i], button[aria-label*="add" i]');
          if (addBtn) {
            addBtn.click();
            return { clicked: true, title: scoredCards[0].info.title };
          }
        }
        return { clicked: false };
      }, item.name);

      if (selectionResult.clicked) {
        log(`✅ Successfully added matched item: "${selectionResult.title}"`);
        clicked = true;
      }
    } catch (err) {
      log(`Evaluation failed: ${err.message}`);
    }

    if (!clicked) {
      try {
        const xpathSelector = "xpath///button[contains(translate(., 'ADD', 'add'), 'add')]";
        const button = await page.$(xpathSelector);
        if (button) {
          await button.click();
          log('✅ Clicked Add using fallback XPath.');
          clicked = true;
        }
      } catch (e) {
        // Ignore fallback errors
      }
    }

    if (!clicked) {
      log('⚠️ Could not automatically click Add button. Please click manually.');
    } else {
      // Handle quantity incrementing
      if (targetQty > 1) {
        log(`Incrementing quantity to ${targetQty}...`);
        for (let q = 1; q < targetQty; q++) {
          await new Promise(r => setTimeout(r, 1500));
          const incremented = await page.evaluate((itemName) => {
            const words = itemName.toLowerCase().replace(/[()]/g, '').split(/\s+/).filter(w => w.length > 2);
            if (words.length === 0) return false;

            const allElements = Array.from(document.querySelectorAll('span, a, h3, div, p'));
            let bestEl = null;
            let maxMatch = 0;
            allElements.forEach(el => {
              if (el.children.length === 0) {
                const text = (el.innerText || el.textContent || '').toLowerCase();
                let match = 0;
                words.forEach(w => {
                  if (text.includes(w)) match++;
                });
                if (match > maxMatch) {
                  maxMatch = match;
                  bestEl = el;
                }
              }
            });

            if (bestEl && maxMatch > 0) {
              let curr = bestEl;
              for (let depth = 0; depth < 8; depth++) {
                if (!curr || curr === document.body) break;
                const plusBtn = curr.querySelector('button[aria-label*="Increment" i], button[aria-label*="add another" i], button[aria-label*="plus" i]');
                if (plusBtn) {
                  plusBtn.click();
                  return true;
                }
                curr = curr.parentElement;
              }
            }
            return false;
          }, item.name);

          if (incremented) {
            log(`✅ Incremented (qty ${q + 1}/${targetQty}).`);
          } else {
            log(`⚠️ Could not increment quantity automatically.`);
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
