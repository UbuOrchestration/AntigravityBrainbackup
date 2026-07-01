const puppeteer = require('puppeteer');

async function capture() {
  console.log('Connecting to Chrome...');
  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });

    const pages = await browser.pages();
    let targetPage = pages.find(p => p.url().includes('publix') || p.url().includes('instacart')) || pages[0];
    
    console.log(`Active page: ${targetPage.url()}`);
    const screenshotPath = 'C:\\Users\\Ubu\\.gemini\\antigravity\\brain\\9e4b2519-acb8-4623-a3cd-0d977fb64924\\publix_popup_screenshot.png';
    await targetPage.screenshot({ path: screenshotPath });
    console.log(`Saved screenshot to ${screenshotPath}`);

    // Print text of any visible modal/dialog elements
    const modalsText = await targetPage.evaluate(() => {
      const results = [];
      const modals = Array.from(document.querySelectorAll('div[role="dialog"], div[role="aria-modal"], div.modal, [class*="modal" i], [class*="dialog" i], [class*="popup" i]'));
      modals.forEach((el, idx) => {
        const text = (el.innerText || el.textContent || '').trim();
        if (text.length > 0) {
          results.push(`[Modal ${idx}] Text: "${text.substring(0, 300)}..."`);
        }
      });
      return results;
    });

    console.log('Detected modals/overlays:');
    modalsText.forEach(t => console.log(t));

    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

capture();
