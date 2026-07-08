// GE-Hound Frontend Application Logic

// Global state
let itemsMap = {}; // ID -> Item mapping
let pricesMap = {}; // ID -> Latest price data
let itemsList = []; // Array of combined item data
let watchlist = []; // Array of item IDs
let watchlistRecipes = []; // Array of favorited recipe names
let activeTab = 'crafting';
let activeItem = null; // Currently selected item in modal
let priceChartInstance = null;
let craftingSortColumn = 'profit';
let craftingSortDir = 'desc';
let pkSortColumn = 'profit';
let pkSortDir = 'desc';

// DOM Elements
const totalItemsEl = document.getElementById('stat-total-items');
const btnRefresh = document.getElementById('btn-refresh');
const tabCrafting = document.getElementById('tab-crafting');
const tabPk = document.getElementById('tab-pk');
const craftingBoard = document.getElementById('crafting-board');
const pkBoard = document.getElementById('pk-board');
const searchInput = document.getElementById('search-input');
const searchClear = document.getElementById('search-clear');
const priceRange = document.getElementById('price-range');
const priceDisplay = document.getElementById('price-display');
const roiRange = document.getElementById('roi-range');
const roiDisplay = document.getElementById('roi-display');
const chkMembers = document.getElementById('chk-members');
const chkF2p = document.getElementById('chk-f2p');
const craftingTbody = document.getElementById('crafting-tbody');
const pkTbody = document.getElementById('pk-tbody');
const pkResultsCount = document.getElementById('pk-results-count');
const watchlistContainer = document.getElementById('watchlist-container');
const watchlistCount = document.getElementById('watchlist-count');
const btnRefreshItems = document.getElementById('btn-refresh-items');
const btnRefreshRecipes = document.getElementById('btn-refresh-recipes');
const watchlistRecipesContainer = document.getElementById('watchlist-recipes-container');
const watchlistRecipesCount = document.getElementById('watchlist-recipes-count');

