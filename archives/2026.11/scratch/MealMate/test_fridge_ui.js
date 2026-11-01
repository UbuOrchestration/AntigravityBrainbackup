const puppeteer = require('puppeteer');

async function testFridge() {
  console.log('Connecting to Chrome on port 9222...');
  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });

    console.log('Creating a new tab for FridgeMate...');
    const page = await browser.newPage();
    
    console.log('Navigating to http://localhost:3003...');
    await page.goto('http://localhost:3003', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    console.log('Opening Refrigerator and Freezer doors...');
    await page.evaluate(() => {
      const fridgeDoor = document.getElementById('fridge-door');
      const freezerDoor = document.getElementById('freezer-door');
      if (fridgeDoor && !fridgeDoor.classList.contains('open')) fridgeDoor.click();
      if (freezerDoor && !freezerDoor.classList.contains('open')) freezerDoor.click();
    });
    await new Promise(r => setTimeout(r, 1500));

    console.log('Clicking Milk Jug to load details...');
    await page.evaluate(() => {
      // Find the milk food-item element on shelf
      const milkItem = Array.from(document.querySelectorAll('.food-item')).find(el => {
        return (el.querySelector('svg') && el.querySelector('svg').classList.contains('svg-item-milk'));
      });
      if (milkItem) milkItem.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    console.log('Pouring 2 glasses of milk...');
    for (let i = 0; i < 2; i++) {
      await page.evaluate(() => {
        const interactBtn = document.getElementById('action-interact-btn');
        if (interactBtn) interactBtn.click();
      });
      await new Promise(r => setTimeout(r, 1500));
    }

    console.log('Clicking Parmesan Shaker to load details...');
    await page.evaluate(() => {
      const parmItem = Array.from(document.querySelectorAll('.food-item')).find(el => {
        return (el.querySelector('svg') && el.querySelector('svg').classList.contains('svg-item-parmesan'));
      });
      if (parmItem) parmItem.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    console.log('Shaking parmesan 2 times...');
    for (let i = 0; i < 2; i++) {
      await page.evaluate(() => {
        const interactBtn = document.getElementById('action-interact-btn');
        if (interactBtn) interactBtn.click();
      });
      await new Promise(r => setTimeout(r, 1000));
    }

    console.log('Clicking Egg Carton to load details...');
    await page.evaluate(() => {
      const eggItem = Array.from(document.querySelectorAll('.food-item')).find(el => {
        return (el.querySelector('svg') && el.querySelector('svg').className.baseVal.includes('eggs'));
      });
      if (eggItem) eggItem.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    console.log('Opening carton and consuming 1 egg...');
    await page.evaluate(() => {
      const interactBtn = document.getElementById('action-interact-btn');
      if (interactBtn && interactBtn.innerText.includes('Open')) interactBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Consume first egg node
    await page.evaluate(() => {
      const eggNode = document.querySelector('.egg-node');
      if (eggNode) {
        const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
        eggNode.dispatchEvent(ev);
      }
    });
    await new Promise(r => setTimeout(r, 1000));

    console.log('Adding "Frozen Wild Blueberries" to Freezer...');
    await page.evaluate(() => {
      document.getElementById('item-name').value = 'Frozen Wild Blueberries';
      document.getElementById('item-category').value = 'freezer';
      document.getElementById('item-type').value = 'generic';
      document.getElementById('item-price').value = '3.99';
      document.getElementById('item-expiry').value = '90';
      
      const form = document.getElementById('add-item-form');
      form.dispatchEvent(new Event('submit', { bubbles: true }));
    });
    await new Promise(r => setTimeout(r, 2000));

    console.log('Taking screenshot of the completed virtual fridge state...');
    const screenshotPath = 'C:\\Users\\Ubu\\.gemini\\antigravity\\brain\\9e4b2519-acb8-4623-a3cd-0d977fb64924\\fridge_test_result.png';
    await page.screenshot({ path: screenshotPath });
    console.log(`Saved screenshot to ${screenshotPath}`);

    await browser.disconnect();
    console.log('Test finished successfully!');
  } catch (err) {
    console.error('Error during test:', err.message);
  }
}

testFridge();
