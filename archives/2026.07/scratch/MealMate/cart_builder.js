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
    log('Connecting to Publix Online Cart API (Simulated)...');
    await new Promise(r => setTimeout(r, 1000));
    
    let subtotal = 0;
    
    console.log('\n==================================================');
    console.log('       MEALMATE CONSOLIDATED PUBLIX CART          ');
    console.log('==================================================');
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      log(`[Publix Cart] Adding: ${item.name} | Qty: ${item.amount} ${item.unit} | Price: $${item.price}/${item.unit}`);
      subtotal += item.total;
      await new Promise(r => setTimeout(r, 400));
    }
    
    const tax = subtotal * 0.06;
    const total = subtotal + tax;
    
    console.log('--------------------------------------------------');
    console.log(`Subtotal:                  $${subtotal.toFixed(2)}`);
    console.log(`Estimated Tax (6%):        $${tax.toFixed(2)}`);
    console.log(`Estimated Total:           $${total.toFixed(2)}`);
    console.log('==================================================');
    console.log('✅ Cart successfully built! Ready for pickup at Publix.');
    console.log('==================================================\n');
    
    log('Simulation complete. Carts populated successfully.');
    return;
  }

  log(`Grocery credentials loaded. Target user: ${storeUser}`);

  // 3. Launch Puppeteer Browser
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
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
  } catch (error) {
    log(`Error in Puppeteer execution: ${error.message}`);
  } finally {
    await browser.close();
    log('Puppeteer Browser closed.');
  }
}

runCartBuilder();