// Modal Elements
const itemModal = document.getElementById('item-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const modalItemIcon = document.getElementById('modal-item-icon');
const modalItemName = document.getElementById('modal-item-name');
const modalItemExamine = document.getElementById('modal-item-examine');
const modalBtnWatchlist = document.getElementById('modal-btn-watchlist');
const modalLimit = document.getElementById('modal-limit');
const modalLow = document.getElementById('modal-low');
const modalHigh = document.getElementById('modal-high');
const modalNet = document.getElementById('modal-net');
const calcBudget = document.getElementById('calc-budget');
const calcQuantity = document.getElementById('calc-quantity');
const calcTotalSpent = document.getElementById('calc-total-spent');
const calcTotalRev = document.getElementById('calc-total-rev');
const calcNetProfit = document.getElementById('calc-net-profit');
const chartLoading = document.getElementById('chart-loading');

// Predefined Crafting & Fletching Recipes
const RECIPES = [
  {
    name: 'Dragon bolts fletching',
    product: { id: 21905, name: 'Dragon bolts' },
    ingredients: [
      { id: 21930, name: 'Dragon bolts (unf)', qty: 1 },
      { id: 314, name: 'Feather', qty: 1 }
    ]
  },
  {
    name: 'Runite bolts fletching',
    product: { id: 9144, name: 'Runite bolts' },
    ingredients: [
      { id: 21928, name: 'Runite bolts (unf)', qty: 1 },
      { id: 314, name: 'Feather', qty: 1 }
    ]
  },
  {
    name: 'Adamant bolts fletching',
    product: { id: 9143, name: 'Adamant bolts' },
    ingredients: [
      { id: 21926, name: 'Adamant bolts (unf)', qty: 1 },
      { id: 314, name: 'Feather', qty: 1 }
    ]
  },
  {
    name: 'Ruby bolts tipping',
    product: { id: 9142, name: 'Ruby bolts' },
    ingredients: [
      { id: 9144, name: 'Runite bolts', qty: 1 },
      { id: 9191, name: 'Ruby bolt tips', qty: 1 }
    ]
  },
  {
    name: 'Diamond bolts tipping',
    product: { id: 9141, name: 'Diamond bolts' },
    ingredients: [
      { id: 9144, name: 'Runite bolts', qty: 1 },
      { id: 9192, name: 'Diamond bolt tips', qty: 1 }
    ]
  },
  {
    name: 'Fletching Steel darts',
    product: { id: 825, name: 'Steel dart', multiplier: 1 },
    ingredients: [
      { id: 819, name: 'Steel dart tip', qty: 1 },
      { id: 314, name: 'Feather', qty: 1 }
    ]
  },
  {
    name: 'Smithing Steel dart tips',
    product: { id: 819, name: 'Steel dart tip', multiplier: 15 },
    ingredients: [
      { id: 2353, name: 'Steel bar', qty: 1 }
    ]
  },
  {
    name: 'Smithing Mithril dart tips',
    product: { id: 820, name: 'Mithril dart tip', multiplier: 15 },
    ingredients: [
      { id: 2359, name: 'Mithril bar', qty: 1 }
    ]
  },
  {
    name: 'Smithing Adamant dart tips',
    product: { id: 821, name: 'Adamant dart tip', multiplier: 15 },
    ingredients: [
      { id: 2361, name: 'Adamant bar', qty: 1 }
    ]
  },
  {
    name: 'Making Prayer potions',
    product: { id: 2434, name: 'Prayer potion(4)' },
    isThreeDosePotion: true,
    ingredients: [
      { id: 99, name: 'Ranarr potion (unf)', qty: 1 },
      { id: 231, name: 'Snape grass', qty: 1 }
    ]
  },
  {
    name: 'Making Saradomin brews',
    product: { id: 6685, name: 'Saradomin brew(4)' },
    isThreeDosePotion: true,
    ingredients: [
      { id: 3002, name: 'Toadflax potion (unf)', qty: 1 },
      { id: 6693, name: 'Crushed nest', qty: 1 }
    ]
  },
  {
    name: 'Making Air battlestaves',
    product: { id: 1397, name: 'Air battlestaff' },
    ingredients: [
      { id: 1391, name: 'Battlestaff', qty: 1 },
      { id: 573, name: 'Air orb', qty: 1 }
    ]
  },
  {
    name: 'Making Water battlestaves',
    product: { id: 1395, name: 'Water battlestaff' },
    ingredients: [
      { id: 1391, name: 'Battlestaff', qty: 1 },
      { id: 571, name: 'Water orb', qty: 1 }
    ]
  },
  {
    name: 'Making Earth battlestaves',
    product: { id: 1399, name: 'Earth battlestaff' },
    ingredients: [
      { id: 1391, name: 'Battlestaff', qty: 1 },
      { id: 575, name: 'Earth orb', qty: 1 }
    ]
  },
  {
    name: 'Making Fire battlestaves',
    product: { id: 1393, name: 'Fire battlestaff' },
    ingredients: [
      { id: 1391, name: 'Battlestaff', qty: 1 },
      { id: 569, name: 'Fire orb', qty: 1 }
    ]
  }
];

const PK_ITEMS = [
  { id: 11791, name: 'Staff of the dead' },
  { id: 12932, name: 'Magic fang' },
  { id: 4712, name: "Ahrim's robetop" },
  { id: 4714, name: "Ahrim's robeskirt" },
  { id: 13652, name: 'Dragon claws' },
  { id: 27690, name: 'Voidwaker' },
  { id: 12927, name: 'Serpentine visage' },
  { id: 11802, name: 'Armadyl godsword' },
  { id: 11804, name: 'Bandos godsword' },
  { id: 12877, name: "Dharok's armour set" },
  { id: 4153, name: 'Granite maul' },
  { id: 24268, name: 'Basilisk jaw' },
  { id: 21003, name: 'Elder maul' },
  { id: 19481, name: 'Heavy ballista' },
  { id: 22324, name: 'Ghrazi rapier' }
];

let pkTrendsMap = {};

// Helper to format GP values nicely (e.g. 1.2M, 50k, 2,500)
function formatGP(value) {
  if (value === null || value === undefined || isNaN(value)) return '--';
  const num = Number(value);
  const isNegative = num < 0;
  const absNum = Math.abs(num);

  let formatted = '';
  if (absNum >= 10000000) {
    formatted = (absNum / 1000000).toFixed(2) + 'M';
  } else if (absNum >= 100000) {
    formatted = Math.round(absNum / 1000) + 'k';
  } else {
    formatted = absNum.toLocaleString();
  }
  return (isNegative ? '-' : '') + formatted + ' GP';
}

function formatRawGP(value) {
  if (value === null || value === undefined || isNaN(value)) return '--';
  return Number(value).toLocaleString() + ' GP';
}

// Convert log-based price slider value to actual GP
const PRICE_STEPS = [100, 1000, 10000, 100000, 1000000, 10000000, 100000000, 500000000, Infinity];
const PRICE_LABELS = ['100 GP', '1k GP', '10k GP', '100k GP', '1M GP', '10M GP', '100M GP', '500M GP', 'Any Price'];

function getMaxPriceFromSlider(val) {
  return PRICE_STEPS[val] || Infinity;
}

// Initialize
async function init() {
  loadWatchlist();
  setupEventListeners();
  await loadData();
}

// Load Watchlist from Local Storage
function loadWatchlist() {
  const saved = localStorage.getItem('ge_hound_watchlist');
  if (saved) {
    try {
      watchlist = JSON.parse(saved);
    } catch (e) {
      watchlist = [];
    }
  }

  const savedRecipes = localStorage.getItem('ge_hound_watchlist_recipes');
  if (savedRecipes) {
    try {
      watchlistRecipes = JSON.parse(savedRecipes);
    } catch (e) {
      watchlistRecipes = [];
    }
  }
  updateWatchlistUI();
}

// Save Watchlist to Local Storage
function saveWatchlist() {
  localStorage.setItem('ge_hound_watchlist', JSON.stringify(watchlist));
  updateWatchlistUI();
}

function saveWatchlistRecipes() {
  localStorage.setItem('ge_hound_watchlist_recipes', JSON.stringify(watchlistRecipes));
  updateWatchlistUI();
}

window.toggleRecipeWatchlist = function(name) {
  const index = watchlistRecipes.indexOf(name);
  if (index === -1) {
    watchlistRecipes.push(name);
  } else {
    watchlistRecipes.splice(index, 1);
  }
  saveWatchlistRecipes();
  if (activeTab === 'crafting') {
    renderCraftingBoard();
  }
};

// Setup Event Listeners
function setupEventListeners() {
  // Tabs switcher
  tabCrafting.addEventListener('click', () => switchTab('crafting'));
  tabPk.addEventListener('click', () => switchTab('pk'));

  // Search input
  searchInput.addEventListener('input', () => {
    searchClear.style.display = searchInput.value ? 'block' : 'none';
    triggerFilters();
  });
  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.style.display = 'none';
    triggerFilters();
  });

  // Sliders & Checkboxes
  priceRange.addEventListener('input', (e) => {
    priceDisplay.textContent = PRICE_LABELS[e.target.value];
    triggerFilters();
  });
  roiRange.addEventListener('input', (e) => {
    roiDisplay.textContent = e.target.value === '0' ? '0%' : `${e.target.value}%`;
    triggerFilters();
  });
  chkMembers.addEventListener('change', triggerFilters);
  chkF2p.addEventListener('change', triggerFilters);

  // Refresh button (forces cache bypass)
  btnRefresh.addEventListener('click', async () => {
    btnRefresh.disabled = true;
    btnRefresh.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Refreshing...';
    await loadData(true);
    btnRefresh.disabled = false;
    btnRefresh.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Refresh Prices';
  });

  // Watchlist Recipes Refresh
  btnRefreshRecipes.addEventListener('click', async () => {
    btnRefreshRecipes.disabled = true;
    btnRefreshRecipes.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    await loadData(true);
    btnRefreshRecipes.disabled = false;
    btnRefreshRecipes.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i>';
  });

  // Watchlist Items Refresh
  btnRefreshItems.addEventListener('click', async () => {
    btnRefreshItems.disabled = true;
    btnRefreshItems.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    await loadData(true);
    btnRefreshItems.disabled = false;
    btnRefreshItems.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i>';
  });

  // Modal close
  btnCloseModal.addEventListener('click', closeModal);
  itemModal.addEventListener('click', (e) => {
    if (e.target === itemModal) closeModal();
  });

  // Calculator inputs
  calcBudget.addEventListener('input', updateCalculator);
  calcQuantity.addEventListener('input', updateCalculatorByQty);

  // Watchlist toggle in Modal
  modalBtnWatchlist.addEventListener('click', () => {
    if (!activeItem) return;
    toggleWatchlist(activeItem.id);
    updateModalWatchlistButton();
  });

  // Time Series Chart Tab Buttons
  document.querySelectorAll('.chart-tab-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      document.querySelectorAll('.chart-tab-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      const timestep = e.target.getAttribute('data-timestep');
      if (activeItem) {
        await loadChartData(activeItem.id, timestep);
      }
    });
  });

  // Table header clicks sorting
  document.querySelectorAll('#crafting-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.getAttribute('data-sort');
      if (craftingSortColumn === col) {
        craftingSortDir = craftingSortDir === 'desc' ? 'asc' : 'desc';
      } else {
        craftingSortColumn = col;
        craftingSortDir = 'desc';
      }
      renderCraftingBoard();
    });
  });

  document.querySelectorAll('#pk-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.getAttribute('data-sort');
      if (pkSortColumn === col) {
        pkSortDir = pkSortDir === 'desc' ? 'asc' : 'desc';
      } else {
        pkSortColumn = col;
        pkSortDir = 'desc';
      }
      renderPKBoard();
    });
  });
}

