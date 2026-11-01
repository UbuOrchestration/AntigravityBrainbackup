const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const menuStatusPath = path.join(__dirname, 'menu_status.json');
const finalCartPath = path.join(__dirname, 'final_cart_list.json');
const recentPurchasesPath = path.join(__dirname, 'recent_purchases.json');

function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

function processMenu() {
  log('Processing approved weekly menu...');

  if (!fs.existsSync(menuStatusPath)) {
    log('Error: menu_status.json not found.');
    return;
  }

  const menuStatus = JSON.parse(fs.readFileSync(menuStatusPath, 'utf8').replace(/^\uFEFF/, ''));

  if (menuStatus.status !== 'approved') {
    log(`Menu is not approved. Current status: ${menuStatus.status}. Aborting.`);
    return;
  }

  // Load or initialize recent purchases log for multi-use items
  let recentPurchases = {};
  if (fs.existsSync(recentPurchasesPath)) {
    try {
      recentPurchases = JSON.parse(fs.readFileSync(recentPurchasesPath, 'utf8').replace(/^\uFEFF/, ''));
    } catch (e) {
      log(`Error reading recent_purchases.json: ${e.message}`);
    }
  }

  const menu = menuStatus.menu;
  const shoppingList = menu.shoppingList;
  const finalPurchases = {};
  let purchasesUpdated = false;

  Object.keys(shoppingList).forEach((key) => {
    const item = shoppingList[key];
    const isMultiUseStaple = item.isStaple || item.category === 'Pantry Staples';

    if (isMultiUseStaple) {
      const lastPurchased = recentPurchases[key];
      // If purchased within the last 30 days, omit from cart
      if (lastPurchased && lastPurchased.purchasedAt) {
        const daysSincePurchase = (Date.now() - new Date(lastPurchased.purchasedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSincePurchase < 30) {
          log(`Omitting multi-use item "${item.name}" from cart (bought ${Math.round(daysSincePurchase)} days ago).`);
          return;
        }
      }
      
      // Otherwise, include in cart and mark as recently purchased
      finalPurchases[key] = item;
      recentPurchases[key] = {
        name: item.name,
        purchasedAt: new Date().toISOString()
      };
      purchasesUpdated = true;
    } else {
      // Perishable item: always include in cart
      finalPurchases[key] = item;
    }
  });

  // Save recent purchases tracker
  if (purchasesUpdated) {
    fs.writeFileSync(recentPurchasesPath, JSON.stringify(recentPurchases, null, 2), 'utf8');
    log('Updated recent_purchases.json with new multi-use purchases.');
  }

  // Write final cart list
  log('Generating final grocery cart list...');
  fs.writeFileSync(finalCartPath, JSON.stringify(finalPurchases, null, 2), 'utf8');
  log(`Saved final shopping list to ${finalCartPath}`);

  // Create archived copy of weekly menu in YYYY.MM.DD-MENU subfolder
  const genDate = new Date(menu.generatedAt || new Date());
  const yyyy = genDate.getFullYear();
  const mm = String(genDate.getMonth() + 1).padStart(2, '0');
  const dd = String(genDate.getDate()).padStart(2, '0');
  const menuFolderName = `${yyyy}.${mm}.${dd}-MENU`;
  const menuFolderPath = path.join(__dirname, menuFolderName);

  if (!fs.existsSync(menuFolderPath)) {
    fs.mkdirSync(menuFolderPath);
    log(`Created folder: ${menuFolderPath}`);
  }

  // Reconstruct plain text copy of the weekly menu email proposal
  const dinnersText = menu.dinners.map(d => {
    const ingredients = d.ingredients.map(i => i.name).join(', ');
    return `Dinner (${d.day}): ${d.name}\nIngredients: ${ingredients}\nInstructions: ${d.instructions}`;
  }).join('\n\n');

  const shoppingText = Object.keys(finalPurchases).map(k => {
    const item = finalPurchases[k];
    const bogoText = item.bogo ? ' [BOGO Deal!]' : '';
    return `- ${item.name}: ${item.amount} ${item.unit} - Buy at ${item.store} ($${item.price}/${item.unit} | Total: $${item.total})${bogoText}`;
  }).join('\n');

  const emailText = `ANTIGRAVITY WEEKLY PLAN
Good morning! Here is your custom weekly menu and optimized shopping list. Prices are compared and optimized across grocery stores for Zip 32825.

Weekly Coordinated Menu (${menu.season} Season)
Cuisine Style: ${menu.cuisine}. Modified for any allergies or dietary exclusions.

Breakfast: ${menu.breakfast.name}
Ingredients: ${menu.breakfast.ingredients.map(i => i.name).join(', ')}
Instructions: ${menu.breakfast.instructions}

Lunch: ${menu.lunch.name}
Ingredients: ${menu.lunch.ingredients.map(i => i.name).join(', ')}
Instructions: ${menu.lunch.instructions}

${dinnersText}

Optimized Grocery Shopping List
${shoppingText}

Generated autonomously by Antigravity MealMate via Agentmail.
`;

  fs.writeFileSync(path.join(menuFolderPath, 'approved_email.txt'), emailText, 'utf8');
  log(`Saved copy of approved email to ${path.join(menuFolderPath, 'approved_email.txt')}`);

  // Update status to cart_built
  menuStatus.status = 'cart_built';
  menuStatus.lastUpdated = new Date().toISOString();
  fs.writeFileSync(menuStatusPath, JSON.stringify(menuStatus, null, 2), 'utf8');

  // Trigger Cart Builder
  log('Triggering automated Puppeteer cart builder...');
  exec('node cart_builder.js', (err, stdout, stderr) => {
    if (err) {
      log(`Error executing cart builder: ${err.message}`);
    } else {
      log(`Cart builder output: ${stdout}`);
    }
  });
}

processMenu();
