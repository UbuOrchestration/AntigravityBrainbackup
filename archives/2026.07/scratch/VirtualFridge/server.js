const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3003;

// In-memory inventory state for sync session
let serverInventory = null;
let hasUpdated = false;

app.use(express.json());
app.use(express.static(__dirname));

// GET endpoint checked by client polling
app.get('/api/inventory', (req, res) => {
  if (hasUpdated && serverInventory) {
    hasUpdated = false; // Reset flag after delivering sync
    return res.json({ updated: true, items: serverInventory });
  }
  res.json({ updated: false });
});

// POST endpoint called by Publix shopping run to push items
app.post('/api/inventory/sync', (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Invalid items array' });
  }

  console.log(`[Sync Engine] Received ${items.length} new items from procurement run.`);
  
  // Format items to match fridge database structure
  const formattedItems = items.map(item => {
    // Deduce type
    let type = 'generic';
    const lowerName = item.name.toLowerCase();
    if (lowerName.includes('milk')) type = 'milk';
    else if (lowerName.includes('egg')) type = 'eggs';
    else if (lowerName.includes('feta')) type = 'feta';
    else if (lowerName.includes('parmesan')) type = 'parmesan';

    return {
      id: `sync-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: item.name,
      category: item.category || 'fridge',
      type: type,
      price: item.price || 1.99,
      quantity: type === 'eggs' ? 12 : 100,
      maxQuantity: type === 'eggs' ? 12 : 100,
      addedDate: new Date().toLocaleDateString(),
      expiryDays: item.expiryDays || 14
    };
  });

  serverInventory = formattedItems;
  hasUpdated = true;

  res.json({ success: true, count: formattedItems.length });
});

// Fallback to index.html for navigation
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`FRIDGEMATE Server running at http://localhost:${PORT}`);
  console.log(`Sync Endpoint active: http://localhost:${PORT}/api/inventory/sync`);
  console.log(`==================================================`);
});
