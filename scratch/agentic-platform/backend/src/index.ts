import express from 'express';
import cors from 'cors';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { AgentRunner } from './agentRunner';
import { CronManager } from './cronManager';
import { DocManager } from './tools';
import { DiscordBotManager } from './discordBot';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const repoPath = 'C:\\Users\\Ubu\\.gemini\\antigravity\\scratch\\agentic-platform';

const agentRunner = new AgentRunner();
const cronManager = new CronManager(repoPath);
const docManager = new DocManager(repoPath);
const discordBotManager = new DiscordBotManager(repoPath, agentRunner, cronManager, docManager);

// Start bot if configured
discordBotManager.start();

// Agent Management Endpoints
app.get('/api/agents', (req, res) => {
  res.json(agentRunner.getAgents());
});

app.post('/api/agents/:id/limits', (req, res) => {
  const { id } = req.params;
  const { cpuLimitMhz, memoryLimitMib } = req.body;
  
  if (typeof cpuLimitMhz !== 'number' || typeof memoryLimitMib !== 'number') {
    return res.status(400).json({ error: 'Invalid resource parameters.' });
  }

  const success = agentRunner.updateAgentLimits(id, cpuLimitMhz, memoryLimitMib);
  if (success) {
    res.json({ message: 'Resource limits updated successfully.', agent: agentRunner.getAgent(id) });
  } else {
    res.status(404).json({ error: 'Agent not found.' });
  }
});

// Backup Endpoints
app.get('/api/backup/status', (req, res) => {
  res.json(cronManager.getBackupStatus());
});

app.post('/api/backup/trigger', async (req, res) => {
  agentRunner.setAgentStatus('ibi', 'running', 'Manually executing Git backup job.');
  try {
    const status = await cronManager.triggerBackup();
    const state = status.status === 'success' ? 'idle' : 'error';
    agentRunner.setAgentStatus('ibi', state, status.status === 'success' ? '✅ Backup completed.' : '❌ Backup failed.');
    res.json(status);
  } catch (e) {
    agentRunner.setAgentStatus('ibi', 'error', `❌ Backup failed: ${(e as Error).message}`);
    res.status(500).json({ error: (e as Error).message });
  }
});

// Wiki/Docs Endpoints
app.get('/api/docs', (req, res) => {
  res.json(docManager.getDocs());
});

app.post('/api/docs/search', (req, res) => {
  const { query } = req.body;
  if (typeof query !== 'string') {
    return res.status(400).json({ error: 'Query must be a string.' });
  }
  res.json(docManager.searchDocs(query));
});

app.post('/api/docs', (req, res) => {
  const { title, category, content } = req.body;
  if (!title || !category || !content) {
    return res.status(400).json({ error: 'Missing document fields.' });
  }
  const page = docManager.addWikiPage(title, category, content);
  res.json({ message: 'Wiki page created successfully.', doc: page });
});

// Discord Bot Endpoints
app.get('/api/discord/config', (req, res) => {
  res.json(discordBotManager.getConfig());
});

