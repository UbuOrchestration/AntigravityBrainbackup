const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure upload and data paths exist
const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Configure Multer for File Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage });

// Database File Paths
const TX_FILE = path.join(dataDir, 'transactions.json');
const PROMO_FILE = path.join(dataDir, 'promotions.json');
const STMT_FILE = path.join(dataDir, 'statements.json');

// Helper DB Read/Write functions
function readDb(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error(`Error reading file ${filePath}:`, err);
    return [];
  }
}

function writeDb(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing file ${filePath}:`, err);
    return false;
  }
}

// ================= API ENDPOINTS ================= //

// 1. Dashboard Overview Stats & Interest-Free Radar Summary
app.get('/api/dashboard/stats', (req, res) => {
  const transactions = readDb(TX_FILE);
  const promotions = readDb(PROMO_FILE);
  const statements = readDb(STMT_FILE);

  const totalSpent = transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  
  // Category Habits calculation
  const categoryHabits = {};
  transactions.forEach(t => {
    const cat = t.category || 'Uncategorized';
    categoryHabits[cat] = (categoryHabits[cat] || 0) + Number(t.amount);
  });

  // Calculate Expiring Interest-Free 0% APR Promos
  const now = new Date();
  const warningDaysThreshold = 90; // Warn if expiring within 90 days or active balance exists
  const expiringInterestFreePromos = promotions.filter(p => {
    if (!p.isInterestFree || p.currentBalance <= 0) return false;
    const endDate = new Date(p.endDate);
    const diffDays = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    return diffDays <= warningDaysThreshold;
  }).map(p => {
    const endDate = new Date(p.endDate);
    const diffDays = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    const monthsRemaining = Math.max(1, Math.ceil(diffDays / 30));
    const requiredMonthlyPayoff = (p.currentBalance / monthsRemaining).toFixed(2);
    return {
      ...p,
      daysRemaining: diffDays,
      monthsRemaining,
      requiredMonthlyPayoff
    };
  });

  const totalPromoBonusValue = promotions.reduce((acc, p) => acc + (p.status.includes('Completed') ? 0 : 1), 0);

  res.json({
    totalSpent,
    totalTransactions: transactions.length,
    activePromotionsCount: promotions.length,
    expiringInterestFreeCount: expiringInterestFreePromos.length,
    expiringInterestFreePromos,
    archivedStatementsCount: statements.length,
    categoryHabits
  });
});

// 2. Transactions API
app.get('/api/transactions', (req, res) => {
  res.json(readDb(TX_FILE));
});

app.post('/api/transactions', (req, res) => {
  const transactions = readDb(TX_FILE);
  const newTx = {
    id: 'tx-' + Date.now(),
    date: req.body.date || new Date().toISOString().split('T')[0],
    merchant: req.body.merchant || 'Unknown Merchant',
    category: req.body.category || 'General',
    amount: parseFloat(req.body.amount) || 0,
    account: req.body.account || 'Checking / Card',
    indexedTag: req.body.indexedTag || 'General',
    receiptAttached: Boolean(req.body.receiptAttached),
    notes: req.body.notes || ''
  };
  transactions.unshift(newTx);
  writeDb(TX_FILE, transactions);
  res.status(201).json(newTx);
});

app.delete('/api/transactions/:id', (req, res) => {
  let transactions = readDb(TX_FILE);
  transactions = transactions.filter(t => t.id !== req.params.id);
  writeDb(TX_FILE, transactions);
  res.json({ success: true });
});

// 3. Promotions API (Card/Checking Promos + 0% APR Interest-Free Radar)
app.get('/api/promotions', (req, res) => {
  res.json(readDb(PROMO_FILE));
});

app.post('/api/promotions', (req, res) => {
  const promotions = readDb(PROMO_FILE);
  const newPromo = {
    id: 'promo-' + Date.now(),
    title: req.body.title || 'New Promotion',
    institution: req.body.institution || 'Bank',
    type: req.body.type || 'Credit Card Bonus',
    bonusValue: req.body.bonusValue || '$0',
    currentBalance: parseFloat(req.body.currentBalance) || 0,
    startDate: req.body.startDate || new Date().toISOString().split('T')[0],
    endDate: req.body.endDate || '',
    isInterestFree: Boolean(req.body.isInterestFree),
    monthlyMinPayment: parseFloat(req.body.monthlyMinPayment) || 0,
    minSpendRequired: parseFloat(req.body.minSpendRequired) || 0,
    currentSpend: parseFloat(req.body.currentSpend) || 0,
    status: req.body.status || 'Active',
    notes: req.body.notes || ''
  };
  promotions.unshift(newPromo);
  writeDb(PROMO_FILE, promotions);
  res.status(201).json(newPromo);
});

app.put('/api/promotions/:id', (req, res) => {
  const promotions = readDb(PROMO_FILE);
  const idx = promotions.findIndex(p => p.id === req.params.id);
  if (idx !== -1) {
    promotions[idx] = { ...promotions[idx], ...req.body };
    writeDb(PROMO_FILE, promotions);
    return res.json(promotions[idx]);
  }
  res.status(404).json({ error: 'Promotion not found' });
});

app.delete('/api/promotions/:id', (req, res) => {
  let promotions = readDb(PROMO_FILE);
  promotions = promotions.filter(p => p.id !== req.params.id);
  writeDb(PROMO_FILE, promotions);
  res.json({ success: true });
});

// 4. Statements Archive API
app.get('/api/statements', (req, res) => {
  res.json(readDb(STMT_FILE));
});

app.post('/api/statements', upload.single('statementFile'), (req, res) => {
  const statements = readDb(STMT_FILE);
  const fileName = req.file ? req.file.filename : (req.body.fileName || 'document_statement.pdf');
  
  const newStmt = {
    id: 'stmt-' + Date.now(),
    institution: req.body.institution || 'Financial Institution',
    accountName: req.body.accountName || 'Account',
    period: req.body.period || 'Current Period',
    totalBalance: parseFloat(req.body.totalBalance) || 0,
    minimumDue: parseFloat(req.body.minimumDue) || 0,
    dueDate: req.body.dueDate || '',
    indexedChargesCount: parseInt(req.body.indexedChargesCount) || 0,
    fileName: fileName,
    archivedDate: new Date().toISOString().split('T')[0],
    notes: req.body.notes || ''
  };

  statements.unshift(newStmt);
  writeDb(STMT_FILE, statements);
  res.status(201).json(newStmt);
});

app.delete('/api/statements/:id', (req, res) => {
  let statements = readDb(STMT_FILE);
  statements = statements.filter(s => s.id !== req.params.id);
  writeDb(STMT_FILE, statements);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Accountant Dashboard Server running at http://localhost:${PORT}`);
});
