const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const port = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const prefPath = path.join(__dirname, 'preferences.json');
const stockpilePath = path.join(__dirname, 'stockpile.json');
const menuStatusPath = path.join(__dirname, 'menu_status.json');

// Get active preferences
app.get('/api/preferences', (req, res) => {
  if (fs.existsSync(prefPath)) {
    try {
      const prefs = JSON.parse(fs.readFileSync(prefPath, 'utf8'));
      return res.json(prefs);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to parse preferences.json' });
    }
  }
  res.status(404).json({ error: 'preferences.json not found' });
});

// Update active preferences
app.post('/api/preferences', (req, res) => {
  try {
    fs.writeFileSync(prefPath, JSON.stringify(req.body, null, 2), 'utf8');
    res.json({ message: 'Preferences updated successfully.', preferences: req.body });
  } catch (e) {
    res.status(500).json({ error: 'Failed to write preferences.json' });
  }
});

// Get stockpile inventory
app.get('/api/stockpile', (req, res) => {
  if (fs.existsSync(stockpilePath)) {
    try {
      const stockpile = JSON.parse(fs.readFileSync(stockpilePath, 'utf8'));
      return res.json(stockpile);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to parse stockpile.json' });
    }
  }
  res.status(404).json({ error: 'stockpile.json not found' });
});

// Update stockpile item
app.post('/api/stockpile', (req, res) => {
  try {
    fs.writeFileSync(stockpilePath, JSON.stringify(req.body, null, 2), 'utf8');
    res.json({ message: 'Stockpile updated successfully.', stockpile: req.body });
  } catch (e) {
    res.status(500).json({ error: 'Failed to write stockpile.json' });
  }
});

// Get active weekly menu state
app.get('/api/menu', (req, res) => {
  if (fs.existsSync(menuStatusPath)) {
    try {
      const menuStatus = JSON.parse(fs.readFileSync(menuStatusPath, 'utf8'));
      return res.json(menuStatus);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to parse menu_status.json' });
    }
  }
  res.status(404).json({ error: 'menu_status.json not found' });
});

// Trigger a weekly menu regeneration
app.post('/api/menu/generate', (req, res) => {
  exec('node generate_menu.js', (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to generate menu: ' + err.message });
    }
    
    // Read and return new menu
    try {
      const menuStatus = JSON.parse(fs.readFileSync(menuStatusPath, 'utf8'));
      res.json(menuStatus);
    } catch (e) {
      res.status(500).json({ error: 'Failed to load newly generated menu.' });
    }
  });
});

// Approve the weekly menu (starts process_approved_menu lifecycle)
app.post('/api/menu/approve', (req, res) => {
  if (!fs.existsSync(menuStatusPath)) {
    return res.status(404).json({ error: 'menu_status.json not found' });
  }

  try {
    const menuStatus = JSON.parse(fs.readFileSync(menuStatusPath, 'utf8'));
    menuStatus.status = 'approved';
    menuStatus.lastUpdated = new Date().toISOString();
    fs.writeFileSync(menuStatusPath, JSON.stringify(menuStatus, null, 2), 'utf8');
    
    // Trigger approval processor
    exec('node process_approved_menu.js', (err, stdout, stderr) => {
      if (err) {
        console.error('Error in process_approved_menu.js:', err.message);
      }
      console.log('process_approved_menu.js stdout:', stdout);
    });

    res.json({ message: 'Menu approved. Triggering stockpile checks and cart builds.', menuStatus });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update menu status.' });
  }
});

// Skip weekly menu
app.post('/api/menu/skip', (req, res) => {
  if (!fs.existsSync(menuStatusPath)) {
    return res.status(404).json({ error: 'menu_status.json not found' });
  }

  try {
    const menuStatus = JSON.parse(fs.readFileSync(menuStatusPath, 'utf8'));
    menuStatus.status = 'skipped';
    menuStatus.lastUpdated = new Date().toISOString();
    fs.writeFileSync(menuStatusPath, JSON.stringify(menuStatus, null, 2), 'utf8');
    
    // Trigger skip notification email
    const psCommand = `powershell.exe -ExecutionPolicy Bypass -File "${path.join(__dirname, 'send_reminder_email.ps1')}" -Type Skip`;
    exec(psCommand, (err, stdout, stderr) => {
      if (err) {
        console.error('Error sending skip email:', err.message);
      }
    });

    res.json({ message: 'Menu skipped. Skip email notification triggered.', menuStatus });
  } catch (e) {
    res.status(500).json({ error: 'Failed to skip menu.' });
  }
});

// Trigger a manual monthly stockpile audit check email
app.post('/api/stockpile/check', (req, res) => {
  const psCommand = `powershell.exe -ExecutionPolicy Bypass -File "${path.join(__dirname, 'send_reminder_email.ps1')}" -Type StockpileAudit`;
  exec(psCommand, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to send audit email: ' + err.message });
    }
    res.json({ message: 'Monthly stockpile audit email sent successfully.' });
  });
});

app.listen(port, () => {
  console.log(`[MealMate Server] Running on http://localhost:${port}`);
});
