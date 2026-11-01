/* ==========================================================================
   ACCOUNTANT DASHBOARD FRONTEND APP LOGIC
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Global State
  let state = {
    stats: {},
    transactions: [],
    promotions: [],
    statements: [],
    activeView: 'overview',
    searchQuery: ''
  };

  // Init App
  initNavigation();
  initModals();
  initForms();
  initSearchAndFilters();
  initEventListeners();
  loadAllData();

  // ================= DATA FETCHING ================= //
  async function loadAllData() {
    try {
      const [statsRes, txRes, promoRes, stmtRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/transactions'),
        fetch('/api/promotions'),
        fetch('/api/statements')
      ]);

      state.stats = await statsRes.json();
      state.transactions = await txRes.json();
      state.promotions = await promoRes.json();
      state.statements = await stmtRes.json();

      renderHeaderStats();
      renderCurrentView();
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  }

  // ================= HEADER & STATS RENDER ================= //
  function renderHeaderStats() {
    const totalSpent = state.transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    document.getElementById('stat-total-spent').innerText = `$${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    // Count active 0% APR expiring promos within 90 days or active balance
    const now = new Date();
    const expiringPromos = state.promotions.filter(p => {
      if (!p.isInterestFree || p.currentBalance <= 0) return false;
      const days = Math.ceil((new Date(p.endDate) - now) / (1000 * 60 * 60 * 24));
      return days <= 90;
    });

    const expCountEl = document.getElementById('stat-expiring-count');
    expCountEl.innerText = `${expiringPromos.length} Alert(s)`;

    if (expiringPromos.length > 0) {
      document.getElementById('header-warning-bubble').classList.add('warning-glow');
      document.getElementById('sidebar-alert-text').innerText = `⚠️ ${expiringPromos.length} balance(s) subject to interest accrual if unpaid before expiration!`;
      document.getElementById('executive-warning-banner').classList.remove('hidden');
      document.getElementById('exec-banner-title').innerText = `CRITICAL ALERT: ${expiringPromos.length} Interest-Free (0% APR) Expiration Warning(s)`;
    } else {
      document.getElementById('header-warning-bubble').classList.remove('warning-glow');
      document.getElementById('sidebar-alert-text').innerText = `All interest-free deadlines are clear. No accrued interest warnings.`;
      document.getElementById('executive-warning-banner').classList.add('hidden');
    }

    document.getElementById('stat-active-promos').innerText = state.promotions.length;
    document.getElementById('stat-archived-statements').innerText = state.statements.length;
    document.getElementById('record-count-badge').innerText = `${state.transactions.length} Tx | ${state.promotions.length} Promos | ${state.statements.length} Stmts`;

    // Render Spending Chart
    if (state.stats.categoryHabits && typeof renderSpendingHabitsChart === 'function') {
      renderSpendingHabitsChart(state.stats.categoryHabits);
    }
  }

  // ================= NAVIGATION ================= //
  function initNavigation() {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');

        const view = item.getAttribute('data-view');
        switchView(view);
      });
    });

    document.getElementById('logo-home').addEventListener('click', () => switchView('overview'));
    document.getElementById('btn-goto-tx')?.addEventListener('click', () => switchView('transactions'));
    document.getElementById('btn-view-apr-radar')?.addEventListener('click', () => switchView('apr-radar'));
    document.getElementById('btn-exec-banner-action')?.addEventListener('click', () => switchView('apr-radar'));
  }

  function switchView(viewName) {
    state.activeView = viewName;
    document.querySelectorAll('.dashboard-view').forEach(v => v.classList.remove('active'));
    
    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) targetView.classList.add('active');

    // Sync active nav item
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(n => {
      if (n.getAttribute('data-view') === viewName) n.classList.add('active');
      else n.classList.remove('active');
    });

    renderCurrentView();
  }

  // ================= VIEW RENDERERS ================= //
  function renderCurrentView() {
    const query = state.searchQuery.toLowerCase();

    if (state.activeView === 'overview') {
      renderOverviewSection(query);
    } else if (state.activeView === 'transactions') {
      renderTransactionsTable(query);
    } else if (state.activeView === 'statements') {
      renderStatementsCards(query);
    } else if (state.activeView === 'promotions') {
      renderPromotionsCards(query);
    } else if (state.activeView === 'apr-radar') {
      renderAprRadarView();
    }
  }

  // 1. Executive Overview Render
  function renderOverviewSection(query) {
    // Quick Promos List
    const promoContainer = document.getElementById('overview-promos-list');
    promoContainer.innerHTML = '';
    state.promotions.slice(0, 3).forEach(p => {
      const is0Apr = p.isInterestFree;
      const progressPct = p.minSpendRequired > 0 ? Math.min(100, Math.round((p.currentSpend / p.minSpendRequired) * 100)) : 100;
      
      const item = document.createElement('div');
      item.className = 'promo-quick-item';
      item.style.marginBottom = '1rem';
      item.innerHTML = `
        <div style="display:flex; justify-between; align-items:center; margin-bottom: 4px;">
          <strong style="color:var(--text-primary); font-size:0.9rem;">${p.title}</strong>
          <span class="card-badge ${is0Apr ? 'badge-amber' : 'badge-green'}">${is0Apr ? '0% APR' : 'Bonus'}</span>
        </div>
        <div style="font-size:0.75rem; color:var(--text-secondary); margin-bottom: 4px;">${p.institution} • Offer: <span class="text-cyan">${p.bonusValue}</span></div>
        ${p.minSpendRequired > 0 ? `
          <div class="progress-bar-container">
            <div class="progress-info">
              <span>Spend Progress: $${p.currentSpend.toLocaleString()} / $${p.minSpendRequired.toLocaleString()}</span>
              <span>${progressPct}%</span>
            </div>
            <div class="progress-track"><div class="progress-fill" style="width:${progressPct}%"></div></div>
          </div>
        ` : ''}
      `;
      promoContainer.appendChild(item);
    });

    // Overview Recent Transactions
    const tbody = document.getElementById('table-overview-tx');
    tbody.innerHTML = '';
    const filteredTx = state.transactions.filter(t => 
      t.merchant.toLowerCase().includes(query) || 
      t.category.toLowerCase().includes(query) ||
      t.indexedTag.toLowerCase().includes(query)
    ).slice(0, 5);

    filteredTx.forEach(t => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${t.date}</td>
        <td><strong>${t.merchant}</strong></td>
        <td>${t.category}</td>
        <td>${t.account}</td>
        <td><span class="index-tag">${t.indexedTag}</span></td>
        <td class="amount-text text-cyan">$${Number(t.amount).toFixed(2)}</td>
        <td>${t.receiptAttached ? '<i class="fa-solid fa-paperclip text-green" title="Receipt Attached"></i>' : '<span style="color:var(--text-muted)">-</span>'}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // 2. Full Transactions Table Render
  function renderTransactionsTable(query) {
    const catFilter = document.getElementById('filter-category').value;
    const tagFilter = document.getElementById('filter-tag').value;
    const tbody = document.getElementById('table-full-tx');
    tbody.innerHTML = '';

    const filtered = state.transactions.filter(t => {
      const matchesSearch = t.merchant.toLowerCase().includes(query) || 
                            t.category.toLowerCase().includes(query) ||
                            t.indexedTag.toLowerCase().includes(query) ||
                            (t.notes && t.notes.toLowerCase().includes(query));
      const matchesCat = (catFilter === 'ALL' || t.category === catFilter);
      const matchesTag = (tagFilter === 'ALL' || t.indexedTag === tagFilter);
      return matchesSearch && matchesCat && matchesTag;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2rem; color:var(--text-muted);">No matching transaction records found.</td></tr>`;
      return;
    }

    filtered.forEach(t => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${t.date}</td>
        <td><strong>${t.merchant}</strong></td>
        <td>${t.category}</td>
        <td>${t.account}</td>
        <td><span class="index-tag">${t.indexedTag}</span></td>
        <td style="color:var(--text-secondary); max-width:200px;">${t.notes || '-'}</td>
        <td class="amount-text text-cyan">$${Number(t.amount).toFixed(2)}</td>
        <td>
          <button class="btn btn-sm btn-danger btn-delete-tx" data-id="${t.id}" title="Delete Record">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Attach delete listeners
    document.querySelectorAll('.btn-delete-tx').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = btn.getAttribute('data-id');
        if (confirm('Are you sure you want to delete this transaction record?')) {
          await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
          loadAllData();
        }
      });
    });
  }

  // 3. Statement Archive Cards Render
  function renderStatementsCards(query) {
    const container = document.getElementById('statements-cards-container');
    container.innerHTML = '';

    const filtered = state.statements.filter(s => 
      s.institution.toLowerCase().includes(query) ||
      s.accountName.toLowerCase().includes(query) ||
      s.period.toLowerCase().includes(query)
    );

    if (filtered.length === 0) {
      container.innerHTML = `<p style="color:var(--text-muted); grid-column: 1/-1;">No archived statements found.</p>`;
      return;
    }

    filtered.forEach(s => {
      const card = document.createElement('div');
      card.className = 'statement-card';
      card.innerHTML = `
        <div class="card-badge badge-purple"><i class="fa-solid fa-file-pdf"></i> Archived</div>
        <h4 style="font-family:var(--font-heading); font-size:1.1rem; color:#fff; margin-bottom:4px;">${s.institution}</h4>
        <div style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:1rem;">${s.accountName}</div>
        
        <div style="background:rgba(0,0,0,0.2); padding:0.75rem; border-radius:6px; margin-bottom:1rem;">
          <div style="font-size:0.75rem; color:var(--text-muted);">Period: ${s.period}</div>
          <div style="font-family:var(--font-code); font-size:1.2rem; color:var(--accent-cyan); font-weight:600; margin-top:4px;">
            $${Number(s.totalBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          ${s.dueDate ? `<div style="font-size:0.75rem; color:var(--accent-amber); margin-top:2px;">Payment Due: ${s.dueDate} (Min: $${s.minimumDue})</div>` : ''}
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; color:var(--text-secondary);">
          <span><i class="fa-solid fa-paperclip"></i> File: ${s.fileName}</span>
          <span><i class="fa-solid fa-tags text-cyan"></i> ${s.indexedChargesCount} Indexed</span>
        </div>

        <div style="margin-top:1rem; display:flex; justify-content:flex-end; gap:0.5rem;">
          <a href="/uploads/${s.fileName}" target="_blank" class="btn btn-sm btn-outline"><i class="fa-solid fa-eye"></i> View PDF</a>
          <button class="btn btn-sm btn-danger btn-delete-stmt" data-id="${s.id}"><i class="fa-solid fa-trash"></i></button>
        </div>
      `;
      container.appendChild(card);
    });

    document.querySelectorAll('.btn-delete-stmt').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (confirm('Delete this statement archive record?')) {
          await fetch(`/api/statements/${id}`, { method: 'DELETE' });
          loadAllData();
        }
      });
    });
  }

  // 4. Promotions Cards Render
  function renderPromotionsCards(query) {
    const container = document.getElementById('promos-full-container');
    container.innerHTML = '';

    const filtered = state.promotions.filter(p =>
      p.title.toLowerCase().includes(query) ||
      p.institution.toLowerCase().includes(query) ||
      p.bonusValue.toLowerCase().includes(query)
    );

    if (filtered.length === 0) {
      container.innerHTML = `<p style="color:var(--text-muted); grid-column:1/-1;">No promotions found.</p>`;
      return;
    }

    filtered.forEach(p => {
      const is0Apr = p.isInterestFree;
      const progressPct = p.minSpendRequired > 0 ? Math.min(100, Math.round((p.currentSpend / p.minSpendRequired) * 100)) : 100;
      
      const card = document.createElement('div');
      card.className = 'promo-card';
      card.innerHTML = `
        <span class="card-badge ${is0Apr ? 'badge-amber' : 'badge-green'}">${is0Apr ? '0% APR Promo' : 'Signup Bonus'}</span>
        <div class="promo-title">${p.title}</div>
        <div class="promo-institution">${p.institution} • Start: ${p.startDate} ${p.endDate ? `| Expires: ${p.endDate}` : ''}</div>
        
        <div style="background:rgba(0,0,0,0.2); padding:0.75rem; border-radius:6px; margin-bottom:1rem;">
          <div style="font-size:0.8rem; color:var(--text-secondary);">Bonus / Offer Value:</div>
          <div style="font-family:var(--font-heading); font-size:1.1rem; color:var(--accent-green); font-weight:700;">${p.bonusValue}</div>
          ${is0Apr ? `<div style="font-family:var(--font-code); font-size:0.9rem; color:var(--accent-amber); margin-top:4px;">Current Balance: $${Number(p.currentBalance).toLocaleString()}</div>` : ''}
        </div>

        ${p.minSpendRequired > 0 ? `
          <div class="progress-bar-container">
            <div class="progress-info">
              <span>Minimum Spend Tracker</span>
              <span>$${p.currentSpend} / $${p.minSpendRequired} (${progressPct}%)</span>
            </div>
            <div class="progress-track"><div class="progress-fill" style="width:${progressPct}%"></div></div>
          </div>
        ` : ''}

        <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.5rem;">${p.notes || ''}</p>

        <div style="margin-top:1rem; display:flex; justify-content:space-between; align-items:center;">
          <span class="badge ${p.status.includes('Completed') ? 'badge-green' : 'badge-cyan'}">${p.status}</span>
          <button class="btn btn-sm btn-danger btn-delete-promo" data-id="${p.id}"><i class="fa-solid fa-trash"></i></button>
        </div>
      `;
      container.appendChild(card);
    });

    document.querySelectorAll('.btn-delete-promo').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (confirm('Delete this promotion tracker record?')) {
          await fetch(`/api/promotions/${id}`, { method: 'DELETE' });
          loadAllData();
        }
      });
    });
  }

  // 5. 0% APR Expiration Radar Detailed Render
  function renderAprRadarView() {
    const container = document.getElementById('apr-radar-container');
    container.innerHTML = '';

    const aprPromos = state.promotions.filter(p => p.isInterestFree);

    if (aprPromos.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:3rem;">
          <i class="fa-solid fa-shield-check text-green" style="font-size:3rem; margin-bottom:1rem;"></i>
          <h3>No Active 0% APR Balances</h3>
          <p style="color:var(--text-secondary);">You have no registered interest-free promotional balances requiring payoff warnings.</p>
        </div>
      `;
      return;
    }

    const now = new Date();

    aprPromos.forEach(p => {
      const endDate = new Date(p.endDate);
      const diffDays = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
      const monthsRemaining = Math.max(1, Math.ceil(diffDays / 30));
      const requiredMonthlyPayoff = (p.currentBalance / monthsRemaining).toFixed(2);
      const isCritical = diffDays <= 45 && p.currentBalance > 0;

      const card = document.createElement('div');
      card.className = `apr-card ${isCritical ? 'critical' : ''}`;
      card.innerHTML = `
        <div>
          <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.4rem;">
            <h4 style="font-family:var(--font-heading); font-size:1.15rem; color:#fff;">${p.title}</h4>
            <span class="card-badge ${isCritical ? 'badge-amber' : 'badge-cyan'}">${isCritical ? 'CRITICAL DEADLINE' : 'ACTIVE 0% APR'}</span>
          </div>
          <div style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:0.75rem;">
            ${p.institution} • Expiration Date: <strong style="color:#fff;">${p.endDate}</strong>
          </div>
          <div style="font-size:0.8rem; color:var(--text-muted); background:rgba(0,0,0,0.3); padding:0.5rem 0.75rem; border-radius:6px; border-left:3px solid var(--accent-amber);">
            <i class="fa-solid fa-circle-info text-amber"></i> ${p.notes || 'Pay balance before deadline to avoid retroactive interest.'}
          </div>
        </div>

        <div class="apr-days-box">
          <div class="apr-days-number ${diffDays <= 45 ? 'text-red' : 'text-amber'}">${diffDays}</div>
          <div class="apr-days-label">Days Until Interest Accrues</div>
        </div>

        <div style="background:rgba(0,0,0,0.3); padding:1rem; border-radius:10px; border:1px solid var(--border-color); text-align:center;">
          <div style="font-size:0.75rem; color:var(--text-secondary);">Current Promo Balance</div>
          <div style="font-family:var(--font-code); font-size:1.1rem; color:var(--accent-cyan); font-weight:700;">$${Number(p.currentBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          
          <div style="margin-top:0.75rem; border-top:1px solid var(--border-color); padding-top:0.5rem;">
            <div style="font-size:0.7rem; color:var(--accent-amber); font-weight:600;">TARGET MONTHLY PAYOFF</div>
            <div style="font-family:var(--font-code); font-size:1.25rem; color:var(--accent-green); font-weight:700;">$${Number(requiredMonthlyPayoff).toLocaleString('en-US', { minimumFractionDigits: 2 })} / mo</div>
            <div style="font-size:0.68rem; color:var(--text-muted);">${monthsRemaining} month(s) remaining</div>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  // ================= MODALS & FORMS ================= //
  function initModals() {
    // Add Menu Dropdown toggle
    const addBtn = document.getElementById('btn-add-menu');
    const addMenu = document.getElementById('add-record-menu');

    addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      addMenu.classList.toggle('show');
    });

    document.addEventListener('click', () => addMenu.classList.remove('show'));

    // Open Modal buttons
    document.querySelectorAll('[data-modal], .btn-modal-open').forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        const modalId = trigger.getAttribute('data-modal');
        const targetModal = document.getElementById(modalId);
        if (targetModal) {
          targetModal.classList.add('show');
          addMenu.classList.remove('show');
        }
      });
    });

    // Close Modal buttons
    document.querySelectorAll('.btn-close-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('show'));
      });
    });
  }

  function initForms() {
    // Form 1: Transaction
    document.getElementById('form-add-tx').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        date: document.getElementById('tx-date').value,
        amount: parseFloat(document.getElementById('tx-amount').value),
        merchant: document.getElementById('tx-merchant').value,
        category: document.getElementById('tx-category').value,
        account: document.getElementById('tx-account').value,
        indexedTag: document.getElementById('tx-tag').value || 'General',
        receiptAttached: document.getElementById('tx-receipt').checked,
        notes: document.getElementById('tx-notes').value
      };

      await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      document.getElementById('modal-tx').classList.remove('show');
      document.getElementById('form-add-tx').reset();
      loadAllData();
    });

    // Form 2: Promotion
    document.getElementById('form-add-promo').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        title: document.getElementById('promo-title').value,
        institution: document.getElementById('promo-institution').value,
        type: document.getElementById('promo-type').value,
        bonusValue: document.getElementById('promo-bonus-value').value,
        currentBalance: parseFloat(document.getElementById('promo-balance').value) || 0,
        startDate: document.getElementById('promo-start-date').value,
        endDate: document.getElementById('promo-end-date').value,
        minSpendRequired: parseFloat(document.getElementById('promo-min-spend').value) || 0,
        currentSpend: parseFloat(document.getElementById('promo-current-spend').value) || 0,
        isInterestFree: document.getElementById('promo-is-0apr').checked,
        status: document.getElementById('promo-status').value,
        notes: document.getElementById('promo-notes').value
      };

      await fetch('/api/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      document.getElementById('modal-promo').classList.remove('show');
      document.getElementById('form-add-promo').reset();
      loadAllData();
    });

    // Form 3: Statement
    document.getElementById('form-add-stmt').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData();
      formData.append('institution', document.getElementById('stmt-institution').value);
      formData.append('accountName', document.getElementById('stmt-account').value);
      formData.append('period', document.getElementById('stmt-period').value);
      formData.append('totalBalance', document.getElementById('stmt-balance').value);
      formData.append('minimumDue', document.getElementById('stmt-mindue').value);
      formData.append('dueDate', document.getElementById('stmt-duedate').value);
      formData.append('notes', document.getElementById('stmt-notes').value);

      const fileInput = document.getElementById('stmt-file');
      if (fileInput.files[0]) {
        formData.append('statementFile', fileInput.files[0]);
      }

      await fetch('/api/statements', {
        method: 'POST',
        body: formData
      });

      document.getElementById('modal-stmt').classList.remove('show');
      document.getElementById('form-add-stmt').reset();
      loadAllData();
    });
  }

  // ================= SEARCH & FILTERS ================= //
  function initSearchAndFilters() {
    const searchInput = document.getElementById('global-search');
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderCurrentView();
    });

    document.getElementById('filter-category')?.addEventListener('change', () => renderCurrentView());
    document.getElementById('filter-tag')?.addEventListener('change', () => renderCurrentView());
  }

  function initEventListeners() {
    document.getElementById('btn-refresh').addEventListener('click', () => loadAllData());
  }
});