function updateHeadersUI(tableSelector, activeCol, activeDir) {
  document.querySelectorAll(`${tableSelector} th.sortable`).forEach(th => {
    // Remove existing sort icons
    const existingIcon = th.querySelector('i.sort-icon');
    if (existingIcon) {
      existingIcon.remove();
    }
    
    const col = th.getAttribute('data-sort');
    if (col === activeCol) {
      const icon = document.createElement('i');
      icon.className = `sort-icon fa-solid ${activeDir === 'desc' ? 'fa-caret-down' : 'fa-caret-up'}`;
      th.appendChild(icon);
    }
  });
}

window.switchTab = function(tab) {
  activeTab = tab;
  if (tab === 'crafting') {
    tabCrafting.classList.add('active');
    tabPk.classList.remove('active');
    craftingBoard.classList.add('active');
    pkBoard.classList.remove('active');
  } else {
    tabCrafting.classList.remove('active');
    tabPk.classList.add('active');
    craftingBoard.classList.remove('active');
    pkBoard.classList.add('active');
    loadPKBoardData();
  }
  triggerFilters();
};

let loadingPKData = false;

function getWeekStartDate(timestamp) {
  const date = new Date(timestamp * 1000);
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, ...
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toDateString();
}

async function loadPKBoardData(force = false) {
  if (Object.keys(pkTrendsMap).length > 0 && !force) {
    renderPKBoard();
    return;
  }

  if (loadingPKData) return;
  loadingPKData = true;

  pkTbody.innerHTML = `
    <tr>
      <td colspan="10" class="text-center table-loading">
        <i class="fa-solid fa-spinner fa-spin"></i> Analyzing weekly historical PK trends...
      </td>
    </tr>
  `;

  try {
    const promises = PK_ITEMS.map(async (item) => {
      try {
        const response = await fetch(`/api/timeseries?id=${item.id}&timestep=24h${force ? '&force=true' : ''}`);
        if (!response.ok) throw new Error('API error');
        const json = await response.json();
        
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
          // Analyze last 90 days (approx. 13 calendar weeks)
          const points = json.data.slice(-90);
          let weeks = {}; // key -> { weekdayLows: [], weekendHighs: [] }
          
          points.forEach(point => {
            const date = new Date(point.timestamp * 1000);
            const day = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
            const isWeekend = (day === 0 || day === 5 || day === 6); // Fri, Sat, Sun
            
            const weekKey = getWeekStartDate(point.timestamp);
            if (!weeks[weekKey]) {
              weeks[weekKey] = { weekdayLows: [], weekendHighs: [] };
            }
            
            if (isWeekend) {
              if (point.avgHighPrice !== null && point.avgHighPrice !== undefined) {
                weeks[weekKey].weekendHighs.push(point.avgHighPrice);
              }
            } else {
              if (point.avgLowPrice !== null && point.avgLowPrice !== undefined) {
                weeks[weekKey].weekdayLows.push(point.avgLowPrice);
              }
            }
          });
          
          let totalWeeks = 0;
          let successfulWeeks = 0;
          let allWeekdayLows = [];
          let allWeekendHighs = [];
          
          for (const key in weeks) {
            const w = weeks[key];
            if (w.weekdayLows.length > 0 && w.weekendHighs.length > 0) {
              totalWeeks++;
              const wLowAvg = w.weekdayLows.reduce((a, b) => a + b, 0) / w.weekdayLows.length;
              const wHighAvg = w.weekendHighs.reduce((a, b) => a + b, 0) / w.weekendHighs.length;
              
              const wTax = Math.min(5000000, Math.floor(wHighAvg * 0.01));
              const wNetProfit = wHighAvg - wTax - wLowAvg;
              const wRoi = wLowAvg > 0 ? (wNetProfit / wLowAvg) * 100 : 0;
              
              if (wRoi >= 6.0) { // ROI >= 6% threshold
                successfulWeeks++;
              }
              
              allWeekdayLows.push(...w.weekdayLows);
              allWeekendHighs.push(...w.weekendHighs);
            }
          }
          
          if (allWeekdayLows.length > 0 && allWeekendHighs.length > 0) {
            const weekdayLowAvg = allWeekdayLows.reduce((a, b) => a + b, 0) / allWeekdayLows.length;
            const weekendHighAvg = allWeekendHighs.reduce((a, b) => a + b, 0) / allWeekendHighs.length;
            
            const tax = Math.min(5000000, Math.floor(weekendHighAvg * 0.01));
            const netProfit = weekendHighAvg - tax - weekdayLowAvg;
            const roi = weekdayLowAvg > 0 ? (netProfit / weekdayLowAvg) * 100 : 0;
            const consistency = totalWeeks > 0 ? (successfulWeeks / totalWeeks) * 100 : 0;
            
            pkTrendsMap[item.id] = {
              weekdayLow: Math.round(weekdayLowAvg),
              weekendHigh: Math.round(weekendHighAvg),
              tax: Math.round(tax),
              netProfit: Math.round(netProfit),
              roi: roi,
              consistency: consistency,
              consistencyText: `${Math.round(consistency)}% (${successfulWeeks}/${totalWeeks} wks)`
            };
          }
        }
      } catch (err) {
        console.error(`Error analyzing PK item ${item.name}:`, err);
      }
    });

    await Promise.all(promises);
    loadingPKData = false;
    renderPKBoard();
  } catch (error) {
    console.error('Error loading PK data:', error);
    loadingPKData = false;
    pkTbody.innerHTML = `<tr><td colspan="10" class="text-center text-red">Failed to analyze PK trends. Try refreshing.</td></tr>`;
  }
}

