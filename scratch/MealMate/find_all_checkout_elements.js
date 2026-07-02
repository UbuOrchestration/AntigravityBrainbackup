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
    
    const elements = await targetPage.evaluate(() => {
      const all = Array.from(document.querySelectorAll('*'));
      // Find leaf nodes containing checkout
      const matches = all.filter(el => {
        const text = (el.innerText || el.textContent || '').trim().toLowerCase();
        return text.includes('checkout') && el.children.length <= 3;
      });

      return matches.map((m, idx) => ({
        index: idx,
        tagName: m.tagName,
        className: m.className,
        id: m.id,
        text: (m.innerText || m.textContent || '').trim().substring(0, 100),
        parentTagName: m.parentElement ? m.parentElement.tagName : 'None',
        parentClassName: m.parentElement ? m.parentElement.className : ''
      }));
    });

    console.log('All elements containing "checkout" on the page:');
    elements.forEach(e => {
      console.log(`  [${e.index}] ${e.tagName} class="${e.className}" id="${e.id}" (Parent: ${e.parentTagName} class="${e.parentClassName}") | Text: "${e.text.replace(/\n/g, ' ')}"`);
    });

    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

diagnose();
