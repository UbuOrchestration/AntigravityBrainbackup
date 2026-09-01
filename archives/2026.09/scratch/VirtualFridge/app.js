// 1. Core State Definition & Initial Stock Pre-seeding
const DEFAULT_INVENTORY = [
  {
    id: "predined-eggs",
    name: "Large Brown Eggs (18-ct)",
    category: "fridge",
    type: "eggs",
    price: 2.19,
    quantity: 12, // 12 eggs remaining out of 12
    maxQuantity: 12,
    addedDate: new Date().toLocaleDateString(),
    expiryDays: 18
  },
  {
    id: "predined-parmesan",
    name: "BelGioioso Parmesan Cheese",
    category: "fridge",
    type: "parmesan",
    price: 4.89,
    quantity: 100, // 100% full
    maxQuantity: 100,
    addedDate: new Date().toLocaleDateString(),
    expiryDays: 45
  },
  {
    id: "predined-feta",
    name: "Athenos Crumbled Feta (8 oz block)",
    category: "fridge",
    type: "feta",
    price: 4.99,
    quantity: 100, // 100% full
    maxQuantity: 100,
    addedDate: new Date().toLocaleDateString(),
    expiryDays: 30
  },
  {
    id: "predined-milk",
    name: "Publix Whole Milk (Gallon)",
    category: "fridge",
    type: "milk",
    price: 3.49,
    quantity: 100, // 100% full
    maxQuantity: 100,
    addedDate: new Date().toLocaleDateString(),
    expiryDays: 14
  }
];

let inventory = JSON.parse(localStorage.getItem('virtual_fridge_inv')) || DEFAULT_INVENTORY;
let selectedItemId = null;
let soundEnabled = true;

// 2. Web Audio API Sound Synthesizer (No external assets required!)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSynthSound(type) {
  if (!soundEnabled) return;
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  try {
    const now = audioCtx.currentTime;
    
    if (type === 'door_click') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } 
    else if (type === 'shake') {
      // Noise buffer for shaker
      const bufferSize = audioCtx.sampleRate * 0.1;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 3000;
      
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      noise.start(now);
    } 
    else if (type === 'pour') {
      // Pouring sound gurgle using an LFO modulating filter of bandpass noise
      const osc = audioCtx.createOscillator();
      const lfo = audioCtx.createOscillator();
      const lfoGain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();
      const gain = audioCtx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.linearRampToValueAtTime(120, now + 0.5);
      
      lfo.frequency.value = 8; // Gurgle rate
      lfoGain.gain.value = 30; // Modulation depth
      
      filter.type = 'bandpass';
      filter.frequency.value = 400;
      filter.Q.value = 10;
      
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      
      lfo.start(now);
      osc.start(now);
      lfo.stop(now + 0.5);
      osc.stop(now + 0.5);
    } 
    else if (type === 'snap') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    }
  } catch (e) {
    console.warn("Synth audio blocked or error:", e.message);
  }
}

