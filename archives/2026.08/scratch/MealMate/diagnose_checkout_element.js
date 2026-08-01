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
      const dialog = document.querySelector('#cart_dialog');
      if (!dialog) return 'Dialog #cart_dialog not found!';

      const all = Array.from(dialog.querySelectorAll('*'));
      const matches = all.filter(el => {
        const text = (el.innerText || el.textContent || '').toLowerCase();
        return text.includes('checkout');
      });

      return matches.map((m, idx) => ({
        index: idx,
        tagName: m.tagName,
        className: m.className,
        text: (m.innerText || m.textContent || '').trim().substring(0, 100),
        childCount: m.children.length
      }));
    });

    console.log('Matched Elements in Cart Drawer:');
    if (typeof elements === 'string') {
      console.log(elements);
    } else {
      elements.forEach(e => {
        console.log(`  [${e.index}] ${e.tagName} class="${e.className}" children=${e.childCount} | Text: "${e.text.replace(/\n/g, ' ')}"`);
      });
    }

    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

diagnose();
