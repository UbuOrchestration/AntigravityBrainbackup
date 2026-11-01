/* Local statement importer + analytics. No network, no AI tokens. */

function parseCsv(text) {
  text = text.replace(/^\uFEFF/, '');
  const first = text.split(/\r?\n/, 1)[0] || '';
  const delim = [',', '\t', ';'].map(d => [d, first.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = [];
  let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cur); cur = '';
      if (row.some(c => c.trim() !== '')) rows.push(row);
      row = [];
    } else cur += ch;
  }
  row.push(cur);
  if (row.some(c => c.trim() !== '')) rows.push(row);
  return rows;
}

function normDate(s) {
  s = String(s || '').trim();
  let m;
  const mk = (y, mo, d) => {
    if (y < 100) y += 2000;
    const dt = new Date(Date.UTC(y, mo - 1, d));
    return dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d ? dt.toISOString().slice(0, 10) : null;
  };
  if ((m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/))) return mk(+m[1], +m[2], +m[3]);
  if ((m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/))) return mk(+m[3], +m[1], +m[2]);
  const t = Date.parse(s + ' UTC');
  return isNaN(t) ? null : new Date(t).toISOString().slice(0, 10);
}

function normAmount(s) {
  if (s === undefined || s === null) return null;
  let t = String(s).trim();
  if (!t) return null;
  let neg = /^\(.*\)$/.test(t) || /^-/.test(t) || /\bDR\b/i.test(t);
  t = t.replace(/[^0-9.]/g, '');
  if (!t) return null;
  const n = parseFloat(t);
  return isNaN(n) ? null : (neg ? -n : n);
}

const CATEGORY_RULES = [
  ['Groceries', /whole foods|trader joe|kroger|safeway|aldi|publix|costco|walmart|target|instacart|key food|grocery|market|wegmans|stop & shop/i],
  ['Dining & Entertainment', /restaurant|cafe|coffee|starbucks|dunkin|mcdonald|chipotle|pizza|doordash|grubhub|uber eats|bar & grill|netflix|spotify|hulu|disney|cinema|theat|steam|playstation|xbox|ticketmaster/i],
  ['Automotive', /chevron|shell|exxon|mobil|bp |sunoco|gas|fuel|autozone|jiffy|parking|toll|e-?zpass|uber|lyft|geico|progressive/i],
  ['Travel', /airline|delta|united|american air|southwest|jetblue|hotel|marriott|hilton|hyatt|airbnb|expedia|booking\.com|amtrak|hertz|avis/i],
  ['Software Subscriptions', /amazon web|aws|github|google \*?(cloud|workspace)|microsoft|adobe|dropbox|openai|slack|zoom|notion|atlassian|digitalocean|namecheap|godaddy|icloud|apple\.com\/bill/i],
  ['Electronics & Tech', /apple store|best buy|micro center|newegg|b&h|dell|lenovo/i],
  ['Office Supplies', /staples|office depot|uline/i],
  ['Utilities & Bills', /electric|water|utility|comcast|xfinity|verizon|at&t|t-mobile|spectrum|insurance|con ?ed|national grid|internet|phone/i]
];

function categorize(desc) {
  for (const [cat, re] of CATEGORY_RULES) if (re.test(desc)) return cat;
  return 'Uncategorized';
}

