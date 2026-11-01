const API_BASE = '';

// Active Tab state
let activeTab = 'menu';
let menuStatusData = null;
let stockpileData = null;

// Tab switcher
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  
  document.getElementById(`tab-${tabId}`).classList.add('active');
  document.getElementById(`content-${tabId}`).classList.add('active');
  
  activeTab = tabId;

  if (tabId === 'menu') {
    fetchMenu();
  } else if (tabId === 'stockpile') {
    fetchStockpile();
  } else if (tabId === 'preferences') {
    fetchPreferences();
  }
}

// Fetch Weekly Menu Status
async function fetchMenu() {
  try {
    const res = await fetch(`${API_BASE}/api/menu`);
    const data = await res.json();
    menuStatusData = data;
    
    // 1. Update Status Badge
    const badge = document.getElementById('menu-status-badge');
    badge.innerText = data.status.replace('_', ' ');
    badge.className = `status-badge ${data.status}`;

    if (data.menu) {
      const menu = data.menu;
      
      // 2. Populate Breakfast
      document.getElementById('breakfast-title').innerText = menu.breakfast.name;
      document.getElementById('breakfast-ingredients').innerText = menu.breakfast.ingredients.map(i => i.name).join(', ');
      document.getElementById('breakfast-instructions').innerText = menu.breakfast.instructions;
      
      // 3. Populate Lunch
      document.getElementById('lunch-title').innerText = menu.lunch.name;
      document.getElementById('lunch-ingredients').innerText = menu.lunch.ingredients.map(i => i.name).join(', ');
      document.getElementById('lunch-instructions').innerText = menu.lunch.instructions;

      // 4. Populate Dinners
      const dinnersList = document.getElementById('dinners-list');
      dinnersList.innerHTML = '';
      
      menu.dinners.forEach((dinner) => {
        const dCard = document.createElement('div');
        dCard.className = 'meal-card glass-card';
        dCard.innerHTML = `
          <div class="meal-image-container">
            <img src="images/grilled_chicken_zucchini.png" alt="${dinner.name}" class="meal-image" onerror="this.src='https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=60'">
            <span class="meal-type-tag">Dinner (${dinner.day})</span>
          </div>
          <div class="meal-details">
            <h3>${dinner.name}</h3>
            <p class="meal-desc"><strong>Ingredients:</strong> ${dinner.ingredients.map(i => i.name).join(', ')}</p>
            <div class="recipe-fold">
              <strong>Instructions:</strong>
              <p>${dinner.instructions}</p>
            </div>
          </div>
        `;
        dinnersList.appendChild(dCard);
      });

      // 5. Populate Shopping List
      const shopContainer = document.getElementById('shopping-list-items');
      shopContainer.innerHTML = '';
      
      Object.keys(menu.shoppingList).forEach((key) => {
        const item = menu.shoppingList[key];
        const bogoBadge = item.bogo ? `<span class="bogo-badge">BOGO Deal</span>` : '';
        const isStapleTag = item.isStaple ? ' [Staple]' : '';
        
        const div = document.createElement('div');
        div.className = 'shop-item';
        div.innerHTML = `
          <div class="shop-item-left">
            <span class="shop-item-name">${item.name}${bogoBadge}</span>
            <span class="shop-item-meta">Need: ${item.amount} ${item.unit} | Buy at <strong>${item.store}</strong>${isStapleTag}</span>
          </div>
          <span class="shop-item-price">$${item.total.toFixed(2)}</span>
        `;
        shopContainer.appendChild(div);
      });
    }

    // Disable buttons if already approved or skipped
    const btnApprove = document.getElementById('btn-approve-menu');
    const btnSkip = document.getElementById('btn-skip-menu');
    const btnRegen = document.getElementById('btn-regen-menu');

    if (data.status === 'approved' || data.status === 'cart_built') {
      btnApprove.disabled = true;
      btnApprove.innerText = 'Approved ✅';
      btnSkip.disabled = true;
      btnRegen.disabled = true;
    } else if (data.status === 'skipped') {
      btnApprove.disabled = true;
      btnSkip.disabled = true;
      btnSkip.innerText = 'Skipped ❌';
      btnRegen.disabled = false;
    } else {
      btnApprove.disabled = false;
      btnApprove.innerText = 'Approve Menu';
      btnSkip.disabled = false;
      btnSkip.innerText = 'Skip Week';
      btnRegen.disabled = false;
    }

  } catch (e) {
    console.error('Failed to load menu data:', e);
  }
}

// Fetch Stockpile Inventory
async function fetchStockpile() {
  try {
    const res = await fetch(`${API_BASE}/api/stockpile`);
    const data = await res.json();
    stockpileData = data;

    // Populate categories
    ['cooking', 'household', 'personal_care'].forEach((category) => {
      const container = document.getElementById(`stockpile-${category}`);
      container.innerHTML = '';

      if (data[category]) {
        Object.keys(data[category]).forEach((itemKey) => {
          const item = data[category][itemKey];
          
          let statusClass = 'status-known';
          if (item.status === 'unknown') statusClass = 'status-unknown';
          else if (item.quantity <= item.threshold) statusClass = 'status-low';

          const div = document.createElement('div');
          div.className = 'stockpile-item';
          div.innerHTML = `
            <div class="stock-item-info">
              <span class="stock-name">${item.name}</span>
              <span class="stock-status-desc ${statusClass}">Status: ${item.status.replace('_', ' ')}</span>
            </div>
            <div class="stock-item-qty">
              <input type="number" step="any" class="qty-input" value="${item.quantity}" onchange="updateStockItem('${category}', '${itemKey}', this.value)">
              <span class="qty-unit">${item.unit}</span>
            </div>
          `;
          container.appendChild(div);
        });
      }
    });
  } catch (e) {
    console.error('Failed to load stockpile data:', e);
  }
}

