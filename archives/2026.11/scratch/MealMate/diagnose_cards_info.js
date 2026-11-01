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
    
    const cardsInfo = await targetPage.evaluate(() => {
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

      // Extract details from the first 5 cards
      return cards.slice(0, 5).map((card, idx) => {
        // Get all text nodes
        const textElements = Array.from(card.querySelectorAll('span, div, p, a, h3, h2'));
        const texts = textElements
          .filter(el => el.children.length === 0 && el.innerText.trim().length > 0)
          .map(el => ({
            tagName: el.tagName,
            className: el.className,
            text: el.innerText.trim()
          }));

        return {
          cardIndex: idx,
          outerHtmlSummary: card.outerHTML.substring(0, 500),
          texts: texts
        };
      });
    });

    console.log(`Found ${cardsInfo.length} product cards. Details:`);
    cardsInfo.forEach(card => {
      console.log(`\n--- Card [${card.cardIndex}] ---`);
      console.log('Text elements found in card:');
      card.texts.forEach(t => {
        console.log(`  [${t.tagName} class="${t.className}"]: "${t.text}"`);
      });
    });

    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

diagnose();