function renderPKBoard() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const maxPrice = getMaxPriceFromSlider(parseInt(priceRange.value));
  const minRoi = parseFloat(roiRange.value);
  const allowMembers = chkMembers.checked;
  const allowF2p = chkF2p.checked;

  let computedPKItems = [];

  PK_ITEMS.forEach(item => {
    // 1. Search term filter
    if (searchTerm && !item.name.toLowerCase().includes(searchTerm)) {
      return;
    }

    const itemMeta = itemsMap[item.id];
    // 2. Members/F2P filter
    if (itemMeta) {
      if (itemMeta.members && !allowMembers) return;
      if (!itemMeta.members && !allowF2p) return;
    }

    const trend = pkTrendsMap[item.id];
    if (trend) {
      // 3. Price filter (based on weekday buy target)
      if (trend.weekdayLow > maxPrice) {
        return;
      }
      
      // 4. Custom ROI slider filter
      if (trend.roi < minRoi) {
        return;
      }

      const limit = itemMeta ? itemMeta.limit || 0 : 0;
      const maxProfit = trend.netProfit * limit;

      computedPKItems.push({
        item,
        itemMeta,
        trend,
        limit,
        maxProfit
      });
    }
  });

  // Sort computedPKItems
  computedPKItems.sort((a, b) => {
    let comparison = 0;
    if (pkSortColumn === 'name') {
      comparison = a.item.name.localeCompare(b.item.name);
    } else if (pkSortColumn === 'buy') {
      comparison = a.trend.weekdayLow - b.trend.weekdayLow;
    } else if (pkSortColumn === 'sell') {
      comparison = a.trend.weekendHigh - b.trend.weekendHigh;
    } else if (pkSortColumn === 'tax') {
      comparison = a.trend.tax - b.trend.tax;
    } else if (pkSortColumn === 'profit') {
      comparison = a.trend.netProfit - b.trend.netProfit;
    } else if (pkSortColumn === 'roi') {
      comparison = a.trend.roi - b.trend.roi;
    } else if (pkSortColumn === 'consistency') {
      comparison = a.trend.consistency - b.trend.consistency;
    } else if (pkSortColumn === 'limit') {
      comparison = a.limit - b.limit;
    } else if (pkSortColumn === 'pot') {
      comparison = a.maxProfit - b.maxProfit;
    }
    return pkSortDir === 'desc' ? -comparison : comparison;
  });

  // Render headers to include icons
  updateHeadersUI('#pk-table', pkSortColumn, pkSortDir);

  let html = '';
  computedPKItems.forEach(computed => {
    const item = computed.item;
    const itemMeta = computed.itemMeta;
    const trend = computed.trend;
    const limit = computed.limit;
    const maxProfit = computed.maxProfit;
    
    const profitClass = trend.netProfit > 0 ? 'text-green' : (trend.netProfit < 0 ? 'text-red' : '');
    const roiClass = trend.roi > 5 ? 'text-green text-bold' : (trend.roi < 0 ? 'text-red' : '');

    const isWatched = watchlist.includes(item.id);
    const starClass = isWatched ? 'fa-solid fa-star active' : 'fa-regular fa-star';

    html += `
      <tr onclick="openItemModal(${item.id})">
        <td class="col-star text-center" onclick="event.stopPropagation(); toggleWatchlist(${item.id})">
          <button class="btn-star ${isWatched ? 'active' : ''}">
            <i class="${starClass}"></i>
          </button>
        </td>
        <td>
          <div class="item-cell">
            <img class="item-icon" src="https://secure.runescape.com/m=itemdb_oldschool/obj_sprite.gif?id=${item.id}" alt="${item.name}" onerror="this.src='https://oldschool.runescape.wiki/images/6/6f/Grand_Exchange_icon.png'">
            <div>
              <strong>${item.name}</strong>
              ${itemMeta && itemMeta.members ? '<span class="item-members-badge">M</span>' : ''}
            </div>
          </div>
        </td>
        <td class="text-right text-green">${trend.weekdayLow.toLocaleString()} GP</td>
        <td class="text-right text-gold">${trend.weekendHigh.toLocaleString()} GP</td>
        <td class="text-right text-red">${trend.tax.toLocaleString()} GP</td>
        <td class="text-right ${profitClass} text-bold">${(trend.netProfit > 0 ? '+' : '') + trend.netProfit.toLocaleString()} GP</td>
        <td class="text-right ${roiClass}">${trend.roi.toFixed(2)}%</td>
        <td class="text-right text-bold text-gold">${trend.consistencyText}</td>
        <td class="text-right">${limit > 0 ? limit.toLocaleString() : '--'}</td>
        <td class="text-right text-green text-bold">${formatGP(maxProfit)}</td>
      </tr>
    `;
  });

  pkResultsCount.textContent = `Weekend PK Flips (${computedPKItems.length} items)`;

  if (html === '') {
    pkTbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted">No PK flips matching your filters.</td></tr>`;
  } else {
    pkTbody.innerHTML = html;
  }
}

