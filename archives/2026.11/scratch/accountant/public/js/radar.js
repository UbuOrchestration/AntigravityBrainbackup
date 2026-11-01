/* ==========================================================================
   OFFER RADAR (bank offers) & CREDIT OPPORTUNITIES (card promos)
   Self-contained module; relies on app.js for view switching (view-<name>).
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  const STALE_DAYS = 14;
  const state = { offers: [], credit: [] };

  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => '$' + Number(n || 0).toLocaleString('en-US');
  const daysSince = (d) => d ? Math.floor((Date.now() - new Date(d)) / 86400000) : null;
  const daysUntil = (d) => d ? Math.ceil((new Date(d) - Date.now()) / 86400000) : null;
  const safeUrl = (u) => /^https?:\/\//i.test(u || '') ? u : '';

  async function api(path, method = 'GET', body) {
    const res = await fetch(path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    return res.json();
  }

  async function load() {
    [state.offers, state.credit] = await Promise.all([api('/api/offers'), api('/api/credit-opps')]);
    renderOffers();
    renderCredit();
  }

  // ---------- shared pieces ----------
  function statusSelect(item, kind, options) {
    return `<select class="status-select" data-kind="${kind}" data-id="${esc(item.id)}">` +
      options.map(o => `<option ${o === item.status ? 'selected' : ''}>${o}</option>`).join('') + '</select>';
  }

  function verifyBadge(item) {
    const age = daysSince(item.lastChecked);
    if (age === null) return '<span class="badge badge-amber">Never verified</span>';
    const stale = age > STALE_DAYS;
    return `<span class="badge ${stale ? 'badge-amber' : 'badge-green'}" title="Offers change often. Re-check the issuer page.">${stale ? 'Stale: ' : 'Verified '}${age}d ago</span>`;
  }

  function expiryBadge(item) {
    if (!item.expires) return '<span class="badge badge-cyan">No end date listed</span>';
    const d = daysUntil(item.expires);
    if (d < 0) return '<span class="badge badge-amber">Expired</span>';
    return `<span class="badge ${d <= 14 ? 'badge-amber' : 'badge-green'}">Ends in ${d}d (${esc(item.expires)})</span>`;
  }

  function actions(item, kind) {
    const url = safeUrl(item.sourceUrl);
    return `<div style="margin-top:1rem; display:flex; justify-content:space-between; align-items:center; gap:.5rem; flex-wrap:wrap;">
      <div style="display:flex; gap:.4rem;">
        ${url ? `<a class="btn btn-sm btn-outline" href="${esc(url)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-arrow-up-right-from-square"></i> Verify</a>` : ''}
        <button class="btn btn-sm btn-outline btn-mark-checked" data-kind="${kind}" data-id="${esc(item.id)}" title="Mark as re-verified today"><i class="fa-solid fa-check"></i></button>
        <button class="btn btn-sm btn-danger btn-del" data-kind="${kind}" data-id="${esc(item.id)}"><i class="fa-solid fa-trash"></i></button>
      </div></div>`;
  }

  // ---------- Offer Radar ----------
  function renderOffers() {
    const status = $('offers-filter-status').value;
    const fl = $('offers-filter-fl').value;
    const sort = $('offers-sort').value;
    const noDd = $('offers-no-dd').checked;
    const q = (document.getElementById('global-search')?.value || '').toLowerCase();
    const flOf = (o) => o.florida || 'Verify';
    const flMatch = (o) => fl === 'ALL' || (fl === 'OK' && ['Yes', 'Verify'].includes(flOf(o))) ||
      (fl === 'Excluded' && ['No', 'Restricted'].includes(flOf(o))) || flOf(o) === fl;

    let list = state.offers.filter(o =>
      flMatch(o) &&
      (status === 'ALL' || o.status === status) &&
      (!noDd || !o.directDepositRequired) &&
      (!q || `${o.institution} ${o.product} ${o.requirement}`.toLowerCase().includes(q)));

    list.sort((a, b) => {
      if (sort === 'expires') return (a.expires || '9999') < (b.expires || '9999') ? -1 : 1;
      if (sort === 'checked') return (a.lastChecked || '') < (b.lastChecked || '') ? -1 : 1;
      return (b.bonusAmount || 0) - (a.bonusAmount || 0);
    });

    const cnt = (f) => state.offers.filter(o => (o.florida || 'Verify') === f).length;
    const stale = state.offers.filter(o => (daysSince(o.lastChecked) ?? 999) > STALE_DAYS).length;
    $('offers-summary').innerHTML = summaryHtml([
      ['Florida: confirmed yes', cnt('Yes')], ['Florida: verify', cnt('Verify')],
      ['Excluded (no / restricted)', cnt('No') + cnt('Restricted')], ['Needs re-verify', stale]]);

    const flBadge = (o) => {
      const f = o.florida || 'Verify';
      const cls = { Yes: 'badge-green', Verify: 'badge-amber', No: 'badge-purple', Restricted: 'badge-purple' }[f] || 'badge-amber';
      const label = { Yes: 'Florida OK', Verify: 'Florida: verify', No: 'Not in Florida', Restricted: 'Restricted membership' }[f] || f;
      return `<span class="badge ${cls}">${label}</span>`;
    };

    $('offers-container').innerHTML = list.length ? list.map(o => `
      <div class="promo-card">
        <span class="card-badge badge-cyan">${esc(o.category || 'Bank')}</span>
        <div class="promo-title">${esc(o.institution)}: ${esc(o.product)}</div>
        <div class="promo-institution">${esc(o.timeframe || '')}${o.monthlyFee ? ' • Fee: ' + esc(o.monthlyFee) : ''}</div>
        <div style="background:rgba(0,0,0,0.2); padding:.75rem; border-radius:6px; margin-bottom:.75rem;">
          <div style="font-family:var(--font-heading); font-size:1.2rem; color:var(--accent-green); font-weight:700;">${esc(o.bonusLabel || money(o.bonusAmount))}</div>
          <div style="font-size:.8rem; color:var(--text-secondary); margin-top:4px;">${esc(o.requirement)}</div>
          ${o.directDepositRequired ? '<div style="font-size:.72rem; color:var(--accent-amber); margin-top:4px;"><i class="fa-solid fa-money-bill-transfer"></i> Direct deposit required</div>' : ''}
        </div>
        ${o.restrictions ? `<div style="font-size:.75rem; color:var(--text-secondary); border-left:3px solid var(--accent-amber); padding-left:.5rem; margin-bottom:.5rem;"><strong>Fine print:</strong> ${esc(o.restrictions)}</div>` : ''}
        <div style="display:flex; gap:.4rem; flex-wrap:wrap; margin-bottom:.5rem;">${flBadge(o)} ${expiryBadge(o)} ${verifyBadge(o)}</div>
        ${o.notes ? `<p style="font-size:.75rem; color:var(--text-muted);">${esc(o.notes)}</p>` : ''}
        <div style="margin-top:.5rem;">${statusSelect(o, 'offers', ['Watching', 'Applied', 'Completed', 'Skipped'])}</div>
        ${actions(o, 'offers')}
      </div>`).join('') : '<p style="color:var(--text-muted); grid-column:1/-1;">No offers match these filters.</p>';
  }

  // ---------- Credit Opportunities ----------
  function renderCredit() {
    const type = $('credit-filter-type').value;
    const status = $('credit-filter-status').value;
    const fee = $('credit-filter-fee').value;
    const q = (document.getElementById('global-search')?.value || '').toLowerCase();
    const feeKnown = (c) => c.annualFee !== null && c.annualFee !== undefined && c.annualFee !== '';
    const feeOk = (c) => fee === 'ALL' || (feeKnown(c) ? Number(c.annualFee) === 0 : fee === 'KNOWN_OR_UNKNOWN');

    const list = state.credit.filter(c =>
      feeOk(c) && (type === 'ALL' || c.type === type) && (status === 'ALL' || c.status === status) &&
      (!q || `${c.issuer} ${c.card} ${c.bonusLabel}`.toLowerCase().includes(q)));

    const noFee = state.credit.filter(c => feeKnown(c) && Number(c.annualFee) === 0);
    const zero = noFee.filter(c => c.type.startsWith('Interest-Free'));
    const bonus = noFee.filter(c => c.type === 'New Card Bonus');
    const hidden = state.credit.length - noFee.length;
    const longest = Math.max(0, ...zero.map(c => Number(c.introAprMonths) || 0));
    $('credit-summary').innerHTML = summaryHtml([
      ['No-fee new card bonuses', bonus.length], ['No-fee 0% APR offers', zero.length],
      ['Longest 0% intro', longest ? longest + ' mo' : 'n/a'],
      ['Total no-fee offers', noFee.length]]);

    $('credit-container').innerHTML = list.length ? list.map(c => {
      const isZero = c.type.startsWith('Interest-Free');
      const unknownFee = !feeKnown(c);
      return `<div class="promo-card">
        <span class="card-badge ${isZero ? 'badge-amber' : 'badge-purple'}">${isZero ? '0% APR' : 'New Card'}</span>
        <div class="promo-title">${esc(c.issuer)} ${esc(c.card)}</div>
        <div class="promo-institution">${isZero ? `0% for ${c.introAprMonths ? esc(c.introAprMonths) + ' months' : 'unconfirmed length'}${c.introAprPurchaseMonths ? ' (purchases: ' + esc(c.introAprPurchaseMonths) + ' mo)' : ''}${c.balanceTransferFee ? ' • BT fee: ' + esc(c.balanceTransferFee) : ''}` :
          `${c.minSpend ? 'Spend ' + money(c.minSpend) + (c.spendWindowMonths ? ' in ' + esc(c.spendWindowMonths) + ' mo' : '') : 'Min spend unconfirmed'}`}</div>
        <div style="background:rgba(0,0,0,0.2); padding:.75rem; border-radius:6px; margin-bottom:.75rem;">
          <div style="font-family:var(--font-heading); font-size:1.15rem; color:var(--accent-green); font-weight:700;">${esc(c.bonusLabel)}</div>
          <div style="font-size:.75rem; color:var(--text-secondary); margin-top:4px;">Annual fee: ${unknownFee ? 'not confirmed' : (Number(c.annualFee) === 0 ? '$0 (no annual fee)' : money(c.annualFee))}</div>
        </div>
        ${c.restrictions ? `<div style="font-size:.75rem; color:var(--text-secondary); border-left:3px solid var(--accent-amber); padding-left:.5rem; margin-bottom:.5rem;"><strong>Fine print:</strong> ${esc(c.restrictions)}</div>` : ''}
        <div style="display:flex; gap:.4rem; flex-wrap:wrap; margin-bottom:.5rem;">${expiryBadge(c)} ${verifyBadge(c)}</div>
        ${c.notes ? `<p style="font-size:.75rem; color:var(--text-muted);">${esc(c.notes)}</p>` : ''}
        <div style="margin-top:.5rem;">${statusSelect(c, 'credit-opps', ['Watching', 'Applied', 'Active', 'Completed', 'Skipped'])}</div>
        ${actions(c, 'credit-opps')}
      </div>`;
    }).join('') : '<p style="color:var(--text-muted); grid-column:1/-1;">No card offers match these filters.</p>';
  }

  function summaryHtml(pairs) {
    return `<div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:.75rem; margin-bottom:1rem;">` +
      pairs.map(([l, v]) => `<div class="stat-bubble"><span class="bubble-label">${esc(l)}</span><span class="bubble-value text-cyan">${esc(v)}</span></div>`).join('') + '</div>';
  }

  // ---------- Add modal (built dynamically) ----------
  const FORMS = {
    offers: { title: 'Add Bank Offer', fields: [
      ['institution', 'Bank', 'text', true], ['product', 'Product / Account', 'text', true],
      ['category', 'Category (Checking, Savings, Premium)', 'text'], ['bonusAmount', 'Bonus amount ($)', 'number'],
      ['bonusLabel', 'Bonus label (e.g. Up to $400)', 'text'], ['requirement', 'Requirements', 'text', true],
      ['timeframe', 'Timeframe', 'text'], ['minDeposit', 'Min deposit ($)', 'number'],
      ['monthlyFee', 'Monthly fee', 'text'], ['expires', 'Offer end date', 'date'],
      ['sourceUrl', 'Offer URL (https://...)', 'text'], ['directDepositRequired', 'Direct deposit required', 'checkbox'],
      ['florida', 'Available in Florida?', 'select:Verify|Yes|No|Restricted'], ['restrictions', 'Fine print / eligibility limits', 'text'],
      ['notes', 'Notes', 'text']] },
    'credit-opps': { title: 'Add Card Offer', fields: [
      ['issuer', 'Issuer', 'text', true], ['card', 'Card name', 'text', true],
      ['type', 'Type', 'select:New Card Bonus|Interest-Free (0% APR)'], ['bonusLabel', 'Bonus / offer label', 'text', true],
      ['minSpend', 'Min spend ($)', 'number'], ['spendWindowMonths', 'Spend window (months)', 'number'],
      ['annualFee', 'Annual fee ($)', 'number'], ['introAprMonths', '0% intro months', 'number'],
      ['balanceTransferFee', 'Balance transfer fee', 'text'], ['expires', 'Offer end date', 'date'],
      ['sourceUrl', 'Offer URL (https://...)', 'text'], ['notes', 'Notes', 'text']] }
  };

  function openModal(kind) {
    const cfg = FORMS[kind];
    document.getElementById('radar-modal')?.remove();
    const fieldHtml = cfg.fields.map(([key, label, type, req]) => {
      if (type === 'checkbox') return `<div class="form-group"><label class="checkbox-label"><input type="checkbox" name="${key}"> ${esc(label)}</label></div>`;
      if (type.startsWith('select:')) return `<div class="form-group"><label>${esc(label)}</label><select name="${key}">${type.slice(7).split('|').map(o => `<option>${esc(o)}</option>`).join('')}</select></div>`;
      return `<div class="form-group"><label>${esc(label)}</label><input name="${key}" type="${type}" ${type === 'number' ? 'step="any"' : ''} ${req ? 'required' : ''}></div>`;
    }).join('');
    const m = document.createElement('div');
    m.className = 'modal-backdrop show';
    m.id = 'radar-modal';
    m.innerHTML = `<div class="modal-box" style="max-height:90vh; overflow-y:auto;">
      <div class="modal-header"><h3>${esc(cfg.title)}</h3><button type="button" class="btn-close-modal" id="radar-close">&times;</button></div>
      <form id="radar-form">${fieldHtml}
        <div class="modal-footer"><button type="button" class="btn btn-outline" id="radar-cancel">Cancel</button><button type="submit" class="btn btn-primary">Save</button></div>
      </form></div>`;
    document.body.appendChild(m);
    const close = () => m.remove();
    $('radar-close').onclick = close; $('radar-cancel').onclick = close;
    $('radar-form').onsubmit = async (e) => {
      e.preventDefault();
      const body = {};
      cfg.fields.forEach(([key, , type]) => {
        const el = e.target.elements[key];
        body[key] = type === 'checkbox' ? el.checked : type === 'number' ? (el.value.trim() === '' && key === 'annualFee' ? null : (parseFloat(el.value) || 0)) : el.value.trim();
      });
      if (body.sourceUrl && !safeUrl(body.sourceUrl)) { alert('Offer URL must start with http:// or https://'); return; }
      await api('/api/' + kind, 'POST', body);
      close();
      load();
    };
  }

  // ---------- events ----------
  $('btn-add-offer').onclick = () => openModal('offers');
  $('btn-add-credit').onclick = () => openModal('credit-opps');
  ['offers-filter-status', 'offers-filter-fl', 'offers-sort', 'offers-no-dd'].forEach(id => $(id).addEventListener('change', renderOffers));
  ['credit-filter-type', 'credit-filter-status', 'credit-filter-fee'].forEach(id => $(id).addEventListener('change', renderCredit));
  $('global-search').addEventListener('input', () => { renderOffers(); renderCredit(); });

  document.addEventListener('change', async (e) => {
    if (!e.target.classList.contains('status-select')) return;
    await api(`/api/${e.target.dataset.kind}/${e.target.dataset.id}`, 'PUT', { status: e.target.value });
    load();
  });

  document.addEventListener('click', async (e) => {
    const del = e.target.closest('.btn-del');
    const chk = e.target.closest('.btn-mark-checked');
    if (del && confirm('Remove this offer from the tracker?')) {
      await api(`/api/${del.dataset.kind}/${del.dataset.id}`, 'DELETE'); load();
    } else if (chk) {
      await api(`/api/${chk.dataset.kind}/${chk.dataset.id}`, 'PUT', { lastChecked: new Date().toISOString().split('T')[0] }); load();
    }
  });

  load();
});
