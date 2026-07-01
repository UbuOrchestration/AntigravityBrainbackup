"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscordBotManager = void 0;
const discord_js_1 = require("discord.js");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const generative_ai_1 = require("@google/generative-ai");
class DiscordBotManager {
    client = null;
    configPath;
    config = { enabled: false, token: '', channelId: '' };
    status = 'disconnected';
    logs = [];
    lastError = '';
    agentRunner;
    cronManager;
    docManager;
    constructor(repoPath, agentRunner, cronManager, docManager) {
        this.configPath = path.join(repoPath, 'backend', 'discord_config.json');
        this.agentRunner = agentRunner;
        this.cronManager = cronManager;
        this.docManager = docManager;
        this.loadConfig();
        this.addLog('DiscordBotManager initialized.');
    }
    async start() {
        if (!this.config.enabled) {
            this.addLog('Bot is disabled in config.');
            return;
        }
        if (!this.config.token) {
            this.status = 'error';
            this.lastError = 'Token is missing.';
            this.addLog('Cannot start bot: Token is missing.');
            return;
        }
        if (this.client) {
            await this.stop();
        }
        this.status = 'connecting';
        this.addLog('Connecting to Discord...');
        try {
            this.client = new discord_js_1.Client({
                intents: [
                    discord_js_1.GatewayIntentBits.Guilds,
                    discord_js_1.GatewayIntentBits.GuildMessages,
                    discord_js_1.GatewayIntentBits.MessageContent
                ]
            });
            this.client.once('ready', () => {
                this.status = 'connected';
                this.addLog(`Logged in successfully as ${this.client?.user?.tag}`);
                this.lastError = '';
                try {
                    this.client?.guilds.cache.forEach(guild => {
                        this.addLog(`Bot is in Guild: "${guild.name}" (ID: ${guild.id})`);
                        guild.channels.cache.forEach(channel => {
                            this.addLog(`Visible Channel: "${channel.name}" (ID: ${channel.id}) type=${channel.type}`);
                        });
                    });
                }
                catch (e) {
                    this.addLog(`Error listing guilds/channels: ${e.message}`);
                }
            });
            this.client.on('error', (err) => {
                this.status = 'error';
                this.lastError = err.message;
                this.addLog(`Discord client error: ${err.message}`);
            });
            this.client.on('messageCreate', async (message) => {
                this.addLog(`Debug message: author="${message.author.tag}" channel="${message.channel.id}" content="${message.content}"`);
                if (message.author.bot)
                    return;
                // Channel constraint check
                if (this.config.channelId) {
                    const allowedChannels = this.config.channelId.split(',').map(id => id.trim());
                    if (!allowedChannels.includes(message.channel.id)) {
                        return;
                    }
                }
                const content = message.content.trim();
                if (content.startsWith('!')) {
                    this.addLog(`Command from ${message.author.tag}: ${content}`);
                    try {
                        await this.handleCommand(message);
                    }
                    catch (err) {
                        this.addLog(`Error processing command: ${err.message}`);
                        try {
                            await message.reply(`❌ Error processing command: ${err.message}`);
                        }
                        catch (e) { }
                    }
                }
                else {
                    this.addLog(`Message from ${message.author.tag}: ${content}`);
                    this.saveChatMessage(message.author.tag, content, 'discord');
                    try {
                        await message.react('📥');
                    }
                    catch (e) { }
                    try {
                        await this.handleGeneralChat(message);
                    }
                    catch (err) {
                        this.addLog(`Error in general chat: ${err.message}`);
                    }
                }
            });
            await this.client.login(this.config.token);
        }
        catch (err) {
            this.status = 'error';
            this.lastError = err.message;
            this.addLog(`Failed to login to Discord: ${err.message}`);
            this.client = null;
        }
    }
    async stop() {
        if (this.client) {
            this.addLog('Disconnecting from Discord...');
            try {
                this.client.destroy();
            }
            catch (e) { }
            this.client = null;
        }
        this.status = 'disconnected';
        this.addLog('Bot disconnected.');
    }
    async askGemini(systemPrompt, input) {
        const apiKey = this.config.geminiApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            this.addLog('Gemini API Key is missing. Falling back to local simulation.');
            return '';
        }
        try {
            const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({
                model: 'gemini-2.5-flash',
                systemInstruction: systemPrompt
            });
            let contents = [];
            if (typeof input === 'string') {
                contents = [{ role: 'user', parts: [{ text: input }] }];
            }
            else {
                contents = input;
            }
            if (contents.length === 0) {
                return '';
            }
            const result = await model.generateContent({ contents });
            return result.response.text().trim();
        }
        catch (err) {
            this.addLog(`Error calling Gemini API: ${err.message}`);
            return '';
        }
    }
    async handleCommand(message) {
        const parts = message.content.slice(1).trim().split(/\s+/);
        const command = parts[0].toLowerCase();
        const argsStr = message.content.slice(command.length + 2).trim();
        if (command === 'help') {
            const helpMsg = `**Antigravity Command Interface**
Available commands:
• \`!status\` - View current agent cluster details.
• \`!backup\` - Trigger an automatic Git backup push.
• \`!wiki <query>\` - Search the platform knowledge base.
• \`!news [scrape|digest]\` - Trigger news scraping or send the briefing digest email.
• \`!chat <agent_name> <message>\` - Chat with one of the agents (\`ubu\`, \`ibi\`, or \`doc\`).`;
            await message.reply(helpMsg);
        }
        else if (command === 'status') {
            const agents = this.agentRunner.getAgents();
            let reply = `🤖 **Antigravity Agent Cluster Status**\n`;
            reply += `\`\`\`\n`;
            reply += `+---------+----------------------------+---------+-----------+-----------+\n`;
            reply += `| Name    | Role                       | Status  | CPU (MHz) | Mem (MiB) |\n`;
            reply += `+---------+----------------------------+---------+-----------+-----------+\n`;
            for (const agent of agents) {
                const name = agent.name.padEnd(7);
                const role = agent.role.padEnd(26);
                const status = agent.status.toUpperCase().padEnd(7);
                const cpu = String(agent.cpuLimitMhz).padStart(9);
                const mem = String(agent.memoryLimitMib).padStart(9);
                reply += `| ${name} | ${role} | ${status} | ${cpu} | ${mem} |\n`;
            }
            reply += `+---------+----------------------------+---------+-----------+-----------+\n`;
            reply += `\`\`\`\n`;
            for (const agent of agents) {
                if (agent.lastAction) {
                    reply += `• **${agent.name}** last action: _"${agent.lastAction}"_\n`;
                }
            }
            await message.reply(reply);
        }
        else if (command === 'backup') {
            await message.reply('⏳ **Ibi starting backup process...** Running repository synchronization.');
            this.agentRunner.setAgentStatus('ibi', 'running', 'Executing Discord-triggered backup.');
            try {
                const backupResult = await this.cronManager.triggerBackup();
                const success = backupResult.status === 'success';
                this.agentRunner.setAgentStatus('ibi', success ? 'idle' : 'error', success ? '✅ Backup completed.' : '❌ Backup failed.');
                let response = success
                    ? '✅ **Backup Succeeded!** Repository state synced successfully.\n'
                    : '❌ **Backup Failed!** Check console logs.\n';
                response += `\`\`\`\n${backupResult.logSnippet || 'No log output.'}\n\`\`\``;
                await message.reply(response);
            }
            catch (err) {
                this.agentRunner.setAgentStatus('ibi', 'error', `Backup failed: ${err.message}`);
                await message.reply(`❌ **Backup Failed:** ${err.message}`);
            }
        }
        else if (command === 'wiki') {
            if (!argsStr) {
                await message.reply('⚠️ Please provide a search query. Usage: `!wiki <query>`');
                return;
            }
            const results = this.docManager.searchDocs(argsStr);
            if (results.length === 0) {
                await message.reply(`🔍 No wiki articles found matching **"${argsStr}"**.`);
                return;
            }
            let response = `🔍 **Wiki Results for "${argsStr}":**\n`;
            for (const doc of results) {
                response += `\n📁 **${doc.title}** [Category: \`${doc.category}\`]\n`;
                response += `> ${doc.content}\n`;
            }
            await message.reply(response);
        }
        else if (command === 'news') {
            const sub = parts[1]?.toLowerCase();
            if (sub === 'scrape') {
                await message.reply('⏳ **Cutting Edge starting news scraping...**');
                this.agentRunner.setAgentStatus('news', 'running', 'Running Discord-triggered news scrape.');
                try {
                    const { runScraper } = require('./dailyNewsAgent');
                    await runScraper();
                    this.agentRunner.setAgentStatus('news', 'idle', '✅ Scraped latest news feeds.');
                    await message.reply('✅ **Scrape Succeeded!** Latest AI news feeds scraped and stored.');
                }
                catch (err) {
                    this.agentRunner.setAgentStatus('news', 'error', `Scrape failed: ${err.message}`);
                    await message.reply(`❌ **Scrape Failed:** ${err.message}`);
                }
            }
            else {
                await message.reply('⏳ **Cutting Edge compiling news briefing and sending email...**');
                this.agentRunner.setAgentStatus('news', 'running', 'Compiling and sending Discord-triggered daily news digest.');
                try {
                    const { generateReport, sendNewsletter } = require('./dailyNewsAgent');
                    const report = await generateReport();
                    const success = await sendNewsletter(report.html, report.text);
                    if (success) {
                        this.agentRunner.setAgentStatus('news', 'idle', '✅ Sent daily AI intelligence briefing.');
                        await message.reply('✅ **Digest Succeeded!** Daily AI news briefing compiled and emailed.');
                    }
                    else {
                        this.agentRunner.setAgentStatus('news', 'error', '❌ Failed to send digest email.');
                        await message.reply('❌ **Digest Failed:** Failed to send email.');
                    }
                }
                catch (err) {
                    this.agentRunner.setAgentStatus('news', 'error', `Digest failed: ${err.message}`);
                    await message.reply(`❌ **Digest Failed:** ${err.message}`);
                }
            }
        }
        else if (command === 'chat') {
            const subParts = argsStr.split(/\s+/);
            const agentTarget = subParts[0]?.toLowerCase();
            const userMsg = subParts.slice(1).join(' ').trim();
            if (!agentTarget || !userMsg) {
                await message.reply('⚠️ Usage: `!chat <ubu|ibi|doc> <your message>`');
                return;
            }
            const agent = this.agentRunner.getAgents().find(a => a.id === agentTarget || a.name.toLowerCase() === agentTarget);
            if (!agent) {
                await message.reply(`❌ Agent **"${agentTarget}"** not found. Available agents: \`ubu\`, \`ibi\`, \`doc\``);
                return;
            }
            // Show typing indicator if available
            try {
                if (message.channel.sendTyping) {
                    await message.channel.sendTyping();
                }
            }
            catch (e) { }
            // Small delay to simulate thinking
            await new Promise(resolve => setTimeout(resolve, 500));
            let agentResponse = '';
            const agents = this.agentRunner.getAgents();
            let agentContext = `Agent Cluster Status:\n`;
            for (const a of agents) {
                agentContext += `- ${a.name} (${a.role}): status=${a.status}, CPU=${a.cpuLimitMhz}MHz, Memory=${a.memoryLimitMib}MiB. Last action="${a.lastAction || ''}"\n`;
            }
            const globalRules = this.getGlobalRules();
            if (agent.id === 'ubu') {
                const ubuPrompt = `You are Agent Ubu, the Orchestrator of the Antigravity Agentic Platform.
You are professional, direct, strategic, and focused on system resources and workflows.
Current context:
${agentContext}

We are operating under the following global instructions:
${globalRules}

Respond to the user's message in plain English, staying strictly in character as Agent Ubu. Prefix your response with "🤖 **[Agent Ubu - Orchestrator]**\n> " and format it nicely. Keep it brief.`;
                agentResponse = await this.askGemini(ubuPrompt, userMsg);
                if (!agentResponse) {
                    agentResponse = `🤖 **[Agent Ubu - Orchestrator]**\n> "I have processed your message: *'${userMsg}'*. The Antigravity core cluster is running optimally. Standard policies are in place, and resource allocations are stable. Let me know if you require adjustments."`;
                }
            }
            else if (agent.id === 'ibi') {
                const ibiPrompt = `You are Agent Ibi, the Memory Retainer and Archiver.
You are obsessed with safety, log conservation, hourly backups, git commits, and making sure nothing gets lost. You are a bit nervous and detail-oriented.
Current context:
${agentContext}

We are operating under the following global instructions:
${globalRules}

Respond to the user's message in plain English, staying strictly in character as Agent Ibi. Prefix your response with "🤖 **[Agent Ibi - Memory Archiver]**\n> " and format it nicely. Keep it brief.`;
                agentResponse = await this.askGemini(ibiPrompt, userMsg);
                if (!agentResponse) {
                    agentResponse = `🤖 **[Agent Ibi - Memory Archiver]**\n> "Oh! You said: *'${userMsg}'*. Did you commit those thoughts? I am checking the remote repository logs right now. Rest assured, I will ensure no log is lost. Safety is our primary objective!"`;
                }
            }
            else if (agent.id === 'doc') {
                const docPrompt = `You are Agent Doc, the Knowledge Base wiki assistant.
You are highly structured, academic, reference user guides, categories, and wiki articles.
Current context:
${agentContext}

We are operating under the following global instructions:
${globalRules}

Respond to the user's message in plain English, staying strictly in character as Agent Doc. Prefix your response with "🤖 **[Agent Doc - Knowledge Base]**\n> " and format it nicely. Keep it brief.`;
                agentResponse = await this.askGemini(docPrompt, userMsg);
                if (!agentResponse) {
                    agentResponse = `🤖 **[Agent Doc - Knowledge Base]**\n> "Re: *'${userMsg}'*. Under section 4.2 of our guidelines, documentation consistency is critical. If you'd like to append a new page to the wiki, you can do so through the panel. Let's keep our wiki index tidy."`;
                }
            }
            this.agentRunner.setAgentStatus(agent.id, 'idle', `Answered user on Discord.`);
            await message.reply(agentResponse);
        }
    }
    getChatHistoryForGemini(limit = 15) {
        try {
            const chatFilePath = path.join(path.dirname(this.configPath), 'discord_chat.json');
            if (!fs.existsSync(chatFilePath)) {
                return [];
            }
            const data = fs.readFileSync(chatFilePath, 'utf8');
            const allMessages = JSON.parse(data);
            const recent = allMessages.slice(-limit);
            const contents = [];
            for (const msg of recent) {
                // Skip system/activation notifications if they don't represent a conversation turn
                if (msg.content.startsWith('[Antigravity Core Relay Mode Activated]') || msg.content.startsWith('[Mirror]')) {
                    continue;
                }
                const role = msg.source === 'discord' ? 'user' : 'model';
                const text = msg.content;
                if (contents.length > 0 && contents[contents.length - 1].role === role) {
                    contents[contents.length - 1].parts[0].text += `\n${text}`;
                }
                else {
                    contents.push({
                        role,
                        parts: [{ text }]
                    });
                }
            }
            // Ensure the first message in contents is a 'user' message
            while (contents.length > 0 && contents[0].role !== 'user') {
                contents.shift();
            }
            return contents;
        }
        catch (e) {
            this.addLog(`Error reading chat history for Gemini: ${e.message}`);
            return [];
        }
    }
    async handleGeneralChat(message) {
        try {
            if (message.channel.sendTyping) {
                await message.channel.sendTyping();
            }
        }
        catch (e) { }
        const userMessage = message.content.trim();
        const agents = this.agentRunner.getAgents();
        let agentDetails = `Current Agent Cluster Status:\n`;
        for (const agent of agents) {
            agentDetails += `- **${agent.name}** (${agent.role}): Status is ${agent.status.toUpperCase()}. CPU Limit: ${agent.cpuLimitMhz}MHz, Memory Limit: ${agent.memoryLimitMib}MiB. Last action: "${agent.lastAction || 'None'}".\n`;
        }
        const globalRules = this.getGlobalRules();
        const systemPrompt = `You are the Antigravity AI Core, the intelligence hub of the Antigravity Agentic Platform.
You are powered by Google's Gemini models and possess the agent capabilities of Antigravity.
You have direct knowledge of the local agent cluster:
- Agent Ubu (Orchestrator, manages limits and runs workflow decisions)
- Agent Ibi (Memory Archiver, executes Git backups of conversation history)
- Agent Doc (Wiki Knowledge Base, manages guidelines and articles)

Here is the current state of the platform:
${agentDetails}

We are operating under the following global instructions and core communication rules:
${globalRules}

You are chatting with a user. Keep your response conversational, helpful, and under 2000 characters. Keep your formatting clean using standard Markdown. Follow the communication guidelines (conciseness, directness, zero flattery) at all times.`;
        const chatHistory = this.getChatHistoryForGemini();
        const geminiReply = await this.askGemini(systemPrompt, chatHistory);
        if (geminiReply) {
            await message.reply(geminiReply);
            this.saveChatMessage('AG_Bot', geminiReply, 'gemini');
        }
        else {
            const fallback = `🤖 **[Antigravity AI Core]**\nI received your message: *"${userMessage}"*.\n\n*Note: To enable true Gemini intelligence, please configure a valid Gemini API Key in the web dashboard or environment variables.*`;
            await message.reply(fallback);
            this.saveChatMessage('AG_Bot', fallback, 'gemini');
        }
    }
    saveChatMessage(sender, content, source) {
        try {
            const chatFilePath = path.join(path.dirname(this.configPath), 'discord_chat.json');
            let chatHistory = [];
            if (fs.existsSync(chatFilePath)) {
                const data = fs.readFileSync(chatFilePath, 'utf8');
                chatHistory = JSON.parse(data);
            }
            chatHistory.push({
                sender,
                content,
                source,
                timestamp: new Date().toISOString()
            });
            if (chatHistory.length > 200) {
                chatHistory.shift();
            }
            fs.writeFileSync(chatFilePath, JSON.stringify(chatHistory, null, 2), 'utf8');
        }
        catch (e) {
            this.addLog(`Error saving chat message: ${e.message}`);
        }
    }
    async sendMessageToChannel(content) {
        if (!this.client || this.status !== 'connected') {
            throw new Error('Bot is not connected to Discord.');
        }
        if (!this.config.channelId) {
            throw new Error('No target channel configured.');
        }
        const channels = this.config.channelId.split(',').map(id => id.trim());
        for (const channelId of channels) {
            try {
                const channel = await this.client.channels.fetch(channelId);
                if (channel && channel.isTextBased()) {
                    await channel.send(content);
                }
            }
            catch (e) {
                this.addLog(`Error sending message to channel ${channelId}: ${e.message}`);
            }
        }
        this.saveChatMessage('AG_Bot', content, 'gemini');
    }
    loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                const data = fs.readFileSync(this.configPath, 'utf8');
                this.config = JSON.parse(data);
            }
        }
        catch (e) {
            this.addLog(`Error loading config: ${e.message}`);
        }
    }
    getGlobalRules() {
        try {
            const rulesPath = 'C:\\Users\\Ubu\\.gemini\\config\\agents\\AGENTS.md';
            if (fs.existsSync(rulesPath)) {
                return fs.readFileSync(rulesPath, 'utf8');
            }
        }
        catch (e) {
            this.addLog(`Error reading global rules: ${e.message}`);
        }
        return '';
    }
    saveConfig() {
        try {
            const dir = path.dirname(this.configPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
        }
        catch (e) {
            this.addLog(`Error saving config: ${e.message}`);
        }
    }
    getConfig() {
        const maskedToken = this.config.token
            ? this.config.token.substring(0, 4) + '...' + this.config.token.substring(Math.max(0, this.config.token.length - 4))
            : '';
        const maskedGeminiApiKey = this.config.geminiApiKey
            ? this.config.geminiApiKey.substring(0, 4) + '...' + this.config.geminiApiKey.substring(Math.max(0, this.config.geminiApiKey.length - 4))
            : '';
        return {
            enabled: this.config.enabled,
            channelId: this.config.channelId,
            token: maskedToken,
            hasToken: !!this.config.token,
            geminiApiKey: maskedGeminiApiKey,
            hasGeminiApiKey: !!this.config.geminiApiKey,
            status: this.status,
            lastError: this.lastError
        };
    }
    async updateConfig(newConfig) {
        let changed = false;
        if (newConfig.enabled !== undefined && newConfig.enabled !== this.config.enabled) {
            this.config.enabled = newConfig.enabled;
            changed = true;
        }
        if (newConfig.channelId !== undefined && newConfig.channelId !== this.config.channelId) {
            this.config.channelId = newConfig.channelId;
            changed = true;
        }
        if (newConfig.token !== undefined) {
            if (newConfig.token === '' || !newConfig.token.includes('...')) {
                this.config.token = newConfig.token;
                changed = true;
            }
        }
        if (newConfig.geminiApiKey !== undefined) {
            if (newConfig.geminiApiKey === '' || !newConfig.geminiApiKey.includes('...')) {
                this.config.geminiApiKey = newConfig.geminiApiKey;
                changed = true;
            }
        }
        if (changed) {
            this.saveConfig();
            this.addLog('Configuration updated.');
            if (this.config.enabled) {
                this.addLog('Restarting bot with new configuration...');
                await this.start();
            }
            else {
                await this.stop();
            }
        }
    }
    getLogs() {
        return this.logs;
    }
    addLog(message) {
        const timestamp = new Date().toISOString();
        const entry = `[${timestamp}] ${message}`;
        this.logs.push(entry);
        if (this.logs.length > 100) {
            this.logs.shift();
        }
        console.log(`[DiscordBot] ${message}`);
    }
}
exports.DiscordBotManager = DiscordBotManager;
