const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const stockpilePath = path.join(__dirname, 'stockpile.json');
const menuStatusPath = path.join(__dirname, 'menu_status.json');
const finalCartPath = path.join(__dirname, 'final_cart_list.json');

function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

function normalizeName(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function processMenu() {
  log('Processing approved weekly menu...');

  if (!fs.existsSync(menuStatusPath) || !fs.existsSync(stockpilePath)) {
    log('Error: menu_status.json or stockpile.json not found.');
    return;
  }

  const menuStatus = JSON.parse(fs.readFileSync(menuStatusPath, 'utf8').replace(/^\uFEFF/, ''));
  const stockpile = JSON.parse(fs.readFileSync(stockpilePath, 'utf8'));

  if (menuStatus.status !== 'approved') {
    log(`Menu is not approved. Current status: ${menuStatus.status}. Aborting.`);
    return;
  }

  const menu = menuStatus.menu;
  const shoppingList = menu.shoppingList;

  const finalPurchases = {};
  const staplesToVerify = [];
  let stockpileUpdated = false;

  // Let's analyze each item in the shopping list
  Object.keys(shoppingList).forEach((key) => {
    const item = shoppingList[key];
    
    // Check if it is a staple (tracked in stockpile)
    let matchedStaple = null;
    let categoryKey = null;
    let itemKey = null;

    const normItemName = normalizeName(item.name);

    for (const cat in stockpile) {
      for (const k in stockpile[cat]) {
        const st = stockpile[cat][k];
        if (normalizeName(st.name) === normItemName || normalizeName(k) === normItemName || normItemName.includes(normalizeName(k))) {
          matchedStaple = st;
          categoryKey = cat;
          itemKey = k;
          break;
        }
      }
      if (matchedStaple) break;
    }

    if (matchedStaple) {
      log(`Tracked Staple Identified: ${matchedStaple.name} (Status: ${matchedStaple.status}, Stock: ${matchedStaple.quantity} ${matchedStaple.unit})`);
      
      if (matchedStaple.status === 'unknown') {
        // Trigger verification
        staplesToVerify.push(itemKey);
        matchedStaple.status = 'low_unconfirmed';
        stockpileUpdated = true;
      } else if (matchedStaple.status === 'low_unconfirmed') {
        // Already waiting for confirmation
        staplesToVerify.push(itemKey);
      } else if (matchedStaple.status === 'confirmed_buy') {
        // User confirmed we need to buy it
        finalPurchases[key] = item;
        // Assume restocked upon cart checkout
        matchedStaple.quantity = item.amount; // set to purchased pack size
        matchedStaple.status = 'known';
        stockpileUpdated = true;
      } else if (matchedStaple.status === 'confirmed_keep') {
        // User confirmed they have enough in stock
        log(`Skipping purchase of ${matchedStaple.name} based on KEEP confirmation.`);
        matchedStaple.status = 'known';
        matchedStaple.quantity = Math.max(matchedStaple.quantity, matchedStaple.threshold * 2); // assume restocked/sufficient
        stockpileUpdated = true;
      } else {
        // Status is 'known'. Check quantity.
        if (matchedStaple.quantity <= matchedStaple.threshold) {
          // Low on stock! We need to verify before purchasing.
          log(`Staple ${matchedStaple.name} is low (${matchedStaple.quantity} <= ${matchedStaple.threshold}). Verification required.`);
          matchedStaple.status = 'low_unconfirmed';
          staplesToVerify.push(itemKey);
          stockpileUpdated = true;
        } else {
          // We have enough. Deduct a small estimated amount for the week.
          const deduction = 1.0; // standard deduction estimate
          matchedStaple.quantity = Math.max(0, matchedStaple.quantity - deduction);
          log(`Deducted weekly usage from ${matchedStaple.name}. New stock: ${matchedStaple.quantity} ${matchedStaple.unit}`);
          stockpileUpdated = true;
        }
      }
    } else {
      // Perishable item: always purchase
      finalPurchases[key] = item;
    }
  });

  // Save stockpile changes
  if (stockpileUpdated) {
    fs.writeFileSync(stockpilePath, JSON.stringify(stockpile, null, 2), 'utf8');
    log('Updated stockpile.json database.');
  }

  // Check if we need to verify low/unknown items
  if (staplesToVerify.length > 0) {
    const itemsStr = staplesToVerify.join(',');
    log(`Staples require verification before checkout: ${itemsStr}. Sending verification email...`);
    
    const psCommand = `powershell.exe -ExecutionPolicy Bypass -File "${path.join(__dirname, 'send_reminder_email.ps1')}" -Type LowStockCheck -Items "${itemsStr}"`;
    exec(psCommand, (err, stdout, stderr) => {
      if (err) {
        log(`Error sending verification email: ${err.message}`);
      } else {
        log('Verification email sent to recipients.');
      }
    });
  } else {
    // All items resolved! Write final cart list and trigger browser automation cart builder.
    log('All items verified. Generating final grocery cart list...');
    fs.writeFileSync(finalCartPath, JSON.stringify(finalPurchases, null, 2), 'utf8');
    log(`Saved final shopping list to ${finalCartPath}`);

    // Create archived copy of weekly menu in YYYY.MM.DD-MENU subfolder as required by user
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

    const shoppingText = Object.keys(menu.shoppingList).map(k => {
      const item = menu.shoppingList[k];
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
}

processMenu();