// Fetch Mapping and Latest prices
async function loadData(force = false) {
  try {
    const [mappingResponse, latestResponse] = await Promise.all([
      fetch('/api/mapping'),
      fetch(`/api/latest${force ? '?force=true' : ''}`)
    ]);

    const mappingData = await mappingResponse.json();
    const latestData = await latestResponse.json();

    // Store maps
    itemsMap = {};
    mappingData.forEach(item => {
      itemsMap[item.id] = item;
    });
    pricesMap = latestData.data || {};

    // Combine mapping & latest data
    itemsList = [];
    mappingData.forEach(item => {
      const price = pricesMap[item.id];
      if (price && price.high !== undefined && price.low !== undefined) {
        const high = price.high;
        const low = price.low;
        const limit = item.limit || 0;

        // Calculations
        const rawMargin = high - low;
        const tax = Math.min(5000000, Math.floor(high * 0.01));
        const netMargin = high - tax - low;
        const roi = low > 0 ? (netMargin / low) * 100 : 0;
        const potentialProfit = netMargin * limit;

        itemsList.push({
          ...item,
          high,
          low,
          rawMargin,
          tax,
          netMargin,
          roi,
          potentialProfit,
          highTime: price.highTime,
          lowTime: price.lowTime
        });
      }
    });

    totalItemsEl.textContent = itemsList.length.toLocaleString();
    if (force) {
      pkTrendsMap = {};
    }
    if (activeTab === 'pk') {
      await loadPKBoardData(force);
    }
    triggerFilters();
  } catch (error) {
    console.error('Error fetching data:', error);
    totalItemsEl.textContent = 'Error';
    craftingTbody.innerHTML = `<tr><td colspan="9" class="text-center text-red"><i class="fa-solid fa-triangle-exclamation"></i> Failed to retrieve current market data. Try refreshing.</td></tr>`;
  }
}

// Filter and Sort Handler
function triggerFilters() {
  if (activeTab === 'crafting') {
    renderCraftingBoard();
  } else {
    renderPKBoard();
  }
  updateWatchlistUI();
}

function renderFlippingBoard() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const maxPrice = getMaxPriceFromSlider(parseInt(priceRange.value));
  const minRoi = parseFloat(roiRange.value);
  const allowMembers = chkMembers.checked;
  const allowF2p = chkF2p.checked;
  const sortBy = sortSelect.value;

  // Filter items
  let filtered = itemsList.filter(item => {
    // Search filter
    if (searchTerm && !item.name.toLowerCase().includes(searchTerm)) {
      return false;
    }
    // Price filter (based on High/Sell price)
    if (item.high > maxPrice) {
      return false;
    }
    // Only show potential flip items if value > 300k
    if (item.high < 300000) {
      return false;
    }
    // ROI filter
    if (item.roi < minRoi) {
      return false;
    }
    // Members / F2P filter
    if (item.members && !allowMembers) return false;
    if (!item.members && !allowF2p) return false;

    return true;
  });

  // Sort items
  filtered.sort((a, b) => {
    if (sortBy === 'profit') return b.potentialProfit - a.potentialProfit;
    if (sortBy === 'roi') return b.roi - a.roi;
    if (sortBy === 'margin') return b.netMargin - a.netMargin;
    if (sortBy === 'limit') return b.limit - a.limit;
    if (sortBy === 'price') return b.high - a.high;
    // Volume: OSRS API doesn't give a native daily volume on /latest, so we fallback to latest timeseries volume or rank them. For simplicity, we fallback to item limit or price.
    if (sortBy === 'volume') return b.limit - a.limit;
    return 0;
  });

  flippingResultsCount.textContent = `Showing ${filtered.length.toLocaleString()} items`;

  // Render rows
  if (filtered.length === 0) {
    flippingTbody.innerHTML = `<tr><td colspan="11" class="text-center text-muted">No items matched your filters.</td></tr>`;
    return;
  }

  let html = '';
  filtered.slice(0, 100).forEach(item => {
    const isWatched = watchlist.includes(item.id);
    const starClass = isWatched ? 'fa-solid fa-star active' : 'fa-regular fa-star';
    const rowClass = item.netMargin < 0 ? 'text-red' : '';
    const roiClass = item.roi > 5 ? 'text-green text-bold' : (item.roi < 0 ? 'text-red' : '');
    const limitFormatted = item.limit ? item.limit.toLocaleString() : '--';

    html += `
      <tr data-id="${item.id}" class="${rowClass}">
        <td class="col-star text-center">
          <button class="btn-star ${isWatched ? 'active' : ''}" onclick="event.stopPropagation(); toggleWatchlist(${item.id})">
            <i class="${starClass}"></i>
          </button>
        </td>
        <td>
          <div class="item-cell">
            <img class="item-icon" src="https://secure.runescape.com/m=itemdb_oldschool/obj_sprite.gif?id=${item.id}" alt="${item.name}" onerror="this.src='https://oldschool.runescape.wiki/images/6/6f/Grand_Exchange_icon.png'">
            <span>${item.name}</span>
            ${item.members ? '<span class="item-members-badge">M</span>' : ''}
          </div>
        </td>
        <td class="text-right">${limitFormatted}</td>
        <td class="text-right text-green">${item.low.toLocaleString()}</td>
        <td class="text-right text-gold">${item.high.toLocaleString()}</td>
        <td class="text-right">${item.rawMargin.toLocaleString()}</td>
        <td class="text-right text-red">${item.tax.toLocaleString()}</td>
        <td class="text-right text-green">${item.netMargin.toLocaleString()}</td>
        <td class="text-right ${roiClass}">${item.roi.toFixed(2)}%</td>
        <td class="text-right">${item.limit ? (item.limit * 8).toLocaleString() : '--'}</td>
        <td class="text-right text-green text-bold">${formatGP(item.potentialProfit)}</td>
      </tr>
    `;
  });

  flippingTbody.innerHTML = html;

  // Add click listeners to rows
  flippingTbody.querySelectorAll('tr').forEach(row => {
    row.addEventListener('click', () => {
      const id = parseInt(row.getAttribute('data-id'));
      openItemModal(id);
    });
  });
}

