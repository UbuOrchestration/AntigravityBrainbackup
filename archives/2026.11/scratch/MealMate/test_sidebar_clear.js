const puppeteer = require('puppeteer');

async function test() {
  console.log('Connecting to Chrome...');
  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });

    const pages = await browser.pages();
    let targetPage = pages.find(p => p.url().includes('publix') || p.url().includes('instacart')) || pages[0];
    
    console.log(`Current page URL: ${targetPage.url()}`);
    
    // Dismiss preference modal or banner first if visible
    await targetPage.evaluate(() => {
      const dismiss = Array.from(document.querySelectorAll('button, span, div, p'));
      const confirmBtn = dismiss.find(el => {
        const txt = (el.innerText || el.textContent || '').trim().toLowerCase();
        return txt === 'got it!' || txt === 'got it' || txt === 'confirm';
      });
      if (confirmBtn) confirmBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    console.log('Clicking the floating cart button...');
    await targetPage.click('#floating-cart-button');
    
    console.log('Waiting 3 seconds for cart sidebar to open...');
    await new Promise(r => setTimeout(r, 3000));

    // Get dialog details
    const dialogHtml = await targetPage.evaluate(() => {
      const cartDialog = document.querySelector('#cart_dialog');
      if (!cartDialog) return 'Cart dialog #cart_dialog not found!';
      
      const buttons = Array.from(cartDialog.querySelectorAll('button, a, div[role="button"]'));
      const btnDetails = buttons.map((b, idx) => ({
        index: idx,
        tagName: b.tagName,
        text: (b.innerText || b.textContent || '').trim().substring(0, 100),
        className: b.className,
        ariaLabel: b.getAttribute('aria-label')
      }));

      return {
        text: cartDialog.innerText,
        buttons: btnDetails
      };
    });

    if (typeof dialogHtml === 'string') {
      console.log(dialogHtml);
      await browser.disconnect();
      return;
    }

    console.log('Sidebar Cart Text Content:');
    console.log(dialogHtml.text.substring(0, 1000));

    console.log('\nButtons found inside the sidebar cart:');
    dialogHtml.buttons.forEach(b => {
      console.log(`  [${b.index}] ${b.tagName} class="${b.className}" aria-label="${b.ariaLabel}" | Text: "${b.text}"`);
    });

    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
