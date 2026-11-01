const fs = require('fs');
const path = require('path');

const menuStatusPath = path.join(__dirname, 'menu_status.json');
const finalCartPath = path.join(__dirname, 'final_cart_list.json');

console.log('Pretending menu is approved. Consolidating all ingredients to local Publix cart...');

if (!fs.existsSync(menuStatusPath)) {
  console.error('Error: menu_status.json not found.');
  process.exit(1);
}

const menuStatus = JSON.parse(fs.readFileSync(menuStatusPath, 'utf8'));
const menu = menuStatus.menu;

if (!menu || !menu.shoppingList) {
  console.error('Error: No shopping list found in menu_status.json.');
  process.exit(1);
}

// Consolidate all shopping list items, setting the store to "Publix"
const publixCart = {};
Object.keys(menu.shoppingList).forEach((key) => {
  const item = { ...menu.shoppingList[key] };
  item.store = 'Publix';
  publixCart[key] = item;
});

// Save to final_cart_list.json
fs.writeFileSync(finalCartPath, JSON.stringify(publixCart, null, 2), 'utf8');
console.log(`Saved consolidated Publix shopping list to ${finalCartPath}`);

// Update status in menu_status.json to approved
menuStatus.status = 'approved';
menuStatus.lastUpdated = new Date().toISOString();
fs.writeFileSync(menuStatusPath, JSON.stringify(menuStatus, null, 2), 'utf8');
console.log('Updated menu status to approved.');
