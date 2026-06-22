"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const agentRunner_1 = require("./agentRunner");
const cronManager_1 = require("./cronManager");
const tools_1 = require("./tools");
const discordBot_1 = require("./discordBot");
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const repoPath = 'C:\\Users\\Ubu\\.gemini\\antigravity\\scratch\\agentic-platform';
const agentRunner = new agentRunner_1.AgentRunner();
const cronManager = new cronManager_1.CronManager(repoPath);
const docManager = new tools_1.DocManager(repoPath);
const discordBotManager = new discordBot_1.DiscordBotManager(repoPath, agentRunner, cronManager, docManager);
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
    }
    else {
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
    }
    catch (e) {
        agentRunner.setAgentStatus('ibi', 'error', `❌ Backup failed: ${e.message}`);
        res.status(500).json({ error: e.message });
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
    }
    catch (e) {
        res.status(500).json({ error: e.message });
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
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.listen(port, () => {
    console.log(`[Antigravity Backend] Server running on port ${port}`);
});