function cleanMerchant(desc) {
  return String(desc || '').replace(/\s+/g, ' ').replace(/\s+#?\d{4,}.*$/, '').trim() || 'Unknown Merchant';
}

function parseStatement(text, defaultAccount) {
  const rows = parseCsv(text);
  if (rows.length < 2) return { rows: [], skipped: 0, errors: ['File has no data rows'] };
  const head = rows[0].map(h => h.trim().toLowerCase());
  const find = (...res) => { for (const re of res) { const i = head.findIndex(h => re.test(h)); if (i !== -1) return i; } return -1; };
  const iDate = find(/^transaction date$/, /^trans(action)? date$/, /date/);
  const iDesc = find(/^description$/, /merchant/, /payee/, /^name$/, /details?/, /memo/);
  const iAmt = find(/^amount$/, /^amt$/);
  const iDebit = find(/debit|withdraw|charge/);
  const iCredit = find(/credit|deposit|payment/);
  const iCat = find(/^category$/);
  const iAcct = find(/^account/, /^card/);
  const iType = find(/^type$/);
  const errors = [];
  if (iDate < 0 || iDesc < 0 || (iAmt < 0 && iDebit < 0)) {
    return { rows: [], skipped: 0, errors: ['Could not find date / description / amount columns. Headers seen: ' + head.join(', ')] };
  }
  const body = rows.slice(1);
  const parsed = body.map(r => ({
    date: normDate(r[iDate]), desc: r[iDesc] || '', raw: iAmt >= 0 ? normAmount(r[iAmt]) : null,
    debit: iDebit >= 0 ? normAmount(r[iDebit]) : null, credit: iCredit >= 0 && iAmt < 0 ? normAmount(r[iCredit]) : null,
    cat: iCat >= 0 ? (r[iCat] || '').trim() : '', acct: iAcct >= 0 ? (r[iAcct] || '').trim() : '',
    type: iType >= 0 ? (r[iType] || '') : ''
  }));
  // Sign convention: if any negative amounts exist, spending is negative; otherwise all-positive = spending.
  const hasNeg = parsed.some(p => p.raw !== null && p.raw < 0);
  const out = []; let skipped = 0;
  parsed.forEach((p, idx) => {
    let spend = null;
    if (iAmt >= 0) spend = p.raw === null ? null : (hasNeg ? (p.raw < 0 ? -p.raw : 0) : p.raw);
    else spend = p.debit !== null ? Math.abs(p.debit) : 0;
    if (/payment|return|refund|credit|deposit/i.test(p.type)) spend = 0;
    if (!p.date || spend === null) { errors.push(`Row ${idx + 2}: unreadable date/amount`); return; }
    if (spend <= 0) { skipped++; return; }
    const merchant = cleanMerchant(p.desc);
    out.push({
      date: p.date, merchant, amount: Math.round(spend * 100) / 100,
      category: p.cat || categorize(p.desc), account: p.acct || defaultAccount || 'Imported'
    });
  });
  return { rows: out, skipped, errors };
}

function dupKey(t) { return [t.date, String(t.merchant).toLowerCase(), Number(t.amount).toFixed(2), String(t.account).toLowerCase()].join('|'); }

function analytics(txs) {
  const total = txs.reduce((s, t) => s + Number(t.amount || 0), 0);
  const by = (keyFn) => { const m = {}; txs.forEach(t => { const k = keyFn(t); (m[k] = m[k] || { total: 0, count: 0 }); m[k].total += Number(t.amount); m[k].count++; }); return m; };
  const round = (n) => Math.round(n * 100) / 100;
  const months = Object.entries(by(t => String(t.date).slice(0, 7))).sort().map(([month, v]) => ({ month, total: round(v.total), count: v.count }));
  const cats = Object.entries(by(t => t.category || 'Uncategorized')).sort((a, b) => b[1].total - a[1].total)
    .map(([category, v]) => ({ category, total: round(v.total), count: v.count, pct: total ? round(v.total / total * 100) : 0 }));
  const merch = by(t => String(t.merchant).toLowerCase());
  const display = {}; txs.forEach(t => display[String(t.merchant).toLowerCase()] = t.merchant);
  const topMerchants = Object.entries(merch).sort((a, b) => b[1].total - a[1].total).slice(0, 8)
    .map(([k, v]) => ({ merchant: display[k], total: round(v.total), count: v.count }));
  const recurring = [];
  Object.keys(merch).forEach(k => {
    const list = txs.filter(t => String(t.merchant).toLowerCase() === k);
    const ms = new Set(list.map(t => String(t.date).slice(0, 7)));
    const amts = list.map(t => Number(t.amount));
    if (ms.size >= 2 && Math.max(...amts) <= Math.min(...amts) * 1.15) {
      recurring.push({ merchant: display[k], months: ms.size, typicalAmount: round(amts.reduce((a, b) => a + b, 0) / amts.length) });
    }
  });
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekdayTotals = wd.map(d => ({ day: d, total: 0 }));
  txs.forEach(t => { const d = new Date(t.date + 'T00:00:00Z').getUTCDay(); if (!isNaN(d)) weekdayTotals[d].total += Number(t.amount); });
  weekdayTotals.forEach(w => w.total = round(w.total));
  const largest = [...txs].sort((a, b) => b.amount - a.amount).slice(0, 5).map(t => ({ date: t.date, merchant: t.merchant, amount: t.amount, category: t.category }));
  const uncategorized = txs.filter(t => (t.category || 'Uncategorized') === 'Uncategorized').length;
  return {
    count: txs.length, total: round(total), avgPerMonth: months.length ? round(total / months.length) : 0,
    avgTransaction: txs.length ? round(total / txs.length) : 0, months, categories: cats, topMerchants,
    recurring, weekdayTotals, largest, uncategorized
  };
}

module.exports = { parseStatement, analytics, dupKey, categorize };
