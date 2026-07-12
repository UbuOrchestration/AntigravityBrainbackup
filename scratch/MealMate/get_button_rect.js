const puppeteer = require('puppeteer');

async function checkRect() {
  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });
  } catch (err) {
    console.error('Could not connect to Chrome:', err.message);
    return;
  }

  const pages = await browser.pages();
  const publixPage = pages.find(p => p.url().includes('publix.com'));
  if (!publixPage) {
    console.error('No Publix page found');
    await browser.disconnect();
    return;
  }

  const rect = await publixPage.evaluate(() => {
    const el = document.getElementById('floating-cart-button');
    if (!el) return null;
    const box = el.getBoundingClientRect();
    
    // Check if it is covered by another element
    const center = {
      x: box.left + box.width / 2,
      y: box.top + box.height / 2
    };
    const elementAtPoint = document.elementFromPoint(center.x, center.y);
    
    return {
      id: el.id,
      text: el.innerText,
      box: {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        top: box.top,
        left: box.left
      },
      visible: box.width > 0 && box.height > 0 && window.getComputedStyle(el).display !== 'none',
      elementAtPoint: elementAtPoint ? {
        tag: elementAtPoint.tagName,
        id: elementAtPoint.id,
        class: elementAtPoint.className,
        outerHTML: elementAtPoint.outerHTML.slice(0, 150)
      } : null
    };
  });

  console.log('Button Rect Info:', JSON.stringify(rect, null, 2));
  await browser.disconnect();
}

checkRect();
