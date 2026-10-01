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
        const floatBtn = document.querySelector('#floating-cart-button') || document.querySelector('[data-testid="floating-cart-button"]');
        if (floatBtn) {
          const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
          floatBtn.dispatchEvent(ev);
        } else {
          const wrapper = document.querySelector('.e-1qrca90');
          if (wrapper) {
            const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
            wrapper.dispatchEvent(ev);
          }
        }
      });

      await new Promise(r => setTimeout(r, 3000));
      await dismissModals(page); // Dismiss any preference modals interrupting drawer open!
    }

    if (!open) {
      log('⚠️ Could not open cart sidebar after 3 attempts. Aborting cart builder to prevent duplicate additions.');
      throw new Error('Could not open cart sidebar');
    }

    log('Beginning item removal loop in sidebar...');
    let attempts = 0;
    const maxAttempts = 150; // Safety cap (elevated to support multiple decrement clicks)

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
        const buttons = Array.from(dialog.querySelectorAll('button, a, div[role="button"]'));
        const decBtn = buttons.find(btn => {
          const label = (btn.getAttribute('aria-label') || '').toLowerCase();
          const textVal = (btn.innerText || btn.textContent || '').trim();
          return label.includes('decrement') || label.includes('minus') || label.includes('remove') || label.includes('delete') || textVal === '-';
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

    // Wait for the cart count to hydrate (prove the page and React state are fully loaded)
    log('Waiting for cart count to hydrate...');
    try {
      await page.waitForFunction(() => {
        const el = document.querySelector('#floating-cart-button') || document.querySelector('.e-1qrca90');
        if (!el) return false;
        const text = el.innerText || el.textContent || '';
        return /\d+/.test(text);
      }, { timeout: 20000 });
      log('✅ Cart count hydrated successfully!');
    } catch (e) {
      log('⚠️ Warning: Timeout waiting for cart count to hydrate. Proceeding...');
    }

    // Empty the cart in the sidebar drawer pop-out (avoids page reloads!)
    await emptyCartInSidebar(page);

    log('Setup finished. Waiting 3 seconds before beginning items addition...');
    await new Promise(r => setTimeout(r, 3000));

    // 2. Iterate and add items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      log(`--------------------------------------------------`);
      log(`[Item ${i+1}/${items.length}] Searching for: "${item.name}"`);

      let searchSuccess = false;
      try {
        const searchInput = await page.waitForSelector('input[placeholder*="Search" i], input[type="search"], #search-bar-input', { visible: true, timeout: 5000 });
        if (searchInput) {
          // 1. Set the search input value directly to the item name using React value-setter bypass (avoids autocomplete re-render detaches)
          await page.evaluate((el, val) => {
            try {
              const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
              nativeInputValueSetter.call(el, val);
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            } catch (e) {
              el.value = val;
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }, searchInput, item.name);
 
          // 2. Focus input and press Enter to submit search (with a race timeout to prevent context destroy hangs)
          await searchInput.focus();
          await Promise.race([
            page.keyboard.press('Enter'),
            new Promise(r => setTimeout(r, 2000))
          ]);
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

      // Determine target quantity
      let targetQty = item.amount;
      if (item.bogo) {
        targetQty = Math.ceil(item.amount / 2) * 2;
        log(`Item is BOGO. Adjusting target quantity from ${item.amount} to ${targetQty}.`);
      }

      // Attempt to click the Add to Cart button using advanced unit price comparison and value scoring
      let clicked = false;
      try {
        const selectionResult = await page.evaluate((itemName) => {
          const words = itemName.toLowerCase().replace(/[()]/g, '').split(/\s+/).filter(w => w.length > 2);
          if (words.length === 0) return { clicked: false };

          // Helper: Parse card text
          function parseCardText(text) {
            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            let price = 0;
            let originalPrice = 0;
            let sizeText = '';
            let title = '';
            let isBogo = false;

            const lowerText = text.toLowerCase();
            if (lowerText.includes('buy 1 get 1') || lowerText.includes('bogo') || lowerText.includes('buy 1, get 1') || lowerText.includes('buy one, get one')) {
              isBogo = true;
            }

            const priceMatches = [];
            lines.forEach(line => {
              const m = line.match(/\$(\d+\.\d{2})/);
              if (m) {
                priceMatches.push(parseFloat(m[1]));
              }
            });

            if (priceMatches.length > 0) {
              price = priceMatches[0];
              if (priceMatches.length > 1) {
                originalPrice = priceMatches[1];
              }
            }

            lines.forEach(line => {
              const lineLower = line.toLowerCase();
              if (lineLower === 'add' || lineLower.includes('add to cart') || lineLower.includes('increment') || lineLower.includes('in cart')) return;
              if (lineLower.includes('$') || lineLower.includes('price:')) return;
              if (lineLower.includes('stock') || lineLower.includes('healthy') || lineLower.includes('seller') || lineLower.includes('popular') || lineLower.includes('choice')) return;
              if (lineLower.includes('% off') || lineLower.includes('save $') || lineLower.includes('deal')) return;
              
              const isSize = /\b(\d+\.?\d*)\s*(oz|lb|lbs|g|gram|grams|ct|pack|pk|block|container|bag|bunch|box|can)\b/i.test(lineLower) || lineLower.match(/^\d+\s*(oz|lb|g|ct)$/i);
              
              if (isSize) {
                sizeText = line;
              } else if (line.length > 3 && !title) {
                title = line;
              } else if (line.length > 3 && title && line.length > title.length) {
                title = line;
              }
            });

            return {
              title: title || lines[0] || '',
              price: price,
              originalPrice: originalPrice || price,
              sizeText: sizeText,
              isBogo: isBogo
            };
          }

          // Helper: Convert size to unit quantity (ounces or counts)
          function convertToOunces(sizeText) {
            if (!sizeText) return 1;
            const lower = sizeText.toLowerCase();
            const ozMatch = lower.match(/(\d+\.?\d*)\s*oz/);
            if (ozMatch) return parseFloat(ozMatch[1]);
            const lbMatch = lower.match(/(\d+\.?\d*)\s*lb/);
            if (lbMatch) return parseFloat(lbMatch[1]) * 16;
            const ctMatch = lower.match(/(\d+)\s*(ct|pack|pk)/) || lower.match(/(\d+)-ct/);
            if (ctMatch) return parseInt(ctMatch[1], 10);
            return 1;
          }

          // Find candidate product cards using robust parents traversal
          const cards = [];
          const addBtns = Array.from(document.querySelectorAll('button[aria-label*="Add" i], button[aria-label*="Add to cart" i]'));
          addBtns.forEach(btn => {
            let card = btn.parentElement;
            while (card && card !== document.body) {
              const cardText = (card.innerText || card.textContent || '').trim();
              const addCount = (cardText.match(/\bAdd\b/g) || []).length;
              if (cardText.length > 20 && addCount === 1) {
                if (!cards.includes(card)) cards.push(card);
                break;
              }
              card = card.parentElement;
            }
          });

          // Parse candidates and compute unit prices
          const candidates = [];
          cards.forEach(card => {
            const cardText = card.innerText || card.textContent || '';
            const parsed = parseCardText(cardText);
            if (parsed.title && parsed.price > 0) {
              const qty = convertToOunces(parsed.sizeText);
              const effectivePrice = parsed.isBogo ? (parsed.price / 2) : parsed.price;
              const unitPrice = effectivePrice / qty;
              candidates.push({
                card: card,
                parsed: parsed,
                qty: qty,
                effectivePrice: effectivePrice,
                unitPrice: unitPrice
              });
            }
          });

          if (candidates.length === 0) return { clicked: false };

          // Find min unit price to scale ValueScore
          let minUnitPrice = Infinity;
          candidates.forEach(c => {
            if (c.unitPrice < minUnitPrice) minUnitPrice = c.unitPrice;
          });

          // Score candidates: 40% similarity (quality) + 60% value (price per unit)
          let bestCandidate = null;
          let maxScore = -1;

          candidates.forEach(c => {
            const cardWords = c.parsed.title.toLowerCase().replace(/[()]/g, '').split(/\s+/).filter(w => w.length > 2);
            let matchCount = 0;
            words.forEach(w => {
              if (cardWords.includes(w) || c.parsed.title.toLowerCase().includes(w)) matchCount++;
            });

            // Discard completely unrelated items (e.g. White Bread returned during Egg search)
            if (matchCount === 0) return;

            const similarityScore = (matchCount / words.length) * 100;
            const valueScore = (minUnitPrice / c.unitPrice) * 100;
            const finalScore = (similarityScore * 0.4) + (valueScore * 0.6);

            if (finalScore > maxScore) {
              maxScore = finalScore;
              bestCandidate = c;
            }
          });

          if (bestCandidate) {
            const finalBtn = bestCandidate.card.querySelector('button[aria-label*="Add" i], button[aria-label*="Increment" i], button[aria-label*="Add to cart" i]');
            if (finalBtn) {
              finalBtn.click();
              return {
                clicked: true,
                title: bestCandidate.parsed.title,
                price: bestCandidate.parsed.price,
                originalPrice: bestCandidate.parsed.originalPrice,
                sizeText: bestCandidate.parsed.sizeText,
                isBogo: bestCandidate.parsed.isBogo,
                unitPrice: bestCandidate.unitPrice
              };
            }
          }

          return { clicked: false };
        }, item.name);

        if (selectionResult.clicked) {
          log(`✅ Selected "${selectionResult.title}" (${selectionResult.sizeText || 'unit'}) at $${selectionResult.price} (BOGO: ${selectionResult.isBogo}, Effective Unit Price: $${selectionResult.unitPrice.toFixed(4)}) - Best value matching "${item.name}".`);
          clicked = true;
          // Dynamically override targetQty if the selected item is BOGO
          if (selectionResult.isBogo) {
            targetQty = Math.ceil(item.amount / 2) * 2;
            log(`Adjusting target quantity to pairs of 2 for BOGO: ${targetQty}`);
          }
        }
      } catch (err) {
        log(`Targeted comparison click error: ${err.message}`);
      }

      // Fallback to global selector loop if targeted click failed
      if (!clicked) {
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
                log(`✅ Automatically clicked "Add" button using fallback selector: ${selector}`);
                clicked = true;
                break;
              }
            }
          } catch (e) {
            // Try next
          }
        }
      }

      if (!clicked) {
        try {
          const xpathSelector = "xpath///button[contains(translate(., 'ADD', 'add'), 'add')]";
          const button = await page.$(xpathSelector);
          if (button) {
            await button.click();
            log(`✅ Automatically clicked "Add" button using fallback XPath search.`);
            clicked = true;
          }
        } catch (e) {
          // Ignore
        }
      }

      if (!clicked) {
        log(`⚠️ Could not automatically click "Add" button. Please click it manually in your Chrome window.`);
      } else {
        log(`Successfully added: "${item.name}"`);
        
        // Increment quantity if targetQty is greater than 1 (specifically BOGO duplicates)
        if (targetQty > 1) {
          log(`Incrementing quantity to ${targetQty} to fulfill shopping requirement...`);
          for (let q = 1; q < targetQty; q++) {
            await new Promise(r => setTimeout(r, 1500)); // wait for React component transition
            const incremented = await page.evaluate((itemName) => {
              const words = itemName.toLowerCase().replace(/[()]/g, '').split(/\s+/).filter(w => w.length > 2);
              if (words.length === 0) return false;
              
              const allElements = Array.from(document.querySelectorAll('span, a, h3, h2, div, p'));
              let bestEl = null;
              let maxMatchCount = 0;
              allElements.forEach(el => {
                if (el.children.length === 0) {
                  const text = (el.innerText || el.textContent || '').toLowerCase();
                  let matchCount = 0;
                  words.forEach(w => {
                    if (text.includes(w)) matchCount++;
                  });
                  if (matchCount > maxMatchCount) {
                    maxMatchCount = matchCount;
                    bestEl = el;
                  }
                }
              });

              if (bestEl && maxMatchCount > 0) {
                let current = bestEl;
                for (let depth = 0; depth < 8; depth++) {
                  if (!current || current === document.body) break;
                  const plusBtn = current.querySelector('button[aria-label*="Increment" i], button[aria-label*="add another" i], button[aria-label*="plus" i]');
                  if (plusBtn) {
                    plusBtn.click();
                    return true;
                  }
                  current = current.parentElement;
                }
              }
              return false;
            }, item.name);

            if (incremented) {
              log(`✅ Clicked increment button (quantity ${q + 1}/${targetQty}).`);
            } else {
              log(`⚠️ Could not click increment button (quantity ${q + 1}/${targetQty}).`);
            }
          }
        }
      }

      // Wait 3 seconds before next search
      await new Promise(r => setTimeout(r, 3000));
    }

    log('==================================================');
    log('All items processed! Navigating to checkout page...');
    log('==================================================');

    try {
      // Check if the checkout button is already present and visible in the DOM
      let checkoutBtnExists = await page.evaluate(() => {
        const btn = document.querySelector('#cart-checkout-button');
        if (!btn) return false;
        const rect = btn.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && window.getComputedStyle(btn).display !== 'none';
      });

      if (!checkoutBtnExists) {
        log('Opening cart drawer to access checkout button...');
        await page.evaluate(() => {
          const spans = Array.from(document.querySelectorAll('span'));
          const cartSpan = spans.find(s => (s.innerText || s.textContent || '').toLowerCase().includes('items in cart'));
          if (cartSpan) {
            let curr = cartSpan;
            for (let i = 0; i < 4; i++) {
              if (!curr || curr === document.body) break;
              const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
              curr.dispatchEvent(ev);
              curr = curr.parentElement;
            }
          } else {
            const floatBtn = document.querySelector('#floating-cart-button') || document.querySelector('[data-testid="floating-cart-button"]');
            if (floatBtn) {
              const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
              floatBtn.dispatchEvent(ev);
            }
          }
        });
        await new Promise(r => setTimeout(r, 3000));
      }

      log('Clicking the "Go to checkout" button...');
      await page.evaluate(() => {
        const btn = document.querySelector('#cart-checkout-button');
        if (btn) {
          const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
          btn.dispatchEvent(ev);
          btn.click();
        }
      });
      await new Promise(r => setTimeout(r, 6000));
      log(`Successfully navigated. Current URL: ${page.url()}`);
    } catch (e) {
      log(`Error navigating to checkout page: ${e.message}`);
    }

  } catch (error) {
    log(`Error during Publix cart automation: ${error.message}`);
  } finally {
    // We disconnect so the browser remains open for the user!
    await browser.disconnect();
    log('Disconnected from Chrome. The browser window remains open for you.');
  }
}

runLiveCartBuilder();
