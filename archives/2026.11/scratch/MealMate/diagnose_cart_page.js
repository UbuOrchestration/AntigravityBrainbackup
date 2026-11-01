const puppeteer = require('puppeteer');

async function diagnose() {
  console.log('Connecting to Chrome...');
  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });

    const pages = await browser.pages();
    let targetPage = pages.find(p => p.url().includes('publix') || p.url().includes('instacart')) || pages[0];
    
    console.log(`Navigating to cart page: https://delivery.publix.com/store/publix/cart`);
    await targetPage.goto('https://delivery.publix.com/store/publix/cart', { waitUntil: 'domcontentloaded' });
    
    console.log('Waiting 6 seconds for cart page to fully render items...');
    await new Promise(r => setTimeout(r, 6000));

    // Capture screenshot of cart page
    const screenshotPath = 'C:\\Users\\Ubu\\.gemini\\antigravity\\brain\\9e4b2519-acb8-4623-a3cd-0d977fb64924\\publix_cart_page_screenshot.png';
    await targetPage.screenshot({ path: screenshotPath });
    console.log(`Saved screenshot to ${screenshotPath}`);

    // Dump all buttons and clickable elements on the cart page
    const elementsInfo = await targetPage.evaluate(() => {
      const results = [];
      const all = Array.from(document.querySelectorAll('button, a, div[role="button"], span, svg'));
      all.forEach((el, idx) => {
        const text = (el.innerText || el.textContent || '').trim().substring(0, 100);
        const label = el.getAttribute('aria-label') || '';
        const className = el.className || '';
        
        // Match elements that might be remove buttons or quantity adjusters
        if (
          text.toLowerCase().includes('remove') || 
          text.toLowerCase().includes('delete') || 
          label.toLowerCase().includes('remove') || 
          label.toLowerCase().includes('delete') ||
          label.toLowerCase().includes('decrement') ||
          label.toLowerCase().includes('minus') ||
          className.toLowerCase().includes('remove') ||
          className.toLowerCase().includes('delete') ||
          idx < 100 // also log first 100 elements to see structure
        ) {
          results.push({
            index: idx,
            tagName: el.tagName,
            text: text,
            className: className,
            ariaLabel: label,
            role: el.getAttribute('role')
          });
        }
      });
      return results;
    });

    console.log(`Found ${elementsInfo.length} candidate elements on cart page:`);
    elementsInfo.slice(0, 80).forEach(info => {
      console.log(`[${info.index}] ${info.tagName} class="${info.className}" aria-label="${info.ariaLabel}" | Text: "${info.text}"`);
    });

    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

diagnose();
