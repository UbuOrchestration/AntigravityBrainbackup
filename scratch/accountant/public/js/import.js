/* Import & Insights module. Local parsing happens server-side; no external calls. */
document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const CATS = ['Groceries', 'Dining & Entertainment', 'Automotive', 'Travel', 'Software Subscriptions', 'Electronics & Tech', 'Office Supplies', 'Utilities & Bills', 'Uncategorized'];
  let preview = null;

  async function json(res) { const d = await res.json(); if (!res.ok) throw new Error(d.error || 'Request failed'); return d; }

  // ---------- preview ----------
  async function sendFiles(fileList) {
    const files = [...fileList].filter(f => /\.(csv|tsv|txt)$/i.test(f.name));
    if (!files.length) { alert('Please choose .csv, .tsv or .txt files.'); return; }
    const fd = new FormData();
    files.forEach(f => fd.append('files', f));
    showPreview(await json(await fetch('/api/import/preview', { method: 'POST', body: fd })));
  }

  async function scanInbox() {
    try { showPreview(await json(await fetch('/api/import/preview?source=inbox', { method: 'POST' }))); }
    catch (e) { alert(e.message); }
  }

  function showPreview(p) {
    preview = p;
    p.rows.forEach(r => r.include = !r.duplicate);
    renderPreview();
  }

  function renderPreview() {
    const box = $('import-preview');
    box.classList.remove('hidden');
    const rows = preview.rows;
    const shown = rows.slice(0, 300);
    box.innerHTML = `
      <div style="margin:1rem 0; display:flex; flex-wrap:wrap; gap:.5rem;">
        ${preview.files.map(f => `<span class="badge ${f.errors ? 'badge-amber' : 'badge-green'}">${esc(f.name)}: ${f.parsed} rows${f.skipped ? `, ${f.skipped} payments/credits skipped` : ''}</span>`).join('')}
      </div>
      ${preview.errors.length ? `<div class="warning-banner" style="margin-bottom:1rem;"><div class="banner-content"><h4>${preview.errors.length} problem(s)</h4><p>${preview.errors.slice(0, 5).map(esc).join('<br>')}${preview.errors.length > 5 ? '<br>...' : ''}</p></div></div>` : ''}
      <div class="table-responsive" style="max-height:340px; overflow-y:auto;">
        <table class="data-table"><thead><tr><th></th><th>Date</th><th>Merchant</th><th>Category</th><th>Account</th><th>Amount</th></tr></thead><tbody>
        ${shown.map((r, i) => `<tr style="${r.duplicate ? 'opacity:.55' : ''}">
          <td><input type="checkbox" data-i="${i}" class="imp-inc" ${r.include ? 'checked' : ''}></td>
          <td>${esc(r.date)}</td><td>${esc(r.merchant)}${r.duplicate ? ' <span class="badge badge-amber">duplicate</span>' : ''}</td>
          <td><select data-i="${i}" class="imp-cat status-select">${[...new Set([r.category, ...CATS])].map(c => `<option ${c === r.category ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></td>
          <td>${esc(r.account)}</td><td class="amount-text text-cyan">${money(r.amount)}</td></tr>`).join('')}
        </tbody></table>
      </div>
      ${rows.length > shown.length ? `<p style="color:var(--text-muted); font-size:.75rem;">Showing first ${shown.length} of ${rows.length}. All checked rows are imported.</p>` : ''}
      <div class="modal-footer" style="justify-content:space-between; align-items:center;">
        <label class="checkbox-label"><input type="checkbox" id="imp-test" checked> Tag as TEST data (can be removed in one click)</label>
        <div style="display:flex; gap:.5rem; align-items:center;">
          <span id="imp-count" style="color:var(--text-secondary); font-size:.8rem;"></span>
          <button class="btn btn-outline" id="imp-cancel">Cancel</button>
          <button class="btn btn-success" id="imp-commit"><i class="fa-solid fa-check"></i> Import</button>
        </div>
      </div>`;
    updateCount();
  }

  function updateCount() {
    const n = preview.rows.filter(r => r.include).length;
    const el = $('imp-count'); if (el) el.textContent = `${n} of ${preview.rows.length} selected`;
    const b = $('imp-commit'); if (b) b.disabled = n === 0;
  }

  async function commit() {
    const rows = preview.rows.filter(r => r.include).map(({ date, merchant, amount, category, account }) => ({ date, merchant, amount, category, account }));
    const res = await json(await fetch('/api/import/commit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows, test: $('imp-test').checked })
    }));
    $('import-preview').innerHTML = `<div class="warning-banner" style="margin-top:1rem; border-color:rgba(56,239,125,.4);"><div class="banner-content"><h4>Imported ${res.added} transaction(s)</h4><p>${res.duplicatesSkipped ? res.duplicatesSkipped + ' duplicate(s) skipped. ' : ''}Ledger and charts have been updated.</p></div></div>`;
    preview = null;
    afterDataChange();
  }

  // ---------- insights ----------
  function bars(items, labelKey, valueKey, fmt) {
    const max = Math.max(1, ...items.map(i => i[valueKey]));
    return items.map(i => `<div class="ins-row"><span class="ins-label" title="${esc(i[labelKey])}">${esc(i[labelKey])}</span>
      <div class="ins-track"><div class="ins-fill" style="width:${(i[valueKey] / max * 100).toFixed(1)}%"></div></div>
      <span class="ins-val">${fmt(i)}</span></div>`).join('');
  }

  async function loadInsights() {
    const inc = $('insights-include-test').checked;
    const a = await json(await fetch('/api/analytics?includeTest=' + (inc ? 1 : 0)));
    $('btn-purge-test').classList.toggle('hidden', !a.testCount);
    $('btn-purge-test').innerHTML = `<i class="fa-solid fa-broom"></i> Remove all TEST data (${a.testCount})`;
    $('insights-sub').textContent = a.count ? `${a.count} transactions analysed` : '';
    if (!a.count) {
      $('insights-body').innerHTML = '<p style="color:var(--text-muted); padding:1rem;">No transactions yet. Import a statement above to see spending habits.</p>';
      return;
    }
    const stat = (l, v, c = 'text-cyan') => `<div class="stat-bubble"><span class="bubble-label">${l}</span><span class="bubble-value ${c}">${v}</span></div>`;
    $('insights-body').innerHTML = `
      <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:.75rem; margin-bottom:1.25rem;">
        ${stat('Total spent', money(a.total))}${stat('Avg / month', money(a.avgPerMonth))}
        ${stat('Avg transaction', money(a.avgTransaction))}${stat('Recurring charges', a.recurring.length, 'text-purple')}
        ${stat('Uncategorized', a.uncategorized, a.uncategorized ? 'text-amber' : 'text-green')}
      </div>
      <div class="grid-2col">
        <div><h4 class="ins-h">By category</h4>${bars(a.categories, 'category', 'total', i => `${money(i.total)} (${i.pct}%)`)}</div>
        <div><h4 class="ins-h">By month</h4>${bars(a.months, 'month', 'total', i => `${money(i.total)} (${i.count})`)}</div>
        <div><h4 class="ins-h">Top merchants</h4>${bars(a.topMerchants, 'merchant', 'total', i => `${money(i.total)} (${i.count}x)`)}</div>
        <div><h4 class="ins-h">By weekday</h4>${bars(a.weekdayTotals, 'day', 'total', i => money(i.total))}</div>
      </div>
      <div class="grid-2col" style="margin-top:1rem;">
        <div><h4 class="ins-h">Likely recurring (same merchant, 2+ months, steady amount)</h4>
          ${a.recurring.length ? a.recurring.map(r => `<div class="ins-line">${esc(r.merchant)} <span class="text-cyan">~${money(r.typicalAmount)}</span> <span style="color:var(--text-muted)">over ${r.months} months</span></div>`).join('') : '<p style="color:var(--text-muted);">None detected. Needs 2+ months of data.</p>'}</div>
        <div><h4 class="ins-h">Largest transactions</h4>
          ${a.largest.map(t => `<div class="ins-line">${esc(t.date)} ${esc(t.merchant)} <span class="text-cyan">${money(t.amount)}</span> <span style="color:var(--text-muted)">${esc(t.category)}</span></div>`).join('')}</div>
      </div>`;
  }

  // ---------- shared ----------
  async function syncFilters() {
    try {
      const txs = await json(await fetch('/api/transactions'));
      const fill = (sel, vals) => { const el = $(sel); if (!el) return; const have = new Set([...el.options].map(o => o.value)); vals.forEach(v => { if (v && !have.has(v)) el.add(new Option(v, v)); }); };
      fill('filter-category', [...new Set(txs.map(t => t.category))]);
      fill('filter-tag', [...new Set(txs.map(t => t.indexedTag))]);
    } catch (e) { /* non-fatal */ }
  }

  async function updateInboxCount() {
    try { $('inbox-count').textContent = (await json(await fetch('/api/import/inbox'))).length; } catch (e) { /* ignore */ }
  }

  function afterDataChange() {
    $('btn-refresh').click();
    loadInsights(); syncFilters(); updateInboxCount();
  }

  // ---------- events ----------
  const dz = $('import-dropzone');
  ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('drag'); }));
  dz.addEventListener('drop', e => sendFiles(e.dataTransfer.files).catch(err => alert(err.message)));
  $('import-file-input').addEventListener('change', e => { sendFiles(e.target.files).catch(err => alert(err.message)); e.target.value = ''; });
  $('btn-scan-inbox').addEventListener('click', scanInbox);
  $('insights-include-test').addEventListener('change', loadInsights);
  $('btn-purge-test').addEventListener('click', async () => {
    if (!confirm('Remove ALL transactions tagged TEST? Real data is not affected.')) return;
    await json(await fetch('/api/import/test', { method: 'DELETE' }));
    afterDataChange();
  });

  $('import-preview').addEventListener('change', e => {
    const t = e.target, i = t.dataset.i;
    if (t.classList.contains('imp-inc')) { preview.rows[i].include = t.checked; updateCount(); }
    if (t.classList.contains('imp-cat')) preview.rows[i].category = t.value;
  });
  $('import-preview').addEventListener('click', e => {
    if (e.target.closest('#imp-cancel')) { preview = null; $('import-preview').classList.add('hidden'); }
    if (e.target.closest('#imp-commit')) commit().catch(err => alert(err.message));
  });

  document.querySelector('[data-view="import"]').addEventListener('click', () => { loadInsights(); updateInboxCount(); });
  syncFilters(); updateInboxCount();
});