// Render Crafting Board
function renderCraftingBoard() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const maxPrice = getMaxPriceFromSlider(parseInt(priceRange.value));
  const minRoi = parseFloat(roiRange.value);
  const allowMembers = chkMembers.checked;
  const allowF2p = chkF2p.checked;

  let computedRecipes = [];

  RECIPES.forEach(recipe => {
    // 1. Search term filter
    if (searchTerm && !recipe.name.toLowerCase().includes(searchTerm)) {
      return;
    }

    const productPrice = pricesMap[recipe.product.id];
    const productMeta = itemsMap[recipe.product.id];
    
    // 2. Members/F2P filter
    if (productMeta) {
      if (productMeta.members && !allowMembers) return;
      if (!productMeta.members && !allowF2p) return;
    }

    // Check if we have prices for product and all ingredients
    let hasAllPrices = productPrice && productPrice.high !== undefined;
    let totalIngredientCost = 0;
    let ingredientHtml = '';

    recipe.ingredients.forEach(ing => {
      const ingPrice = pricesMap[ing.id];
      if (ingPrice && ingPrice.low !== undefined) {
        const cost = ingPrice.low * ing.qty;
        totalIngredientCost += cost;
        ingredientHtml += `
          <div class="ingredient-item">
            <img class="ing-icon" src="https://secure.runescape.com/m=itemdb_oldschool/obj_sprite.gif?id=${ing.id}" alt="${ing.name}" onerror="this.src='https://oldschool.runescape.wiki/images/6/6f/Grand_Exchange_icon.png'">
            <span class="ing-name">${ing.qty}x ${ing.name}</span>
            <span class="ing-price">(${ingPrice.low.toLocaleString()} GP)</span>
          </div>
        `;
      } else {
        hasAllPrices = false;
      }
    });

    if (hasAllPrices) {
      // 3. Price filter (based on ingredient cost)
      if (totalIngredientCost > maxPrice) {
        return;
      }

      const multiplier = recipe.product.multiplier || 1;
      const singleItemPrice = productPrice.high;
      
      // Pots are crafted as (3) dose, so revenue is 75% of (4) dose
      const craftedItemPrice = recipe.isThreeDosePotion ? singleItemPrice * 0.75 : singleItemPrice;
      const singleTax = Math.min(5000000, Math.floor(craftedItemPrice * 0.01));
      
      const totalSellPrice = craftedItemPrice * multiplier;
      const totalTax = singleTax * multiplier;
      const netProfit = totalSellPrice - totalTax - totalIngredientCost;
      
      // 4. strictly hide unprofitable methods (Net Profit <= 0)
      if (netProfit <= 0) {
        return; 
      }

      const limit = productMeta ? productMeta.limit || 0 : 0;
      const maxActions = limit > 0 ? Math.floor(limit / multiplier) : 0;
      const maxProfit = netProfit * maxActions;
      const roi = totalIngredientCost > 0 ? (netProfit / totalIngredientCost) * 100 : 0;

      // 5. ROI filter
      if (roi < minRoi) {
        return;
      }

      computedRecipes.push({
        recipe,
        ingredientHtml,
        totalIngredientCost,
        totalSellPrice,
        singleItemPrice,
        craftedItemPrice,
        totalTax,
        netProfit,
        roi,
        limit,
        maxActions,
        maxProfit,
        multiplier
      });
    }
  });

  // Sort computedRecipes
  computedRecipes.sort((a, b) => {
    let comparison = 0;
    if (craftingSortColumn === 'name') {
      comparison = a.recipe.name.localeCompare(b.recipe.name);
    } else if (craftingSortColumn === 'cost') {
      comparison = a.totalIngredientCost - b.totalIngredientCost;
    } else if (craftingSortColumn === 'price') {
      comparison = a.totalSellPrice - b.totalSellPrice;
    } else if (craftingSortColumn === 'tax') {
      comparison = a.totalTax - b.totalTax;
    } else if (craftingSortColumn === 'profit') {
      comparison = a.netProfit - b.netProfit;
    } else if (craftingSortColumn === 'roi') {
      comparison = a.roi - b.roi;
    } else if (craftingSortColumn === 'limit') {
      comparison = a.limit - b.limit;
    } else if (craftingSortColumn === 'pot') {
      comparison = a.maxProfit - b.maxProfit;
    }
    return craftingSortDir === 'desc' ? -comparison : comparison;
  });

  // Render headers to include icons
  updateHeadersUI('#crafting-table', craftingSortColumn, craftingSortDir);

  let html = '';
  computedRecipes.forEach(item => {
    const recipe = item.recipe;
    const profitClass = 'text-green';
    const roiClass = item.roi > 5 ? 'text-green text-bold' : '';

    const sellPriceDisplay = recipe.isThreeDosePotion
      ? `${item.singleItemPrice.toLocaleString()} GP (4-dose)<br><span style="font-size:0.65rem; color:var(--color-gold); font-weight:600;">Calc: ${Math.round(item.craftedItemPrice).toLocaleString()} GP (3-dose)</span>`
      : (item.multiplier > 1 
         ? `${item.totalSellPrice.toLocaleString()} GP<br><span style="font-size:0.7rem; color:var(--color-text-muted);">${item.singleItemPrice.toLocaleString()} GP x${item.multiplier}</span>`
         : `${item.totalSellPrice.toLocaleString()} GP`);

    const limitDisplay = item.limit > 0 
      ? `${item.limit.toLocaleString()}<br><span style="font-size:0.7rem; color:var(--color-text-muted);">${item.maxActions.toLocaleString()} acts</span>`
      : '--';

    const isWatched = watchlistRecipes.includes(recipe.name);
    const starClass = isWatched ? 'fa-solid fa-star active' : 'fa-regular fa-star';

    html += `
      <tr>
        <td class="col-star text-center">
          <button class="btn-star ${isWatched ? 'active' : ''}" onclick="event.stopPropagation(); toggleRecipeWatchlist('${recipe.name}')">
            <i class="${starClass}"></i>
          </button>
        </td>
        <td>
          <div class="item-cell">
            <img class="item-icon" src="https://secure.runescape.com/m=itemdb_oldschool/obj_sprite.gif?id=${recipe.product.id}" alt="${recipe.product.name}" onerror="this.src='https://oldschool.runescape.wiki/images/6/6f/Grand_Exchange_icon.png'">
            <div>
              <strong>${recipe.name}</strong>
              <div class="text-muted" style="font-size:0.75rem;">Makes: ${recipe.product.name}</div>
            </div>
          </div>
        </td>
        <td>
          <div class="ingredients-cell">
            ${item.ingredientHtml}
          </div>
        </td>
        <td class="text-right text-gold">${sellPriceDisplay}</td>
        <td class="text-right text-red">${item.totalTax.toLocaleString()} GP</td>
        <td class="text-right ${profitClass} text-bold">${item.netProfit.toLocaleString()} GP</td>
        <td class="text-right ${roiClass}">${item.roi.toFixed(2)}%</td>
        <td class="text-right">${limitDisplay}</td>
        <td class="text-right text-green text-bold">${formatGP(item.maxProfit)}</td>
      </tr>
    `;
  });

  if (html === '') {
    craftingTbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted">No profitable recipes matching your filters.</td></tr>`;
  } else {
    craftingTbody.innerHTML = html;
  }
}