// Update specific stockpile item
async function updateStockItem(category, itemKey, newValue) {
  if (!stockpileData) return;
  
  stockpileData[category][itemKey].quantity = parseFloat(newValue);
  // If user updates it, set status to known
  stockpileData[category][itemKey].status = 'known';

  try {
    const res = await fetch(`${API_BASE}/api/stockpile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stockpileData)
    });
    if (res.ok) {
      fetchStockpile(); // Refresh
    }
  } catch (e) {
    console.error('Failed to update stockpile item:', e);
  }
}

// Trigger manual stockpile check email
async function triggerStockpileAudit() {
  if (!confirm('Are you sure you want to send a stockpile audit check email to the recipients right now?')) return;
  
  try {
    const res = await fetch(`${API_BASE}/api/stockpile/check`, { method: 'POST' });
    const data = await res.json();
    alert(data.message || 'Audit email sent!');
  } catch (e) {
    alert('Failed to send stockpile audit email.');
  }
}

// Fetch active preferences
async function fetchPreferences() {
  try {
    const res = await fetch(`${API_BASE}/api/preferences`);
    const data = await res.json();

    document.getElementById('favoriteCuisine').value = data.favoriteCuisine || '';
    document.getElementById('dietaryPreference').value = data.dietaryPreference || 'Balanced';
    document.getElementById('allergies').value = (data.allergies || []).join(', ');
    document.getElementById('avoidFoods').value = (data.avoidFoods || []).join(', ');
    document.getElementById('eatingSchedule').value = data.eatingSchedule || '';
    document.getElementById('prepStyle').value = data.prepStyle || '';
    document.getElementById('ingredientPriority').value = data.ingredientPriority || '';
  } catch (e) {
    console.error('Failed to load preferences:', e);
  }
}

// Save preferences form
async function savePreferences(event) {
  event.preventDefault();
  
  const prefs = {
    favoriteCuisine: document.getElementById('favoriteCuisine').value,
    dietaryPreference: document.getElementById('dietaryPreference').value,
    allergies: document.getElementById('allergies').value.split(',').map(s => s.trim()).filter(Boolean),
    avoidFoods: document.getElementById('avoidFoods').value.split(',').map(s => s.trim()).filter(Boolean),
    eatingSchedule: document.getElementById('eatingSchedule').value,
    prepStyle: document.getElementById('prepStyle').value,
    ingredientPriority: document.getElementById('ingredientPriority').value,
    macros: { protein: "High", carbs: "Moderate", fat: "Moderate" } // default macro balance
  };

  try {
    const res = await fetch(`${API_BASE}/api/preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs)
    });
    if (res.ok) {
      alert('Preferences saved successfully!');
    }
  } catch (e) {
    alert('Failed to save preferences.');
  }
}

// Action: Approve Menu
async function approveMenu() {
  if (!confirm('Approve this week\'s menu and build your delivery cart?')) return;
  
  const overlay = document.getElementById('checkout-overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayDesc = document.getElementById('overlay-desc');
  const overlayItems = document.getElementById('overlay-items-list');

  overlayTitle.innerText = 'Assembling Grocery Cart...';
  overlayDesc.innerText = 'Launching automated Puppeteer browser...';
  overlayItems.innerHTML = '';
  overlay.classList.add('active');

  try {
    const res = await fetch(`${API_BASE}/api/menu/approve`, { method: 'POST' });
    const data = await res.json();
    
    // Simulate reading list and building cart visually on screen
    if (menuStatusData && menuStatusData.menu) {
      const items = Object.values(menuStatusData.menu.shoppingList);
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await new Promise(r => setTimeout(r, 1200));
        
        overlayDesc.innerText = `Adding to ${item.store} cart: ${item.name}`;
        const div = document.createElement('div');
        div.className = 'overlay-item';
        div.innerHTML = `<span><strong>${item.name}</strong> (${item.store})</span> <span style="float:right; color:#2ecc71;">$${item.total.toFixed(2)}</span>`;
        overlayItems.appendChild(div);
      }
    }
    
    await new Promise(r => setTimeout(r, 1500));
    overlayTitle.innerText = 'Cart successfully built! 🎉';
    overlayDesc.innerText = 'Login to grocery store website to finalize checkout at your convenience.';
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'action-btn approve-btn';
    closeBtn.style.marginTop = '20px';
    closeBtn.innerText = 'Back to Dashboard';
    closeBtn.onclick = () => {
      overlay.classList.remove('active');
      fetchMenu();
    };
    overlayItems.appendChild(closeBtn);

  } catch (e) {
    overlayTitle.innerText = 'Error';
    overlayDesc.innerText = 'Failed to trigger checkout automation.';
    overlay.classList.remove('active');
  }
}

// Action: Skip Menu
async function skipMenu() {
  if (!confirm('Are you sure you want to skip meals for this week?')) return;
  
  try {
    const res = await fetch(`${API_BASE}/api/menu/skip`, { method: 'POST' });
    if (res.ok) {
      fetchMenu();
    }
  } catch (e) {
    console.error('Failed to skip menu:', e);
  }
}

// Action: Regenerate Menu
async function regenerateMenu() {
  const btn = document.getElementById('btn-regen-menu');
  const oldText = btn.innerText;
  btn.disabled = true;
  btn.innerText = 'Generating...';

  try {
    const res = await fetch(`${API_BASE}/api/menu/generate`, { method: 'POST' });
    if (res.ok) {
      fetchMenu();
    }
  } catch (e) {
    console.error('Failed to regenerate menu:', e);
  } finally {
    btn.disabled = false;
    btn.innerText = oldText;
  }
}

// Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
  switchTab('menu');
});