// 3. Dynamic SVG Product Renderers based on Item State
function generateItemSVG(item, isLarge = false) {
  const percent = item.quantity / item.maxQuantity;
  const width = isLarge ? 120 : 45;
  const height = isLarge ? 150 : 60;
  
  if (item.type === 'milk') {
    // Transparent jug with liquid level
    const fillHeight = 65 * percent;
    const fillY = 90 - fillHeight;
    return `
      <svg width="${width}" height="${height}" viewBox="0 0 100 100" class="svg-item-milk">
        <!-- Jug Body Outline -->
        <rect x="25" y="25" width="50" height="65" rx="10" fill="none" stroke="#e2e8f0" stroke-width="4" />
        <!-- Handle -->
        <path d="M73,35 C83,35 83,55 73,55" fill="none" stroke="#e2e8f0" stroke-width="4" />
        <!-- Cap -->
        <rect x="42" y="18" width="16" height="8" rx="2" fill="#38bdf8" />
        <!-- Liquid Level -->
        <rect x="28" y="${fillY}" width="44" height="${fillHeight}" rx="4" fill="#ffffff" opacity="0.9" />
        <!-- Label -->
        <rect x="33" y="50" width="34" height="20" rx="2" fill="#0284c7" />
        <text x="50" y="63" font-size="9" fill="#fff" text-anchor="middle" font-family="Outfit" font-weight="bold">MILK</text>
      </svg>
    `;
  } 
  
  if (item.type === 'eggs') {
    // Carton Box that can be open or closed (in large view)
    const isOpen = isLarge && item.isOpen;
    if (isOpen) {
      // Open Carton grid
      let eggCells = '';
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 6; c++) {
          const idx = r * 6 + c;
          const hasEgg = idx < item.quantity;
          const x = 16 + c * 13;
          const y = 52 + r * 16;
          eggCells += hasEgg 
            ? `<ellipse cx="${x}" cy="${y}" rx="5" ry="7" fill="#fbbf24" stroke="#d97706" stroke-width="1" class="egg-node" data-idx="${idx}" style="cursor:pointer;" />`
            : `<ellipse cx="${x}" cy="${y}" rx="4" ry="5" fill="none" stroke="#475569" stroke-width="1" />`;
        }
      }
      return `
        <svg width="${width}" height="${height}" viewBox="0 0 100 100" class="svg-item-eggs-open">
          <!-- Open Carton Lid (Backing) -->
          <rect x="10" y="10" width="80" height="35" rx="5" fill="#475569" stroke="#334155" stroke-width="2" />
          <text x="50" y="30" font-size="8" fill="#cbd5e1" text-anchor="middle" font-family="Outfit">Publix Grade A</text>
          <!-- Base Grid Container -->
          <rect x="10" y="42" width="80" height="48" rx="5" fill="#64748b" stroke="#334155" stroke-width="2" />
          ${eggCells}
        </svg>
      `;
    } else {
      // Closed Carton Box
      return `
        <svg width="${width}" height="${height}" viewBox="0 0 100 100" class="svg-item-eggs-closed">
          <rect x="15" y="35" width="70" height="40" rx="6" fill="#cbd5e1" stroke="#94a3b8" stroke-width="3" />
          <line x1="15" y1="55" x2="85" y2="55" stroke="#94a3b8" stroke-width="2" />
          <rect x="25" y="42" width="50" height="15" fill="#f59e0b" rx="2" />
          <text x="50" y="52" font-size="9" fill="#fff" text-anchor="middle" font-family="Outfit" font-weight="bold">EGGS</text>
        </svg>
      `;
    }
  }

  if (item.type === 'feta') {
    // Crumbled Feta Cheese Tub
    const fillPercent = percent * 45;
    const fillY = 80 - fillPercent;
    return `
      <svg width="${width}" height="${height}" viewBox="0 0 100 100" class="svg-item-feta">
        <!-- Feta Tub Outline -->
        <polygon points="20,40 80,40 70,80 30,80" fill="none" stroke="#10b981" stroke-width="4" />
        <!-- Tub fill level -->
        <polygon points="23,${fillY} 77,${fillY} 70,80 30,80" fill="#f8fafc" opacity="0.9" />
        <!-- Tub Lid -->
        <rect x="15" y="32" width="70" height="8" rx="2" fill="#059669" />
        <!-- Label -->
        <rect x="28" y="50" width="44" height="18" rx="2" fill="#10b981" />
        <text x="50" y="62" font-size="8" fill="#fff" text-anchor="middle" font-family="Outfit" font-weight="bold">FETA</text>
      </svg>
    `;
  }

  if (item.type === 'parmesan') {
    // Shaker cylinder
    const fillHeight = 55 * percent;
    const fillY = 82 - fillHeight;
    return `
      <svg width="${width}" height="${height}" viewBox="0 0 100 100" class="svg-item-parmesan">
        <!-- Shaker body -->
        <rect x="30" y="28" width="40" height="55" rx="5" fill="none" stroke="#f59e0b" stroke-width="3" />
        <!-- Fill level (grated powder) -->
        <rect x="32" y="${fillY}" width="36" height="${fillHeight}" fill="#fef08a" opacity="0.95" />
        <!-- Lid with holes -->
        <rect x="27" y="20" width="46" height="8" rx="2" fill="#d97706" />
        <!-- Label -->
        <rect x="33" y="45" width="34" height="16" rx="2" fill="#d97706" />
        <text x="50" y="56" font-size="8" fill="#fff" text-anchor="middle" font-family="Outfit" font-weight="bold">PARM</text>
      </svg>
    `;
  }

  // Generic Packaging Vector
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 100 100" class="svg-item-generic">
      <polygon points="25,25 75,25 65,85 35,85" fill="#475569" stroke="#334155" stroke-width="4" />
      <polygon points="25,25 75,25 50,40" fill="#64748b" />
      <rect x="32" y="45" width="36" height="20" rx="2" fill="#334155" />
      <text x="50" y="58" font-size="8" fill="#cbd5e1" text-anchor="middle" font-family="Outfit" font-weight="bold">PACK</text>
    </svg>
  `;
}

// 4. Save and Synchronize Inventory States
function saveInventory() {
  localStorage.setItem('virtual_fridge_inv', JSON.stringify(inventory));
  updateStats();
}

// 5. Update Metrics & Render Shelves
function updateStats() {
  const totalItems = inventory.length;
  const freezerItems = inventory.filter(item => item.category === 'freezer').length;
  const fridgeItems = inventory.filter(item => item.category === 'fridge').length;
  
  // Estimate value
  const estVal = inventory.reduce((acc, item) => acc + (item.price * (item.quantity / item.maxQuantity)), 0).toFixed(2);
  
  // Expiring items (under 4 days equivalent or close to expiry)
  const expiringCount = inventory.filter(item => {
    const daysLeft = Math.ceil(item.expiryDays * (item.quantity / item.maxQuantity));
    return daysLeft <= 3;
  }).length;

  document.getElementById('total-items-stat').querySelector('.bubble-val').innerText = totalItems;
  document.getElementById('freezer-ratio-stat').querySelector('.bubble-val').innerText = `${freezerItems} / ${fridgeItems}`;
  document.getElementById('stat-est-value').innerText = `$${estVal}`;
  
  const expEl = document.getElementById('stat-expiring');
  expEl.innerText = expiringCount;
  if (expiringCount > 0) {
    expEl.parentElement.classList.add('alert');
  } else {
    expEl.parentElement.classList.remove('alert');
  }
}

function renderShelves() {
  // Clear all shelves
  const shelves = document.querySelectorAll('.shelf-items');
  shelves.forEach(s => s.innerHTML = '');

  inventory.forEach(item => {
    // Formulate card component representing product
    const itemEl = document.createElement('div');
    itemEl.className = 'food-item';
    itemEl.id = `item-${item.id}`;
    
    // Add warning color if expiring
    const daysLeft = Math.ceil(item.expiryDays * (item.quantity / item.maxQuantity));
    if (daysLeft <= 3) itemEl.classList.add('expiring');

    itemEl.innerHTML = `
      ${generateItemSVG(item)}
      <div class="food-item-badge">${Math.round((item.quantity / item.maxQuantity) * 100)}%</div>
    `;

    // Click handler to load detail view
    itemEl.addEventListener('click', (e) => {
      e.stopPropagation();
      loadItemDetail(item.id);
    });

    // Deduce target shelf index
    // Grouping strategy: eggs/milk on specific shelves, others distributed
    let targetShelfId = '';
    if (item.category === 'freezer') {
      // Distribute freezer items evenly
      const count = document.getElementById('freezer-shelf-1').querySelector('.shelf-items').children.length;
      const count2 = document.getElementById('freezer-shelf-2').querySelector('.shelf-items').children.length;
      if (count <= count2) {
        targetShelfId = 'freezer-shelf-1';
      } else {
        targetShelfId = 'freezer-shelf-2';
      }
    } else {
      // Refrigerator categorization
      if (item.type === 'eggs') {
        targetShelfId = 'fridge-shelf-1';
      } else if (item.type === 'milk') {
        targetShelfId = 'fridge-shelf-3';
      } else {
        targetShelfId = 'fridge-shelf-2';
      }
    }

    const targetShelf = document.getElementById(targetShelfId);
    if (targetShelf) {
      targetShelf.querySelector('.shelf-items').appendChild(itemEl);
    }
  });
}

// 6. Interactive Detail inspection Panel Handlers
function loadItemDetail(id) {
  const item = inventory.find(i => i.id === id);
  if (!item) return;

  selectedItemId = id;

  document.getElementById('detail-empty').classList.add('hide');
  const activePanel = document.getElementById('detail-active');
  activePanel.classList.remove('hide');

  document.getElementById('detail-category').innerText = item.category.toUpperCase();
  document.getElementById('detail-category').className = `category-badge ${item.category}`;
  document.getElementById('detail-title').innerText = item.name;
  
  const fillPct = Math.round((item.quantity / item.maxQuantity) * 100);
  document.getElementById('detail-qty-text').innerText = `${fillPct}%`;
  document.getElementById('detail-qty-lbl').innerText = item.type === 'eggs' ? `${item.quantity} Eggs Remaining` : 'Capacity Remaining';
  document.getElementById('detail-price-text').innerText = `$${item.price.toFixed(2)}`;
  
  document.getElementById('detail-added-date').innerText = `Added: ${item.addedDate}`;
  const daysLeft = Math.ceil(item.expiryDays * (item.quantity / item.maxQuantity));
  document.getElementById('detail-expiry-date').innerText = `Expires: In ${daysLeft} days`;
  
  // Render visual stage SVG
  const stage = document.getElementById('detail-visual');
  stage.innerHTML = generateItemSVG(item, true);

  // Setup interact button label
  const interactBtn = document.getElementById('action-interact-btn');
  if (item.type === 'milk') {
    interactBtn.innerText = 'Pour Glass';
    interactBtn.disabled = item.quantity <= 0;
  } else if (item.type === 'eggs') {
    interactBtn.innerText = item.isOpen ? 'Close Carton' : 'Open Carton';
    interactBtn.disabled = false;
  } else if (item.type === 'parmesan') {
    interactBtn.innerText = 'Shake Cheese';
    interactBtn.disabled = item.quantity <= 0;
  } else if (item.type === 'feta') {
    interactBtn.innerText = 'Scoop Feta';
    interactBtn.disabled = item.quantity <= 0;
  } else {
    interactBtn.innerText = 'Use Package';
    interactBtn.disabled = item.quantity <= 0;
  }

  // Setup grid click handlers for open egg carton grid inside detail stage
  if (item.type === 'eggs' && item.isOpen) {
    const eggs = stage.querySelectorAll('.egg-node');
    eggs.forEach(egg => {
      egg.addEventListener('click', (e) => {
        const idx = parseInt(egg.getAttribute('data-idx'));
        consumeEgg(item.id, idx);
      });
    });
  }
}

// 7. Interactive consumption mechanics (Pouring, Shaking, carton opening)
async function handleInteract() {
  if (!selectedItemId) return;
  const item = inventory.find(i => i.id === selectedItemId);
  if (!item) return;

  const stage = document.getElementById('detail-visual');

  if (item.type === 'milk') {
    if (item.quantity <= 0) return;
    
    // Tilt jug & pour animation
    playSynthSound('pour');
    const svgEl = stage.querySelector('svg');
    svgEl.classList.add('pour-tilt-animation');
    
    // Add stream particle overlay
    const stream = document.createElement('div');
    stream.className = 'pour-stream';
    stage.appendChild(stream);

    await new Promise(r => setTimeout(r, 1200));
    
    item.quantity = Math.max(0, item.quantity - 20);
    stream.remove();
  } 
  
  else if (item.type === 'parmesan') {
    if (item.quantity <= 0) return;
    
    // Shake shaker container
    playSynthSound('shake');
    const svgEl = stage.querySelector('svg');
    svgEl.classList.add('shake-animation');
    
    await new Promise(r => setTimeout(r, 800));
    
    item.quantity = Math.max(0, item.quantity - 10);
  } 
  
  else if (item.type === 'feta') {
    if (item.quantity <= 0) return;
    
    playSynthSound('snap');
    item.quantity = Math.max(0, item.quantity - 25);
  } 
  
  else if (item.type === 'eggs') {
    // Toggles lid state
    playSynthSound('door_click');
    item.isOpen = !item.isOpen;
  } 
  
  else {
    // Generic
    playSynthSound('snap');
    item.quantity = Math.max(0, item.quantity - 20);
  }

  saveInventory();
  renderShelves();
  loadItemDetail(item.id);
}

function consumeEgg(itemId, eggIndex) {
  const item = inventory.find(i => i.id === itemId);
  if (!item || item.quantity <= 0) return;

  playSynthSound('snap');
  item.quantity = Math.max(0, item.quantity - 1);
  
  saveInventory();
  renderShelves();
  loadItemDetail(item.id);
}

function handleRestock() {
  if (!selectedItemId) return;
  const item = inventory.find(i => i.id === selectedItemId);
  if (!item) return;

  playSynthSound('snap');
  item.quantity = item.maxQuantity;
  
  saveInventory();
  renderShelves();
  loadItemDetail(item.id);
}

function handleDiscard() {
  if (!selectedItemId) return;
  
  playSynthSound('shake');
  inventory = inventory.filter(i => i.id !== selectedItemId);
  selectedItemId = null;
  
  document.getElementById('detail-active').classList.add('hide');
  document.getElementById('detail-empty').classList.remove('hide');
  
  saveInventory();
  renderShelves();
}

// 8. Refrigerator and Freezer door open/close toggle
function setupDoors() {
  const freezerDoor = document.getElementById('freezer-door');
  const fridgeDoor = document.getElementById('fridge-door');

  freezerDoor.addEventListener('click', () => {
    playSynthSound('door_click');
    freezerDoor.classList.toggle('open');
  });

  fridgeDoor.addEventListener('click', () => {
    playSynthSound('door_click');
    fridgeDoor.classList.toggle('open');
  });
}

// 9. Synchronize API log updates
function addSyncLog(message, type = 'sync') {
  const logContainer = document.getElementById('sync-logs');
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.innerHTML = `
    <span class="dot"></span>
    <span class="text">[${new Date().toLocaleTimeString()}] ${message}</span>
  `;
  logContainer.appendChild(entry);
  logContainer.scrollTop = logContainer.scrollHeight;
}

// 10. Form Submittal to Stock New Items
document.getElementById('add-item-form').addEventListener('submit', (e) => {
  e.preventDefault();
  
  const name = document.getElementById('item-name').value;
  const category = document.getElementById('item-category').value;
  const type = document.getElementById('item-type').value;
  const price = parseFloat(document.getElementById('item-price').value);
  const expiry = parseInt(document.getElementById('item-expiry').value);
  
  const id = `item-${Date.now()}`;
  
  const newItem = {
    id: id,
    name: name,
    category: category,
    type: type,
    price: price,
    quantity: type === 'eggs' ? 12 : 100,
    maxQuantity: type === 'eggs' ? 12 : 100,
    addedDate: new Date().toLocaleDateString(),
    expiryDays: expiry
  };
  
  inventory.push(newItem);
  playSynthSound('snap');
  
  saveInventory();
  renderShelves();
  
  // Auto open target door for feedback
  const door = document.getElementById(`${category}-door`);
  if (door && !door.classList.contains('open')) {
    door.classList.add('open');
  }

  // Clear inputs
  document.getElementById('item-name').value = '';
});

// Sound Toggle Handler
document.getElementById('sound-toggle-btn').addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  const btn = document.getElementById('sound-toggle-btn');
  btn.innerHTML = soundEnabled ? '<span class="icon">🔊</span> Sound Synth' : '<span class="icon">🔇</span> Sound Muted';
});

// Setup detail action button listeners
document.getElementById('action-interact-btn').addEventListener('click', handleInteract);
document.getElementById('action-restock-btn').addEventListener('click', handleRestock);
document.getElementById('action-discard-btn').addEventListener('click', handleDiscard);

// 11. Long-polling Sync checker with Express backend
async function checkInventorySync() {
  try {
    const res = await fetch('/api/inventory');
    if (res.ok) {
      const data = await res.json();
      if (data.updated && data.items) {
        inventory = data.items;
        saveInventory();
        renderShelves();
        if (selectedItemId) loadItemDetail(selectedItemId);
        addSyncLog("Synced with autonomous procurement log!", "sync");
      }
    }
  } catch (err) {
    // Fail silently, server might not be running yet
  }
}

// Initialise Application
setupDoors();
updateStats();
renderShelves();

// Poll server every 4 seconds for inventory updates
setInterval(checkInventorySync, 4000);
