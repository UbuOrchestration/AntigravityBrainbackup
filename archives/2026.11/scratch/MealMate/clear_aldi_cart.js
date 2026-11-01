const puppeteer = require('puppeteer');

async function emptyCart() {
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
  const aldiPage = pages.find(p => p.url().includes('aldi.us'));
  if (!aldiPage) {
    console.error('No Aldi page found');
    await browser.disconnect();
    return;
  }

  console.log(`Working on Aldi tab: ${aldiPage.url()}`);
  await aldiPage.bringToFront();

  // 1. Ensure the cart drawer is open
  let open = await aldiPage.evaluate(() => {
    const el = document.querySelector('#cart_dialog');
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.left < window.innerWidth && 
           window.getComputedStyle(el).display !== 'none' && !el.hasAttribute('hidden');
  });

  if (!open) {
    console.log('Cart drawer is closed. Clicking cart button...');
    const rect = await aldiPage.evaluate(() => {
      const el = document.getElementById('floating-cart-button') || document.querySelector('[data-testid="floating-cart-button"]');
      if (!el) return null;
      const box = el.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    });

    if (rect) {
      const clickX = Math.round(rect.x + rect.width / 2);
      const clickY = Math.round(rect.y + rect.height / 2);
      await aldiPage.mouse.click(clickX, clickY);
      console.log(`Clicked cart button natively at: (${clickX}, ${clickY})`);
      await new Promise(r => setTimeout(r, 4000));
    } else {
      console.error('Could not find cart button.');
      await browser.disconnect();
      return;
    }
  }

  console.log('Cart drawer is open. Starting item deletion loop...');

  let attempts = 0;
  const maxAttempts = 100;
  let consecFailures = 0;

  while (attempts < maxAttempts) {
    // Find the first decrement/remove button inside #cart_dialog
    const buttonData = await aldiPage.evaluate(() => {
      const dialog = document.querySelector('#cart_dialog');
      if (!dialog) return { found: false, msg: 'Dialog not found' };

      const text = (dialog.innerText || dialog.textContent || '').toLowerCase();
      if (text.includes('your cart is empty') || text.includes('empty cart') || text.includes('no items')) {
        return { found: false, msg: 'Cart is empty!' };
      }

      const buttons = Array.from(dialog.querySelectorAll('button, a, [role="button"]'));
      const target = buttons.find(b => {
        const label = (b.getAttribute('aria-label') || '').toLowerCase();
        const textVal = (b.innerText || b.textContent || '').trim();
        const box = b.getBoundingClientRect();
        
        // Ensure the button actually has visible area and matches criteria
        if (box.width === 0 || box.height === 0) return false;
        
        return label.includes('decrement') || label.includes('minus') || label.includes('remove') || label.includes('delete') || 
               textVal === '-' || textVal.toLowerCase().includes('remove') || textVal.toLowerCase().includes('delete');
      });

      if (target) {
        let itemName = 'Unknown Item';
        let parent = target.parentElement;
        for (let depth = 0; depth < 5; depth++) {
          if (!parent) break;
          const titleEl = parent.querySelector('span, a, p, h3, h4');
          if (titleEl && titleEl.innerText.trim().length > 2 && !titleEl.innerText.toLowerCase().includes('remove')) {
            itemName = titleEl.innerText.trim();
            break;
          }
          parent = parent.parentElement;
        }

        const box = target.getBoundingClientRect();
        return {
          found: true,
          itemName: itemName,
          box: { x: box.x, y: box.y, width: box.width, height: box.height }
        };
      }

      return { found: false, msg: 'No active remove/decrement buttons found' };
    });

    if (!buttonData.found) {
      if (buttonData.msg === 'Cart is empty!') {
        console.log('Cart is empty!');
        break;
      }
      
      consecFailures++;
      if (consecFailures >= 5) {
        console.log(`Loop finished after 5 consecutive failures: ${buttonData.msg}`);
        break;
      }
      
      console.log(`[Attempt ${attempts + 1}] Button not found yet, retrying in 1.5s...`);
      await new Promise(r => setTimeout(r, 1500));
      continue;
    }

    consecFailures = 0; // Reset consecutive failures on success
    console.log(`[Attempt ${attempts + 1}] Removing item: "${buttonData.itemName}"...`);
    
    // Click natively at coordinates
    const clickX = Math.round(buttonData.box.x + buttonData.box.width / 2);
    const clickY = Math.round(buttonData.box.y + buttonData.box.height / 2);
    
    await aldiPage.mouse.click(clickX, clickY);
    attempts++;
    await new Promise(r => setTimeout(r, 2000)); // Wait for animation
  }

  console.log('Cart empty process completed.');
  await browser.disconnect();
}

emptyCart();
