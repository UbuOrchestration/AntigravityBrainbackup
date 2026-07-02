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
    
    console.log(`Current page URL: ${targetPage.url()}`);
    
    const elementsInfo = await targetPage.evaluate(() => {
      const results = [];
      const all = Array.from(document.querySelectorAll('*'));
      all.forEach((el, idx) => {
        const id = el.id || '';
        const rawClass = el.className;
        const className = typeof rawClass === 'string' ? rawClass : (rawClass && typeof rawClass.baseVal === 'string' ? rawClass.baseVal : '');
        const text = (el.innerText || el.textContent || '').trim().substring(0, 50);
        const label = el.getAttribute('aria-label') || '';
        
        if (
          id.toLowerCase().includes('cart') || 
          className.toLowerCase().includes('cart') || 
          label.toLowerCase().includes('cart') ||
          text.toLowerCase().includes('items in cart')
        ) {
          results.push({
            tagName: el.tagName,
            id: id,
            className: className,
            ariaLabel: label,
            text: text,
            outerHTML: el.outerHTML.substring(0, 200)
          });
        }
      });
      return results;
    });

    console.log(`Found ${elementsInfo.length} cart elements on the page:`);
    elementsInfo.slice(0, 40).forEach((el, idx) => {
      console.log(`[${idx}] ${el.tagName} id="${el.id}" class="${el.className}" aria-label="${el.ariaLabel}" | Text: "${el.text.replace(/\n/g, ' ')}" | HTML: "${el.outerHTML.substring(0, 100)}"`);
    });

    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

diagnose();
