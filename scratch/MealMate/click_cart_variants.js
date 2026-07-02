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

    // Variant A: Click the visible count badge wrapper div.e-1qrca90
    console.log('Testing Variant A: Dispatching MouseEvent on div.e-1qrca90...');
    await targetPage.evaluate(() => {
      const el = document.querySelector('.e-1qrca90');
      if (el) {
        const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
        el.dispatchEvent(ev);
      }
    });
    await new Promise(r => setTimeout(r, 2000));
    
    let opened = await targetPage.evaluate(() => document.querySelector('#cart_dialog') !== null);
    if (opened) {
      console.log('✅ Variant A successfully opened the cart sidebar!');
      await browser.disconnect();
      return;
    }

    // Variant B: Make the floating cart button visible and click it
    console.log('Testing Variant B: Unhiding and clicking #floating-cart-button...');
    await targetPage.evaluate(() => {
      const btn = document.querySelector('#floating-cart-button');
      if (btn) {
        btn.style.display = 'block';
        btn.style.visibility = 'visible';
        btn.style.opacity = '1';
        btn.style.position = 'static';
        btn.click();
      }
    });
    await new Promise(r => setTimeout(r, 2000));
    
    opened = await targetPage.evaluate(() => document.querySelector('#cart_dialog') !== null);
    if (opened) {
      console.log('✅ Variant B successfully opened the cart sidebar!');
      await browser.disconnect();
      return;
    }

    // Variant C: Click the outer span wrapping the count
    console.log('Testing Variant C: Dispatching MouseEvent on span parent of Items in cart...');
    await targetPage.evaluate(() => {
      const all = Array.from(document.querySelectorAll('span'));
      const statusSpan = all.find(el => (el.innerText || el.textContent || '').toLowerCase().includes('items in cart'));
      if (statusSpan && statusSpan.parentElement) {
        const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
        statusSpan.parentElement.dispatchEvent(ev);
      }
    });
    await new Promise(r => setTimeout(r, 2000));

    opened = await targetPage.evaluate(() => document.querySelector('#cart_dialog') !== null);
    if (opened) {
      console.log('✅ Variant C successfully opened the cart sidebar!');
    } else {
      console.log('❌ All variants failed to open the cart sidebar.');
    }

    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
