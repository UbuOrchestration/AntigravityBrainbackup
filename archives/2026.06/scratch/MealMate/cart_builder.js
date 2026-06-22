const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const finalCartPath = path.join(__dirname, 'final_cart_list.json');

function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

async function runCartBuilder() {
  log('Starting automated cart builder...');

  // 1. Check for final cart list
  if (!fs.existsSync(finalCartPath)) {
    log('Error: final_cart_list.json not found. Aborting cart builder.');
    return;
  }

  const finalCart = JSON.parse(fs.readFileSync(finalCartPath, 'utf8'));
  const items = Object.values(finalCart);

  if (items.length === 0) {
    log('No items in the final shopping cart. Aborting.');
    return;
  }

  // 2. Load credentials
  let storeUser = '';
  let storePass = '';
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach((line) => {
      const matchUser = line.match(/^GROCERY_STORE_USER=(.*)/);
      const matchPass = line.match(/^GROCERY_STORE_PASS=(.*)/);
      if (matchUser) storeUser = matchUser[1].trim();
      if (matchPass) storePass = matchPass[1].trim();
    });
  }

  const isSimulated = !storeUser || !storePass;

  if (isSimulated) {
    log('⚠️ No grocery credentials in .env. Running cart builder in SIMULATION MODE.');
  } else {
    log(`Grocery credentials loaded. Target user: ${storeUser}`);
  }

  // 3. Launch Puppeteer Browser
  const browser = await puppeteer.launch({
    headless: false, // Keep browser visible so the user can watch the automation
    defaultViewport: null,
    args: ['--start-maximized']
  });

  const page = await browser.newPage();

  try {
    if (isSimulated) {
      // Simulation mode: Open a beautiful mock grocer site that displays items being added to a cart!
      // This validates the Puppeteer engine is working and displays visual feedback to the user.
      const mockHtmlPath = path.join(__dirname, 'public', 'mock_checkout.html');
      
      // Let's create a beautiful mock checkout HTML if it doesn't exist
      const mockHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>MealMate Automated Cart Simulator</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; background-color: #0b0c10; color: #c5c6c7; text-align: center; padding: 50px; }
          .container { max-width: 600px; margin: 0 auto; background: #1f2833; padding: 40px; border-radius: 12px; border: 2px solid #66fcf1; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
          h1 { color: #66fcf1; margin-bottom: 20px; }
          .loader { border: 4px solid #1a2238; border-top: 4px solid #66fcf1; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          .cart-item { background: #1a2238; padding: 15px; border-radius: 8px; margin: 10px 0; text-align: left; border-left: 4px solid #2ecc71; display: flex; justify-content: space-between; align-items: center; opacity: 0; transform: translateY(20px); animation: fadeInUp 0.5s forwards; }
          @keyframes fadeInUp { to { opacity: 1; transform: translateY(0); } }
          .price { color: #2ecc71; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>MealMate Grocery Cart Builder</h1>
          <p id="status-text">Connecting to grocery store portal...</p>
          <div class="loader" id="spinner"></div>
          <div id="cart-list"></div>
        </div>
      </body>
      </html>
      `;
      fs.writeFileSync(mockHtmlPath, mockHtml, 'utf8');

      await page.goto(`file://${mockHtmlPath}`);

      // Add each item with delay
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await page.evaluate((name, store, total) => {
          document.getElementById('status-text').innerText = `Adding to ${store} cart: ${name}`;
          const list = document.getElementById('cart-list');
          const div = document.createElement('div');
          div.className = 'cart-item';
          div.style.animationDelay = '0.1s';
          div.innerHTML = `<span><strong>${name}</strong> (${store})</span><span class="price">$${total}</span>`;
          list.appendChild(div);
        }, item.name, item.store, item.total);
        
        await new Promise(r => setTimeout(r, 1500)); // wait 1.5s per item
      }

      await page.evaluate(() => {
        document.getElementById('status-text').innerText = '✅ Cart successfully built! Ready for checkout.';
        document.getElementById('spinner').style.display = 'none';
      });

      log('Simulation complete. Carts populated successfully.');
      await new Promise(r => setTimeout(r, 4000));
    } else {
      // Real Automation Mode: Automating checkout (e.g. Walmart or Instacart)
      log('Navigating to Instacart login portal...');
      await page.goto('https://www.instacart.com/login', { waitUntil: 'networkidle2' });
      
      // Perform automated login
      log('Entering credentials...');
      await page.type('input[type="email"]', storeUser, { delay: 100 });
      await page.type('input[type="password"]', storePass, { delay: 100 });
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      log('Login successful.');

      // Iterate and add items
      for (const item of items) {
        log(`Searching for "${item.name}" on ${item.store}...`);
        await page.goto(`https://www.instacart.com/store/items/${encodeURIComponent(item.name)}`, { waitUntil: 'networkidle2' });
        
        // Wait for add-to-cart button and click it
        const addButtonSelector = 'button[aria-label*="Add to cart"]';
        await page.waitForSelector(addButtonSelector, { timeout: 5000 });
        await page.click(addButtonSelector);
        log(`Added ${item.name} to cart.`);
        await new Promise(r => setTimeout(r, 2000));
      }

      log('Cart builder completed successfully.');
    }
  } catch (error) {
    log(`Error in Puppeteer execution: ${error.message}`);
  } finally {
    await browser.close();
    log('Puppeteer Browser closed.');
  }
}

runCartBuilder();
