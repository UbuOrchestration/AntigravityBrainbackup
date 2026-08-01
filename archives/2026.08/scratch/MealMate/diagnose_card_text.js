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
    
    console.log(`Analyzing storefront page: ${targetPage.url()}`);
    
    const cardsText = await targetPage.evaluate(() => {
      // Find candidate product cards
      const cards = [];
      const addBtns = Array.from(document.querySelectorAll('button[aria-label*="Add" i], button[aria-label*="Add to cart" i]'));
      addBtns.forEach(btn => {
        let current = btn.parentElement;
        for (let depth = 0; depth < 8; depth++) {
          if (!current || current === document.body) break;
          if (cards.includes(current)) break;
          const hasTitle = current.querySelector('span, a, h3, h2, div, p');
          if (hasTitle) {
            cards.push(current);
            break;
          }
          current = current.parentElement;
        }
      });

      return cards.map((card, idx) => ({
        index: idx,
        text: card.innerText || card.textContent || ''
      }));
    });

    console.log(`Found ${cardsText.length} product cards. Texts:`);
    cardsText.forEach(card => {
      console.log(`\n--- Card [${card.index}] ---`);
      console.log(card.text);
    });

    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

diagnose();
