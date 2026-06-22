import express from 'express';
import cors from 'cors';
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

app.listen(port, () => {
  console.log(`[Antigravity Backend] Server running on port ${port}`);
});