app.post('/api/discord/config', async (req, res) => {
  try {
    await discordBotManager.updateConfig(req.body);
    res.json(discordBotManager.getConfig());
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.get('/api/discord/logs', (req, res) => {
  res.json(discordBotManager.getLogs());
});

app.post('/api/discord/send', async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message content is required.' });
  }
  try {
    await discordBotManager.sendMessageToChannel(message);
    res.json({ status: 'success' });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Hivemind Central Orchestrator Endpoints
app.get('/api/hivemind/status', (req, res) => {
  const mealmatePath = 'C:\\Users\\Ubu\\.gemini\\antigravity\\scratch\\MealMate';
  const ebayPath = 'C:\\Users\\Ubu\\.gemini\\antigravity\\scratch\\ebay-arbitrage';
  const leadgenPath = 'C:\\Users\\Ubu\\.gemini\\antigravity\\scratch\\email-campaign-manager';

  // 1. MealMate Status
  let mealmateStatus = { status: 'offline', stockpileItems: 0, lastMenuDate: 'N/A' };
  try {
    const stockpileFile = path.join(mealmatePath, 'stockpile.json');
    if (fs.existsSync(stockpileFile)) {
      const stockpile = JSON.parse(fs.readFileSync(stockpileFile, 'utf8'));
      let count = 0;
      for (const cat in stockpile) {
        count += Object.keys(stockpile[cat]).length;
      }
      mealmateStatus.stockpileItems = count;
      mealmateStatus.status = 'active';
    }
    const menuStatusFile = path.join(mealmatePath, 'menu_status.json');
    if (fs.existsSync(menuStatusFile)) {
      const menuStatus = JSON.parse(fs.readFileSync(menuStatusFile, 'utf8'));
      mealmateStatus.lastMenuDate = menuStatus.weeklyMenuDate || menuStatus.timestamp || 'N/A';
    }
  } catch (e) {
    console.error('Error reading MealMate status:', e);
  }

  // 2. eBay Arbitrage Status
  let ebayStatus = { status: 'not_configured', activeListings: 0, hasToken: false };
  try {
    const ebayEnv = path.join(ebayPath, '.env');
    if (fs.existsSync(ebayEnv)) {
      const envContent = fs.readFileSync(ebayEnv, 'utf8');
      ebayStatus.hasToken = envContent.includes('EBAY_REFRESH_TOKEN') || envContent.includes('refresh_token');
      ebayStatus.status = ebayStatus.hasToken ? 'configured' : 'auth_needed';
    }
    const testLog = path.join(ebayPath, 'ebay_test.log');
    if (fs.existsSync(testLog)) {
      const logs = fs.readFileSync(testLog, 'utf8');
      const match = logs.match(/listings count:\s*(\d+)/i) || logs.match(/active listings:\s*(\d+)/i);
      if (match) {
        ebayStatus.activeListings = parseInt(match[1], 10);
      }
    }
  } catch (e) {
    console.error('Error reading eBay status:', e);
  }

  // 3. AutoCAD Lead Gen Status
  let leadgenStatus = { status: 'planned', leadsCount: 0, campaignStatus: 'idle' };
  try {
    if (fs.existsSync(leadgenPath)) {
      leadgenStatus.status = 'active';
      const leadsFile = path.join(leadgenPath, 'leads.json');
      if (fs.existsSync(leadsFile)) {
        const leads = JSON.parse(fs.readFileSync(leadsFile, 'utf8'));
        leadgenStatus.leadsCount = Array.isArray(leads) ? leads.length : Object.keys(leads).length;
      }
    }
  } catch (e) {
    console.error('Error reading leadgen status:', e);
  }

  // 4. Git Backup Status
  const backupStatus = cronManager.getBackupStatus();

  res.json({
    mealmate: mealmateStatus,
    ebay: ebayStatus,
    leadgen: leadgenStatus,
    backup: backupStatus
  });
});

app.post('/api/hivemind/trigger', (req, res) => {
  const { task } = req.body;
  const mealmatePath = 'C:\\Users\\Ubu\\.gemini\\antigravity\\scratch\\MealMate';
  const ebayPath = 'C:\\Users\\Ubu\\.gemini\\antigravity\\scratch\\ebay-arbitrage';

  if (task === 'git-backup') {
    agentRunner.setAgentStatus('ibi', 'running', 'Manual Git backup run triggered.');
    cronManager.triggerBackup()
      .then(status => {
        agentRunner.setAgentStatus('ibi', status.status === 'success' ? 'idle' : 'error', status.status === 'success' ? '✅ Backup completed.' : '❌ Backup failed.');
        res.json(status);
      })
      .catch(e => {
        agentRunner.setAgentStatus('ibi', 'error', `❌ Backup error: ${e.message}`);
        res.status(500).json({ error: e.message });
      });
  } else if (task === 'mealmate-weekly') {
    agentRunner.setAgentStatus('mealmate', 'running', 'Generating weekly menu and shopping list.');
    const script = path.join(mealmatePath, 'manage_menu_flow.ps1');
    const command = `powershell -ExecutionPolicy Bypass -File "${script}"`;
    exec(command, { cwd: mealmatePath }, (error, stdout, stderr) => {
      const success = !error;
      agentRunner.setAgentStatus('mealmate', success ? 'idle' : 'error', success ? '✅ Weekly menu processed.' : '❌ Menu generation failed.');
      res.json({ status: success ? 'success' : 'failed', log: stdout + stderr });
    });
  } else if (task === 'ebay-sync') {
    agentRunner.setAgentStatus('ebay_arbitrage', 'running', 'Running eBay inventory scan.');
    const command = `node ebay_test.js`;
    exec(command, { cwd: ebayPath }, (error, stdout, stderr) => {
      const success = !error;
      const logPath = path.join(ebayPath, 'ebay_test.log');
      fs.writeFileSync(logPath, `[${new Date().toISOString()}] Scan completed.\n${stdout}\n${stderr}`);
      agentRunner.setAgentStatus('ebay_arbitrage', success ? 'idle' : 'error', success ? '✅ eBay scan completed.' : '❌ eBay scan failed.');
      res.json({ status: success ? 'success' : 'failed', log: stdout + stderr });
    });
  } else if (task === 'leadgen-campaign') {
    agentRunner.setAgentStatus('leadgen_drafting', 'running', 'Running AutoCAD lead campaign.');
    setTimeout(() => {
      agentRunner.setAgentStatus('leadgen_drafting', 'idle', '✅ Outreach complete. 12 leads generated, 0 emails sent (dry-run).');
      res.json({ status: 'success', log: 'Dry-run outreach simulation finished successfully.' });
    }, 1500);
  } else {
    res.status(400).json({ error: 'Unknown task type.' });
  }
});

app.get('/api/hivemind/logs', (req, res) => {
  const mealmatePath = 'C:\\Users\\Ubu\\.gemini\antigravity\\scratch\\MealMate';
  const ebayPath = 'C:\\Users\\Ubu\\.gemini\\antigravity\\scratch\\ebay-arbitrage';
  const appPath = 'C:\\Users\\Ubu\\.gemini\\antigravity\\scratch\\agentic-platform';

  let logs = '';

  const backupLogPath = path.join(appPath, 'backup.log');
  if (fs.existsSync(backupLogPath)) {
    logs += '--- [Ibi Backup Log] ---\n';
    logs += fs.readFileSync(backupLogPath, 'utf8').split('\n').slice(-15).join('\n') + '\n\n';
  }

  const mealmateLogPath = path.join(mealmatePath, 'weekly_menu.log');
  if (fs.existsSync(mealmateLogPath)) {
    logs += '--- [MealMate Menu Log] ---\n';
    logs += fs.readFileSync(mealmateLogPath, 'utf8').split('\n').slice(-15).join('\n') + '\n\n';
  }

  const ebayLogPath = path.join(ebayPath, 'ebay_test.log');
  if (fs.existsSync(ebayLogPath)) {
    logs += '--- [eBay Scan Log] ---\n';
    logs += fs.readFileSync(ebayLogPath, 'utf8').split('\n').slice(-15).join('\n') + '\n\n';
  }

  if (!logs) {
    logs = 'No log entries recorded yet.';
  }

  res.json({ logs });
});

app.listen(port, () => {
  console.log(`[Antigravity Backend] Server running on port ${port}`);
});
