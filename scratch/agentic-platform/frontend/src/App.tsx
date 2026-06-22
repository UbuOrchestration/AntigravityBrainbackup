import { useState, useEffect } from 'react';

interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'running' | 'error';
  cpuLimitMhz: number;
  memoryLimitMib: number;
  lastAction?: string;
  lastActive?: string;
}

interface BackupStatus {
  lastRun?: string;
  status: 'idle' | 'success' | 'failed' | 'running';
  logSnippet?: string;
}

interface DocItem {
  id: string;
  title: string;
  category: string;
  content: string;
}

interface DiscordConfigState {
  enabled: boolean;
  channelId: string;
  token: string;
  hasToken: boolean;
  geminiApiKey: string;
  hasGeminiApiKey: boolean;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastError: string;
}

export default function App() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [backupStatus, setBackupStatus] = useState<BackupStatus>({ status: 'idle', logSnippet: 'Loading...' });
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [newCpu, setNewCpu] = useState(500);
  const [newMem, setNewMem] = useState(256);
  const [loadingBackup, setLoadingBackup] = useState(false);

  // New Wiki Page form
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('guides');
  const [newContent, setNewContent] = useState('');

  // Discord State
  const [discordConfig, setDiscordConfig] = useState<DiscordConfigState>({
    enabled: false,
    channelId: '',
    token: '',
    hasToken: false,
    geminiApiKey: '',
    hasGeminiApiKey: false,
    status: 'disconnected',
    lastError: ''
  });
  const [discordTokenInput, setDiscordTokenInput] = useState('');
  const [discordGeminiApiKeyInput, setDiscordGeminiApiKeyInput] = useState('');
  const [discordChannelInput, setDiscordChannelInput] = useState('');
  const [discordLogs, setDiscordLogs] = useState<string[]>([]);
  const [savingDiscord, setSavingDiscord] = useState(false);

  // Hivemind State
  const [hivemindStatus, setHivemindStatus] = useState<any>({
    mealmate: { status: 'offline', stockpileItems: 0, lastMenuDate: 'N/A' },
    ebay: { status: 'not_configured', activeListings: 0, hasToken: false },
    leadgen: { status: 'planned', leadsCount: 0, campaignStatus: 'idle' },
    backup: { status: 'idle' }
  });
  const [hivemindLogs, setHivemindLogs] = useState<string>('Loading Hivemind logs...');
  const [triggeringTask, setTriggeringTask] = useState<string | null>(null);

  const backendUrl = 'http://localhost:3001';

  useEffect(() => {
    fetchAgents();
    fetchBackupStatus();
    fetchDocs();
    fetchDiscordConfig();
    fetchDiscordLogs();
    fetchHivemindStatus();
    fetchHivemindLogs();
    const interval = setInterval(() => {
      fetchAgents();
      fetchBackupStatus();
      fetchDiscordConfig();
      fetchDiscordLogs();
      fetchHivemindStatus();
      fetchHivemindLogs();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchHivemindStatus = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/hivemind/status`);
      const data = await res.json();
      setHivemindStatus(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHivemindLogs = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/hivemind/logs`);
      const data = await res.json();
      setHivemindLogs(data.logs);
    } catch (e) {
      console.error(e);
    }
  };

  const triggerHivemindTask = async (task: string) => {
    setTriggeringTask(task);
    try {
      const res = await fetch(`${backendUrl}/api/hivemind/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task })
      });
      if (res.ok) {
        fetchHivemindStatus();
        fetchHivemindLogs();
        fetchAgents();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTriggeringTask(null);
    }
  };

  const fetchAgents = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/agents`);
      const data = await res.json();
      setAgents(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBackupStatus = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/backup/status`);
      const data = await res.json();
      setBackupStatus(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDocs = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/docs`);
      const data = await res.json();
      setDocs(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDiscordConfig = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/discord/config`);
      const data = await res.json();
      setDiscordConfig(data);
      // Pre-fill inputs if empty
      setDiscordChannelInput(prev => prev || data.channelId);
      setDiscordTokenInput(prev => prev || (data.hasToken ? data.token : ''));
      setDiscordGeminiApiKeyInput(prev => prev || (data.hasGeminiApiKey ? data.geminiApiKey : ''));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDiscordLogs = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/discord/logs`);
      const data = await res.json();
      setDiscordLogs(data);
    } catch (e) {
      console.error(e);
    }
  };

  const saveDiscordConfig = async (enabledOverride?: boolean) => {
    setSavingDiscord(true);
    try {
      const nextEnabled = enabledOverride !== undefined ? enabledOverride : discordConfig.enabled;
      const res = await fetch(`${backendUrl}/api/discord/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: nextEnabled,
          channelId: discordChannelInput,
          token: discordTokenInput,
          geminiApiKey: discordGeminiApiKeyInput
        })
      });
      if (res.ok) {
        const data = await res.json();
        setDiscordConfig(data);
        if (data.token) {
          setDiscordTokenInput(data.token);
        }
        if (data.geminiApiKey) {
          setDiscordGeminiApiKeyInput(data.geminiApiKey);
        }
        fetchDiscordLogs();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingDiscord(false);
    }
  };

  const saveLimits = async (id: string) => {
    try {
      const res = await fetch(`${backendUrl}/api/agents/${id}/limits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpuLimitMhz: newCpu, memoryLimitMib: newMem })
      });
      if (res.ok) {
        fetchAgents();
        setEditingAgent(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const triggerBackup = async () => {
    setLoadingBackup(true);
    try {
      const res = await fetch(`${backendUrl}/api/backup/trigger`, { method: 'POST' });
      const data = await res.json();
      setBackupStatus(data);
      fetchAgents();
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBackup(false);
    }
  };

  const createWiki = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newContent) return;
    try {
      const res = await fetch(`${backendUrl}/api/docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, category: newCategory, content: newContent })
      });
      if (res.ok) {
        fetchDocs();
        setNewTitle('');
        setNewContent('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredDocs = docs.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logoContainer}>
          <div style={styles.logoGlow}></div>
          <h1 style={styles.title}>ANTIGRAVITY</h1>
        </div>
        <div style={styles.statusBadge}>
          <span style={styles.statusDot}></span>
          AUTONOMOUS CORE ACTIVE
        </div>
      </header>

      {/* Agents Section */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Agent Cluster Status</h2>
        <div style={styles.agentGrid}>
          {agents.map((agent) => (
            <div key={agent.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.agentName}>{agent.name}</h3>
                <span style={{
                  ...styles.badge,
                  backgroundColor: agent.status === 'running' ? '#1fb5ad' : agent.status === 'error' ? '#ef5350' : '#455a64'
                }}>
                  {agent.status.toUpperCase()}
                </span>
              </div>
              <p style={styles.role}>{agent.role}</p>
              
              <div style={styles.metrics}>
                <div style={styles.metric}>
                  <span style={styles.metricLabel}>CPU limit:</span>
                  <span style={styles.metricVal}>{agent.cpuLimitMhz} MHz</span>
                </div>
                <div style={styles.metric}>
                  <span style={styles.metricLabel}>Memory limit:</span>
                  <span style={styles.metricVal}>{agent.memoryLimitMib} MiB</span>
                </div>
              </div>

              {agent.lastAction && (
                <div style={styles.lastActionBox}>
                  <strong>Last action:</strong> {agent.lastAction}
                </div>
              )}

              {editingAgent?.id === agent.id ? (
                <div style={styles.editForm}>
                  <label style={styles.label}>CPU Limit (MHz)</label>
                  <input
                    type="range" min="100" max="2000" step="50"
                    value={newCpu} onChange={(e) => setNewCpu(Number(e.target.value))}
                    style={styles.rangeInput}
                  />
                  <div style={styles.rangeVal}>{newCpu} MHz</div>

                  <label style={styles.label}>Memory Limit (MiB)</label>
                  <input
                    type="range" min="64" max="2048" step="64"
                    value={newMem} onChange={(e) => setNewMem(Number(e.target.value))}
                    style={styles.rangeInput}
                  />
                  <div style={styles.rangeVal}>{newMem} MiB</div>

                  <div style={styles.buttonGroup}>
                    <button style={styles.saveBtn} onClick={() => saveLimits(agent.id)}>Save</button>
                    <button style={styles.cancelBtn} onClick={() => setEditingAgent(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button style={styles.btn} onClick={() => {
                  setEditingAgent(agent);
                  setNewCpu(agent.cpuLimitMhz);
                  setNewMem(agent.memoryLimitMib);
                }}>Scale Allocation</button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Hivemind Control Center */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Hivemind Control Center</h2>
        <div style={styles.agentGrid}>
          {/* MealMate Card */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.agentName}>MealMate</h3>
              <span style={{
                ...styles.badge,
                backgroundColor: hivemindStatus.mealmate.status === 'active' ? '#1fb5ad' : '#ef5350'
              }}>
                {hivemindStatus.mealmate.status.toUpperCase()}
              </span>
            </div>
            <p style={styles.role}>Meal Planner & Automated Shopping</p>
            <div style={styles.metrics}>
              <div style={styles.metric}>
                <span style={styles.metricLabel}>Stockpile Items:</span>
                <span style={styles.metricVal}>{hivemindStatus.mealmate.stockpileItems} items</span>
              </div>
              <div style={styles.metric}>
                <span style={styles.metricLabel}>Last Menu:</span>
                <span style={styles.metricVal}>{hivemindStatus.mealmate.lastMenuDate}</span>
              </div>
            </div>
            <button
              style={{ ...styles.btn, marginTop: 15 }}
              onClick={() => triggerHivemindTask('mealmate-weekly')}
              disabled={triggeringTask === 'mealmate-weekly'}
            >
              {triggeringTask === 'mealmate-weekly' ? 'Processing...' : 'Trigger Sunday Menu Flow'}
            </button>
          </div>

          {/* eBay Arbitrage Card */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.agentName}>eBay Arbitrage</h3>
              <span style={{
                ...styles.badge,
                backgroundColor: hivemindStatus.ebay.status === 'configured' ? '#1fb5ad' : '#faa61a'
              }}>
                {hivemindStatus.ebay.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <p style={styles.role}>RV & Demographics Arbitrage Shop</p>
            <div style={styles.metrics}>
              <div style={styles.metric}>
                <span style={styles.metricLabel}>Active Listings:</span>
                <span style={styles.metricVal}>{hivemindStatus.ebay.activeListings} listings</span>
              </div>
              <div style={styles.metric}>
                <span style={styles.metricLabel}>Credentials:</span>
                <span style={styles.metricVal}>{hivemindStatus.ebay.hasToken ? 'Connected' : 'Missing Token'}</span>
              </div>
            </div>
            <button
              style={{ ...styles.btn, marginTop: 15 }}
              onClick={() => triggerHivemindTask('ebay-sync')}
              disabled={triggeringTask === 'ebay-sync'}
            >
              {triggeringTask === 'ebay-sync' ? 'Scanning...' : 'Trigger Inventory Scan'}
            </button>
          </div>

          {/* AutoCAD Lead Gen Card */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.agentName}>KANNEM CAD</h3>
              <span style={{
                ...styles.badge,
                backgroundColor: hivemindStatus.leadgen.status === 'active' ? '#1fb5ad' : '#455a64'
              }}>
                {hivemindStatus.leadgen.status.toUpperCase()}
              </span>
            </div>
            <p style={styles.role}>Outreach & Drafting Leads</p>
            <div style={styles.metrics}>
              <div style={styles.metric}>
                <span style={styles.metricLabel}>Total Leads:</span>
                <span style={styles.metricVal}>{hivemindStatus.leadgen.leadsCount} leads</span>
              </div>
              <div style={styles.metric}>
                <span style={styles.metricLabel}>Campaign Status:</span>
                <span style={styles.metricVal}>{hivemindStatus.leadgen.campaignStatus}</span>
              </div>
            </div>
            <button
              style={{ ...styles.btn, marginTop: 15 }}
              onClick={() => triggerHivemindTask('leadgen-campaign')}
              disabled={triggeringTask === 'leadgen-campaign'}
            >
              {triggeringTask === 'leadgen-campaign' ? 'Sending...' : 'Trigger Lead Campaign'}
            </button>
          </div>
        </div>

        {/* Unified Hivemind Console */}
        <div style={{ ...styles.card, marginTop: 25 }}>
          <h4 style={styles.subTitle}>Unified Hivemind Console Log</h4>
          <pre style={{ ...styles.terminal, minHeight: 250, fontSize: '0.85rem' }}>{hivemindLogs}</pre>
        </div>
      </section>

      <div style={styles.twoColumnGrid}>
        {/* Memory Backups */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Ibi Memory Archiver</h2>
          <div style={styles.card}>
            <div style={styles.backupHeader}>
              <div>
                <strong>Git Repository Backup Status</strong>
                <div style={{ color: backupStatus.status === 'success' ? '#66fcf1' : backupStatus.status === 'failed' ? '#ef5350' : '#888', marginTop: 4 }}>
                  {backupStatus.status.toUpperCase()} {backupStatus.lastRun && `(Last run: ${backupStatus.lastRun})`}
                </div>
              </div>
              <button 
                style={{ ...styles.btn, margin: 0, opacity: loadingBackup ? 0.7 : 1 }} 
                onClick={triggerBackup}
                disabled={loadingBackup}
              >
                {loadingBackup ? 'Syncing...' : 'Backup Now'}
              </button>
            </div>
            
            <h4 style={styles.subTitle}>Console logs</h4>
            <pre style={styles.terminal}>{backupStatus.logSnippet}</pre>
          </div>
        </section>

        {/* Doc Wiki */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Doc Knowledge Base</h2>
          <div style={styles.card}>
            <input
              type="text"
              placeholder="Search wiki articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.textInput}
            />

            <div style={styles.wikiList}>
              {filteredDocs.map(doc => (
                <details key={doc.id} style={styles.wikiDetails}>
                  <summary style={styles.wikiSummary}>{doc.title} <span style={styles.wikiCat}>[{doc.category}]</span></summary>
                  <p style={styles.wikiContent}>{doc.content}</p>
                </details>
              ))}
            </div>

            <h4 style={styles.subTitle}>Add Wiki Page</h4>
            <form onSubmit={createWiki} style={styles.form}>
              <input
                type="text"
                placeholder="Article Title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                style={styles.textInput}
                required
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                style={styles.textInput}
              >
                <option value="guides">Guides</option>
                <option value="architecture">Architecture</option>
                <option value="cron">Cron & Tasks</option>
              </select>
              <textarea
                placeholder="Write page content..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                style={{ ...styles.textInput, minHeight: 80, fontFamily: 'inherit' }}
                required
              />
              <button type="submit" style={styles.btn}>Save Article</button>
            </form>
          </div>
        </section>

        {/* Discord Chat Integration */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Discord Chat Integration</h2>
          <div style={{ ...styles.card, border: discordConfig.enabled ? '1px solid #5865F2' : '1px solid #1f2833' }}>
            <div style={styles.discordHeader}>
              <div style={styles.discordStatusContainer}>
                <div style={{
                  ...styles.statusDot,
                  backgroundColor: discordConfig.status === 'connected' ? '#43b581' : 
                                   discordConfig.status === 'connecting' ? '#faa61a' : 
                                   discordConfig.status === 'error' ? '#f04747' : '#747f8d',
                  boxShadow: discordConfig.status === 'connected' ? '0 0 10px #43b581' :
                             discordConfig.status === 'connecting' ? '0 0 10px #faa61a' :
                             discordConfig.status === 'error' ? '0 0 10px #f04747' : 'none'
                }}></div>
                <strong style={{ color: '#fff', fontSize: '0.85rem' }}>
                  {discordConfig.status.toUpperCase()}
                </strong>
              </div>
              <div style={styles.toggleContainer}>
                <span style={{ color: '#8892b0', fontSize: '0.85rem', marginRight: 10 }}>Enable Bot</span>
                <button
                  type="button"
                  onClick={() => saveDiscordConfig(!discordConfig.enabled)}
                  disabled={savingDiscord}
                  style={{
                    ...styles.discordToggle,
                    backgroundColor: discordConfig.enabled ? '#5865F2' : '#2f3136'
                  }}
                >
                  <div style={{
                    ...styles.discordToggleKnob,
                    transform: discordConfig.enabled ? 'translateX(18px)' : 'translateX(0px)'
                  }}></div>
                </button>
              </div>
            </div>

            {discordConfig.lastError && (
              <div style={styles.discordErrorBox}>
                <strong>Connection Error:</strong> {discordConfig.lastError}
              </div>
            )}

            <div style={styles.discordForm}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={styles.label}>Bot Token</label>
                <input
                  type="password"
                  placeholder={discordConfig.hasToken ? '••••••••••••••••••••••••' : 'Paste Discord Bot Token'}
                  value={discordTokenInput}
                  onChange={(e) => setDiscordTokenInput(e.target.value)}
                  style={styles.textInput}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                <label style={styles.label}>Target Channel ID</label>
                <input
                  type="text"
                  placeholder="e.g. 123456789012345678"
                  value={discordChannelInput}
                  onChange={(e) => setDiscordChannelInput(e.target.value)}
                  style={styles.textInput}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                <label style={styles.label}>Gemini API Key (Optional)</label>
                <input
                  type="password"
                  placeholder={discordConfig.hasGeminiApiKey ? '••••••••••••••••••••••••' : 'Paste Gemini API Key'}
                  value={discordGeminiApiKeyInput}
                  onChange={(e) => setDiscordGeminiApiKeyInput(e.target.value)}
                  style={styles.textInput}
                />
              </div>

              <button
                type="button"
                onClick={() => saveDiscordConfig()}
                disabled={savingDiscord}
                style={{ ...styles.btn, borderColor: '#5865F2', color: '#5865F2', marginTop: 10 }}
              >
                {savingDiscord ? 'Saving Config...' : 'Update Credentials'}
              </button>
            </div>

            <h4 style={styles.subTitle}>Bot Activity Stream</h4>
            <pre style={{ ...styles.terminal, color: '#e3e5e8', borderColor: '#2f3136', backgroundColor: '#0e1015' }}>
              {discordLogs.length > 0 ? discordLogs.join('\n') : 'No activity logged yet.'}
            </pre>

            <details style={{ ...styles.wikiDetails, marginTop: 15, borderColor: '#2f3136' }}>
              <summary style={{ ...styles.wikiSummary, color: '#b9bbbe' }}>💡 Quick Setup Guide</summary>
              <div style={{ color: '#8892b0', fontSize: '0.85rem', lineHeight: '1.4', marginTop: 10 }}>
                1. Open the <strong>Discord Developer Portal</strong>.<br/>
                2. Create an Application and add a <strong>Bot</strong>.<br/>
                3. Enable <strong>Message Content Intent</strong> in the Bot section.<br/>
                4. Invite the bot to your server using the OAuth2 URL Generator (scope: <code>bot</code>, permissions: <code>Send Messages</code>, <code>Read Messages/View Channels</code>).<br/>
                5. Enable Developer Mode in Discord, right-click the target text channel, select <strong>Copy ID</strong>, and paste it above.<br/>
                <br/>
                <strong>Supported Chat Commands:</strong><br/>
                • <code>!status</code> - Lists agent metrics.<br/>
                • <code>!backup</code> - Manually runs git backup.<br/>
                • <code>!wiki &lt;query&gt;</code> - Searches documentation.<br/>
                • <code>!chat &lt;ubu|ibi|doc&gt; &lt;msg&gt;</code> - Speak to an agent.
              </div>
            </details>
          </div>
        </section>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '40px',
    borderBottom: '1px solid #1f2833',
    paddingBottom: '20px',
  },
  logoContainer: {
    position: 'relative',
  },
  logoGlow: {
    position: 'absolute',
    top: '-5px',
    left: '-5px',
    width: '100%',
    height: '100%',
    filter: 'blur(10px)',
    backgroundColor: '#66fcf1',
    opacity: 0.15,
  },
  title: {
    margin: 0,
    fontSize: '2rem',
    fontWeight: 700,
    letterSpacing: '3px',
    color: '#66fcf1',
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: '#1f2833',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#66fcf1',
    boxShadow: '0 0 10px rgba(102, 252, 241, 0.2)',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#66fcf1',
    boxShadow: '0 0 8px #66fcf1',
  },
  section: {
    marginBottom: '40px',
  },
  sectionTitle: {
    fontSize: '1.4rem',
    color: '#fff',
    marginBottom: '20px',
    fontWeight: 600,
  },
  agentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '24px',
  },
  card: {
    backgroundColor: '#151922',
    border: '1px solid #1f2833',
    borderRadius: '12px',
    padding: '24px',
    transition: 'all 0.3s ease',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  agentName: {
    margin: 0,
    fontSize: '1.25rem',
    color: '#fff',
    fontWeight: 600,
  },
  badge: {
    fontSize: '0.75rem',
    padding: '4px 10px',
    borderRadius: '12px',
    fontWeight: 600,
    color: '#fff',
  },
  role: {
    margin: '4px 0 20px 0',
    color: '#8892b0',
    fontSize: '0.9rem',
  },
  metrics: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '20px',
  },
  metric: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.9rem',
  },
  metricLabel: {
    color: '#8892b0',
  },
  metricVal: {
    color: '#fff',
    fontWeight: 500,
  },
  lastActionBox: {
    backgroundColor: '#0c0f16',
    border: '1px solid #1f2833',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '0.85rem',
    marginBottom: '20px',
    color: '#c5c6c7',
  },
  btn: {
    backgroundColor: 'transparent',
    border: '1px solid #66fcf1',
    color: '#66fcf1',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    width: '100%',
    fontWeight: 600,
    transition: 'all 0.3s ease',
  },
  editForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  label: {
    fontSize: '0.85rem',
    color: '#8892b0',
  },
  rangeInput: {
    accentColor: '#66fcf1',
    width: '100%',
  },
  rangeVal: {
    textAlign: 'right',
    fontSize: '0.85rem',
    color: '#66fcf1',
    fontWeight: 500,
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    marginTop: '10px',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#66fcf1',
    color: '#0b0c10',
    border: 'none',
    padding: '8px',
    borderRadius: '4px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: 'transparent',
    border: '1px solid #8892b0',
    color: '#8892b0',
    padding: '8px',
    borderRadius: '4px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  twoColumnGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
    gap: '32px',
  },
  backupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  subTitle: {
    margin: '20px 0 10px 0',
    fontSize: '1rem',
    fontWeight: 600,
    color: '#fff',
  },
  terminal: {
    backgroundColor: '#0c0f16',
    border: '1px solid #1f2833',
    padding: '16px',
    borderRadius: '8px',
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '0.8rem',
    color: '#66fcf1',
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
  },
  textInput: {
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: '#0c0f16',
    border: '1px solid #1f2833',
    padding: '10px 14px',
    borderRadius: '6px',
    color: '#fff',
    marginBottom: '16px',
    fontSize: '0.9rem',
    outline: 'none',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    marginTop: '20px',
  },
  wikiList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '250px',
    overflowY: 'auto',
    marginBottom: '20px',
  },
  wikiDetails: {
    border: '1px solid #1f2833',
    borderRadius: '6px',
    padding: '8px 12px',
    backgroundColor: '#0c0f16',
  },
  wikiSummary: {
    fontWeight: 600,
    cursor: 'pointer',
    color: '#66fcf1',
    outline: 'none',
  },
  wikiCat: {
    color: '#8892b0',
    fontSize: '0.8rem',
    marginLeft: '6px',
  },
  wikiContent: {
    margin: '8px 0 0 0',
    fontSize: '0.9rem',
    color: '#c5c6c7',
  },
  discordHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  discordStatusContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  toggleContainer: {
    display: 'flex',
    alignItems: 'center',
  },
  discordToggle: {
    position: 'relative',
    width: '42px',
    height: '24px',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    padding: '3px',
    display: 'flex',
    alignItems: 'center',
    transition: 'background-color 0.2s ease',
  },
  discordToggleKnob: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    backgroundColor: '#fff',
    transition: 'transform 0.2s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
  },
  discordErrorBox: {
    backgroundColor: 'rgba(240, 71, 71, 0.1)',
    border: '1px solid #f04747',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '0.85rem',
    marginBottom: '20px',
    color: '#f04747',
  },
  discordForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '20px',
  }
};
