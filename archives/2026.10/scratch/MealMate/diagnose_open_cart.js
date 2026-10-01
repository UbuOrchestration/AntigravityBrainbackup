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
    
    console.log(`Current URL: ${targetPage.url()}`);
    
    // Check if cart dialog is visible on the screen
    let isVisible = await targetPage.evaluate(() => {
      const el = document.querySelector('#cart_dialog');
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none';
    });

    if (!isVisible) {
      console.log('Clicking cart button .e-1qrca90...');
      await targetPage.evaluate(() => {
        const el = document.querySelector('.e-1qrca90');
        if (el) {
          const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
          el.dispatchEvent(ev);
        }
      });
      await new Promise(r => setTimeout(r, 4000));
    }

    // Save screenshot
    const screenshotPath = 'C:\\Users\\Ubu\\.gemini\\antigravity\\brain\\9e4b2519-acb8-4623-a3cd-0d977fb64924\\publix_cart_open.png';
    await targetPage.screenshot({ path: screenshotPath });
    console.log(`Saved screenshot to ${screenshotPath}`);

    // Dump all inner text and child elements info of #cart_dialog
    const dialogDetails = await targetPage.evaluate(() => {
      const el = document.querySelector('#cart_dialog');
      if (!el) return 'Cart dialog #cart_dialog not found in DOM!';
      
      const elements = Array.from(el.querySelectorAll('*'));
      const details = elements.map((item, idx) => ({
        index: idx,
        tagName: item.tagName,
        className: item.className,
        text: (item.innerText || item.textContent || '').trim().substring(0, 100),
        ariaLabel: item.getAttribute('aria-label')
      }));
      
      return {
        text: el.innerText || el.textContent,
        elements: details
      };
    });

    console.log('Dialog Text:');
    console.log(dialogDetails.text ? dialogDetails.text.substring(0, 500) : 'No text');
    
    console.log('\nDialog Children Elements:');
    if (dialogDetails.elements) {
      dialogDetails.elements.slice(0, 50).forEach(e => {
        console.log(`  [${e.index}] ${e.tagName} class="${e.className}" aria-label="${e.ariaLabel}" | Text: "${e.text}"`);
      });
    }

    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

diagnose();