// Watchlist operations
window.toggleWatchlist = function(id) {
  const index = watchlist.indexOf(id);
  if (index === -1) {
    watchlist.push(id);
  } else {
    watchlist.splice(index, 1);
  }
  saveWatchlist();
  triggerFilters();
};

function getRecipeProfit(recipe) {
  const productPrice = pricesMap[recipe.product.id];
  if (!productPrice || productPrice.high === undefined) return null;
  
  let totalIngredientCost = 0;
  let hasAllPrices = true;
  
  recipe.ingredients.forEach(ing => {
    const ingPrice = pricesMap[ing.id];
    if (ingPrice && ingPrice.low !== undefined) {
      totalIngredientCost += ingPrice.low * ing.qty;
    } else {
      hasAllPrices = false;
    }
  });
  
  if (!hasAllPrices) return null;
  
  const multiplier = recipe.product.multiplier || 1;
  const singleItemPrice = productPrice.high;
  
  const craftedItemPrice = recipe.isThreeDosePotion ? singleItemPrice * 0.75 : singleItemPrice;
  const singleTax = Math.min(5000000, Math.floor(craftedItemPrice * 0.01));
  const totalSellPrice = craftedItemPrice * multiplier;
  const totalTax = singleTax * multiplier;
  
  return totalSellPrice - totalTax - totalIngredientCost;
}

function updateWatchlistUI() {
  // Render recipes watchlist
  watchlistRecipesCount.textContent = watchlistRecipes.length;
  if (watchlistRecipes.length === 0) {
    watchlistRecipesContainer.innerHTML = `
      <div class="empty-state">
        <i class="fa-regular fa-bookmark"></i>
        <p>No watched skilling methods.<br>Click stars to add recipes.</p>
      </div>
    `;
  } else {
    let rHtml = '';
    watchlistRecipes.forEach(name => {
      const recipe = RECIPES.find(r => r.name === name);
      if (recipe) {
        const profit = getRecipeProfit(recipe);
        const profitClass = profit !== null ? (profit > 0 ? 'text-green' : (profit < 0 ? 'text-red' : 'text-muted')) : 'text-muted';
        const profitDisplay = profit !== null ? (profit > 0 ? '+' : '') + profit.toLocaleString() + ' GP' : 'No price data';
        
        rHtml += `
          <div class="watchlist-item" onclick="switchTab('crafting');">
            <div class="watchlist-item-left">
              <img class="watchlist-item-icon" src="https://secure.runescape.com/m=itemdb_oldschool/obj_sprite.gif?id=${recipe.product.id}" alt="" onerror="this.src='https://oldschool.runescape.wiki/images/6/6f/Grand_Exchange_icon.png'">
              <span class="watchlist-item-name" title="${recipe.name}">${recipe.name}</span>
            </div>
            <div class="watchlist-item-right">
              <span class="watchlist-profit ${profitClass}">${profitDisplay}</span>
            </div>
          </div>
        `;
      }
    });
    watchlistRecipesContainer.innerHTML = rHtml;
  }

  // Render items/PK watchlist
  watchlistCount.textContent = watchlist.length;
  if (watchlist.length === 0) {
    watchlistContainer.innerHTML = `
      <div class="empty-state">
        <i class="fa-regular fa-bookmark"></i>
        <p>No watched PK items.<br>Click stars to add items.</p>
      </div>
    `;
  } else {
    let html = '';
    watchlist.forEach(id => {
      const itemMeta = itemsMap[id];
      const trend = pkTrendsMap[id];
      const price = pricesMap[id];
      if (itemMeta) {
        let displayProfit = '';
        let profitClass = 'text-muted';
        let displayPrice = '--';
        
        if (trend) {
          displayPrice = trend.weekdayLow.toLocaleString();
          displayProfit = (trend.netProfit > 0 ? '+' : '') + trend.netProfit.toLocaleString() + ' GP';
          profitClass = trend.netProfit > 0 ? 'text-green' : (trend.netProfit < 0 ? 'text-red' : 'text-muted');
        } else if (price) {
          const high = price.high || 0;
          const low = price.low || 0;
          const tax = Math.min(5000000, Math.floor(high * 0.01));
          const profit = high - tax - low;
          displayPrice = high.toLocaleString();
          displayProfit = (profit > 0 ? '+' : '') + profit.toLocaleString() + ' GP';
          profitClass = profit > 0 ? 'text-green' : (profit < 0 ? 'text-red' : 'text-muted');
        }
        
        html += `
          <div class="watchlist-item" onclick="openItemModal(${id})">
            <div class="watchlist-item-left">
              <img class="watchlist-item-icon" src="https://secure.runescape.com/m=itemdb_oldschool/obj_sprite.gif?id=${id}" alt="" onerror="this.src='https://oldschool.runescape.wiki/images/6/6f/Grand_Exchange_icon.png'">
              <span class="watchlist-item-name" title="${itemMeta.name}">${itemMeta.name}</span>
            </div>
            <div class="watchlist-item-right">
              <span class="watchlist-price">${displayPrice}</span>
              <span class="watchlist-profit ${profitClass}">${displayProfit}</span>
            </div>
          </div>
        `;
      }
    });
    watchlistContainer.innerHTML = html;
  }
}

// Modal handling
function openItemModal(id) {
  const item = itemsList.find(i => i.id === id);
  if (!item) return;

  activeItem = item;
  
  // Fill text/data fields
  modalItemIcon.src = `https://secure.runescape.com/m=itemdb_oldschool/obj_sprite.gif?id=${id}`;
  modalItemName.textContent = item.name;
  modalItemExamine.textContent = item.examine || 'No description available.';
  modalLimit.textContent = item.limit ? item.limit.toLocaleString() : 'No Limit';
  modalLow.textContent = formatRawGP(item.low);
  modalHigh.textContent = formatRawGP(item.high);
  
  const profitFormatted = item.netMargin.toLocaleString() + ' GP';
  modalNet.textContent = profitFormatted;
  modalNet.className = `m-value ${item.netMargin > 0 ? 'text-green' : (item.netMargin < 0 ? 'text-red' : 'text-muted')}`;

  updateModalWatchlistButton();

  // Reset calculator budget/quantity
  calcBudget.value = 10000000; // 10M default
  updateCalculator();

  // Show modal
  itemModal.classList.add('active');

  // Activate 5m chart tab by default
  document.querySelectorAll('.chart-tab-btn').forEach(btn => {
    if (btn.getAttribute('data-timestep') === '5m') {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Load chart
  loadChartData(id, '5m');
}

function updateModalWatchlistButton() {
  if (!activeItem) return;
  const isWatched = watchlist.includes(activeItem.id);
  if (isWatched) {
    modalBtnWatchlist.classList.add('active');
    modalBtnWatchlist.innerHTML = '<i class="fa-solid fa-star text-gold"></i> Watching';
  } else {
    modalBtnWatchlist.classList.remove('active');
    modalBtnWatchlist.innerHTML = '<i class="fa-regular fa-star"></i> Watch';
  }
}

function closeModal() {
  itemModal.classList.remove('active');
  activeItem = null;
  if (priceChartInstance) {
    priceChartInstance.destroy();
    priceChartInstance = null;
  }
}

// Live Profit Calculator Updates
function updateCalculator() {
  if (!activeItem) return;
  const budget = parseFloat(calcBudget.value) || 0;
  
  // Calculate quantity based on low (buy) price
  let qty = 0;
  if (activeItem.low > 0) {
    qty = Math.floor(budget / activeItem.low);
  }

  // Cap quantity by the item limit
  if (activeItem.limit && qty > activeItem.limit) {
    qty = activeItem.limit;
  }

  calcQuantity.value = qty;
  runCalcFormulas(qty);
}

function updateCalculatorByQty() {
  if (!activeItem) return;
  let qty = parseInt(calcQuantity.value) || 0;

  // Cap quantity by the item limit
  if (activeItem.limit && qty > activeItem.limit) {
    qty = activeItem.limit;
    calcQuantity.value = qty;
  }

  runCalcFormulas(qty);
}

function runCalcFormulas(qty) {
  const totalSpent = qty * activeItem.low;
  
  // Revenue calculation after tax
  const taxPerItem = Math.min(5000000, Math.floor(activeItem.high * 0.01));
  const netRevenuePerItem = activeItem.high - taxPerItem;
  const totalRevenue = qty * netRevenuePerItem;
  
  const profit = totalRevenue - totalSpent;

  calcTotalSpent.textContent = formatRawGP(totalSpent);
  calcTotalRev.textContent = formatRawGP(totalRevenue);
  
  calcNetProfit.textContent = formatRawGP(profit);
  calcNetProfit.className = `calc-res-val text-bold ${profit > 0 ? 'text-green' : (profit < 0 ? 'text-red' : 'text-muted')}`;
}

// Chart.js Historical Price Render
async function loadChartData(itemId, timestep) {
  chartLoading.classList.remove('hide');
  try {
    const response = await fetch(`/api/timeseries?id=${itemId}&timestep=${timestep}`);
    const result = await response.json();
    
    if (result && result.data && result.data.length > 0) {
      renderChart(result.data, timestep);
    } else {
      console.warn('No historical timeseries data returned for item', itemId);
      renderChartPlaceholder('No historical data available for this item');
    }
  } catch (error) {
    console.error('Error fetching chart data:', error);
    renderChartPlaceholder('Failed to fetch historical chart data');
  } finally {
    chartLoading.classList.add('hide');
  }
}

function renderChartPlaceholder(message) {
  if (priceChartInstance) {
    priceChartInstance.destroy();
  }
  const ctx = document.getElementById('priceChart').getContext('2d');
  
  priceChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: [message],
      datasets: []
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { display: false },
        y: { display: false }
      }
    }
  });
}

function renderChart(data, timestep) {
  if (priceChartInstance) {
    priceChartInstance.destroy();
  }

  // Format timestamps nicely depending on scale
  const labels = data.map(pt => {
    const d = new Date(pt.timestamp * 1000);
    if (timestep === '5m' || timestep === '1h') {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  });

  const highPrices = data.map(pt => pt.avgHighPrice);
  const lowPrices = data.map(pt => pt.avgLowPrice);

  const ctx = document.getElementById('priceChart').getContext('2d');

  priceChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Ask Price (High)',
          data: highPrices,
          borderColor: '#e5c158',
          backgroundColor: 'rgba(229, 193, 88, 0.1)',
          tension: 0.1,
          borderWidth: 2,
          pointRadius: 1,
          spanGaps: true
        },
        {
          label: 'Bid Price (Low)',
          data: lowPrices,
          borderColor: '#4ade80',
          backgroundColor: 'rgba(74, 222, 128, 0.1)',
          tension: 0.1,
          borderWidth: 2,
          pointRadius: 1,
          spanGaps: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#94a3b8',
            font: { family: 'Inter', size: 10 }
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              return context.dataset.label + ': ' + context.raw.toLocaleString() + ' GP';
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.03)' },
          ticks: { color: '#94a3b8', font: { family: 'Inter', size: 9 }, maxTicksLimit: 12 }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.03)' },
          ticks: {
            color: '#94a3b8',
            font: { family: 'Inter', size: 9 },
            callback: function(value) {
              return value.toLocaleString() + ' GP';
            }
          }
        }
      }
    }
  });
}

// Start application
init();
