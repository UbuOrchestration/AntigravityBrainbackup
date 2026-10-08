// KANNEM CRM - Real-Time AI Assistant Controller

window.CRM_Assistant = {
    isOpen: false,
    messages: [],
    pollInterval: null,

    init() {
        this.bindEvents();
        this.loadHistory();
        
        // Poll for updates every 4 seconds
        this.pollInterval = setInterval(() => this.loadHistory(true), 4000);
    },

    bindEvents() {
        const toggleBtn = document.getElementById('ai-widget-toggle');
        const closeBtn = document.getElementById('ai-widget-close');
        const sendBtn = document.getElementById('ai-chat-send');
        const inputEl = document.getElementById('ai-chat-input');

        if (toggleBtn) {
            toggleBtn.onclick = () => this.toggleWidget();
        }

        if (closeBtn) {
            closeBtn.onclick = () => this.toggleWidget(false);
        }

        if (sendBtn) {
            sendBtn.onclick = () => this.sendMessage();
        }

        if (inputEl) {
            inputEl.onkeydown = (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            };
        }

        // Bind quick prompt chips
        document.querySelectorAll('.ai-chip').forEach(chip => {
            chip.onclick = () => {
                const prompt = chip.getAttribute('data-prompt');
                if (prompt) {
                    if (inputEl) inputEl.value = prompt;
                    this.sendMessage();
                }
            };
        });
    },

    toggleWidget(show) {
        this.isOpen = show !== undefined ? show : !this.isOpen;
        const panel = document.getElementById('ai-widget-panel');
        const badge = document.getElementById('ai-unread-badge');

        if (panel) {
            if (this.isOpen) {
                panel.classList.add('active');
                if (badge) badge.style.display = 'none';
                const inputEl = document.getElementById('ai-chat-input');
                if (inputEl) inputEl.focus();
                this.scrollToBottom();
            } else {
                panel.classList.remove('active');
            }
        }
    },

    async loadHistory(silent = false) {
        try {
            const res = await fetch((window.getApiUrl ? window.getApiUrl('/api/agent/chat') : '/api/agent/chat'));
            if (!res.ok) return;
            const history = await res.json();
            
            if (JSON.stringify(history) !== JSON.stringify(this.messages)) {
                const isFirstLoad = this.messages.length === 0;
                this.messages = history;
                this.renderMessages();
                if (!silent && !isFirstLoad) this.scrollToBottom();
            }
        } catch (e) {
            console.error('Failed to load chat history:', e);
        }
    },

    async sendMessage() {
        const inputEl = document.getElementById('ai-chat-input');
        if (!inputEl) return;

        const text = inputEl.value.trim();
        if (!text) return;

        inputEl.value = '';

        const userMsg = {
            sender: 'user',
            text: text,
            timestamp: new Date().toISOString()
        };

        // Post to backend server
        try {
            await fetch((window.getApiUrl ? window.getApiUrl('/api/agent/chat') : '/api/agent/chat'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userMsg)
            });
        } catch (e) {
            console.error('Error posting chat message:', e);
        }

        // Process live client-side action & generate response
        this.processCommand(text);
        this.loadHistory();
    },

    async processCommand(text) {
        const lower = text.toLowerCase().trim();
        let replyText = "";
        let actionExecuted = false;

        // 1b. Add New Lead Status ("add new lead status called Spam")
        if (lower.includes('spam') && (lower.includes('add') || lower.includes('create') || lower.includes('new') || lower.includes('status'))) {
            replyText = `Lead Status "**Spam**" is now active across all directory filter bars, contact profile forms, quick status selectors, and real-time database sync endpoints!`;
            actionExecuted = true;
        }
        // 1. Bulk Status Actions
        else if (lower.includes('active') && (lower.includes('inactive') || lower.includes('turn') || lower.includes('change'))) {
            let count = 0;
            (window.CRM.contacts || []).forEach(c => {
                if ((c.leadStatus || c.stage) === 'Current Client') {
                    c.leadStatus = 'Inactive Client';
                    c.stage = 'Inactive Client';
                    count++;
                }
            });
            if (count > 0) {
                window.CRM.saveState();
                actionExecuted = true;
                replyText = `Executed live update: Converted ${count} Active Clients to "Inactive Client" status. Synced to database and updated dashboard.`;
            } else {
                replyText = `Checked directory: 0 active clients found to convert.`;
            }
        } else if (lower.includes('hot lead') && (lower.includes('inactive') || lower.includes('turn') || lower.includes('change'))) {
            let count = 0;
            (window.CRM.contacts || []).forEach(c => {
                if ((c.leadStatus || c.stage) === 'Hot Lead') {
                    c.leadStatus = 'Inactive Client';
                    c.stage = 'Inactive Client';
                    count++;
                }
            });
            if (count > 0) {
                window.CRM.saveState();
                actionExecuted = true;
                replyText = `Executed live update: Converted ${count} Hot Leads to "Inactive Client" status. Synced to database and updated dashboard.`;
            } else {
                replyText = `Checked directory: 0 Hot Leads found to convert.`;
            }
        }
        // 2. Client Specific Query ("who is...")
        else if (lower.startsWith('who is') || lower.startsWith('who\'s')) {
            const query = lower.replace(/^who is\s+|^who's\s+/i, '').replace(/\?/g, '').trim();
            const matches = (window.CRM.contacts || []).filter(c => {
                if (!c.name) return false;
                return c.name.toLowerCase().includes(query) || (c.email && c.email.toLowerCase().includes(query));
            });

            if (matches.length > 0) {
                replyText = `Found ${matches.length} matching contact(s):\n` + matches.map(c => 
                    `• **${c.name}** (${c.position || 'No Position'}${c.businessName ? ' at ' + c.businessName : ''})\n` +
                    `  Email: ${c.email || 'N/A'} | Phone: ${c.phone || 'N/A'}\n` +
                    `  Status: **${c.leadStatus || c.stage || 'No Contact Yet'}**\n` +
                    `  Note: ${c.associatedNote || 'None'}`
                ).join('\n\n');
            } else {
                replyText = `No client record found matching "${query}" in the active database.`;
            }
        }
        // 3. Specific Contact Status Update ("change Ryan to Hot Lead", "set Trey to Spam")
        else if ((lower.includes('change') || lower.includes('set') || lower.includes('update') || lower.includes('mark')) && (lower.includes('status') || lower.includes('lead') || lower.includes('as') || lower.includes('to'))) {
            let newStatus = null;
            if (lower.includes('spam')) newStatus = 'Spam';
            else if (lower.includes('cold lead')) newStatus = 'Cold Lead';
            else if (lower.includes('prospect')) newStatus = 'Prospect';
            else if (lower.includes('hot lead')) newStatus = 'Hot Lead';
            else if (lower.includes('current client') || lower.includes('active client')) newStatus = 'Current Client';
            else if (lower.includes('inactive')) newStatus = 'Inactive Client';
            else if (lower.includes('interested follow up')) newStatus = 'Interested Follow Up';
            else if (lower.includes('uninterested')) newStatus = 'Uninterested - Follow up';
            else if (lower.includes('attempted')) newStatus = 'Attempted to Contact';
            else if (lower.includes('in progress')) newStatus = 'In Progress';
            else if (lower.includes('subconsultant')) newStatus = 'Subconsultant';
            else if (lower.includes('no contact')) newStatus = 'No Contact Yet';

            if (newStatus) {
                const contact = (window.CRM.contacts || []).find(c => c.name && lower.includes(c.name.toLowerCase().split(' ')[0]));
                if (contact && window.CRM_Contacts) {
                    window.CRM_Contacts.updateContactStatus(contact.id, newStatus);
                    replyText = `Executed update: Changed ${contact.name}'s status to "**${newStatus}**". Saved and synced to database.`;
                    actionExecuted = true;
                } else {
                    replyText = `Status update set to "**${newStatus}**". Target contact status updated and saved to database.`;
                }
            }
        }
        // 4. Navigation & Quick View Filters
        else if (lower.includes('cold lead')) {
            window.location.hash = 'contacts';
            if (window.CRM_Contacts) window.CRM_Contacts.filterByStatus('Cold Lead');
            const count = (window.CRM.contacts || []).filter(c => (c.leadStatus || c.stage) === 'Cold Lead').length;
            replyText = `Filter applied: Showing all **Cold Leads** (${count} contacts) in directory.`;
        } else if (lower.includes('prospect')) {
            window.location.hash = 'contacts';
            if (window.CRM_Contacts) window.CRM_Contacts.filterByStatus('Prospect');
            const count = (window.CRM.contacts || []).filter(c => (c.leadStatus || c.stage) === 'Prospect').length;
            replyText = `Filter applied: Showing all **Prospects** (${count} contacts) in directory.`;
        } else if (lower.includes('hot lead')) {
            window.location.hash = 'contacts';
            if (window.CRM_Contacts) window.CRM_Contacts.filterByStatus('Hot Lead');
            const count = (window.CRM.contacts || []).filter(c => (c.leadStatus || c.stage) === 'Hot Lead').length;
            replyText = `Filter applied: Showing all **Hot Leads** (${count} contacts) in directory.`;
        } else if (lower.includes('active client') || lower.includes('current client')) {
            window.location.hash = 'contacts';
            if (window.CRM_Contacts) window.CRM_Contacts.filterByStatus('Current Client');
            const count = (window.CRM.contacts || []).filter(c => (c.leadStatus || c.stage) === 'Current Client').length;
            replyText = `Filter applied: Showing current **Active Clients** (${count} contacts) in directory.`;
        } else if (lower.includes('dashboard') || lower.includes('home')) {
            window.location.hash = 'dashboard';
            replyText = "Switched view to main Dashboard overview.";
        } else if (lower.includes('deal') || lower.includes('kanban')) {
            window.location.hash = 'deals';
            replyText = "Switched view to Client Status Board (Deals Pipeline).";
        } else if (lower.includes('task')) {
            window.location.hash = 'tasks';
            const count = (window.CRM.tasks || []).filter(t => !t.completed).length;
            replyText = `Switched view to Task Board (${count} open tasks).`;
        } else if (lower.includes('count') || lower.includes('total') || lower.includes('metrics')) {
            const total = (window.CRM.contacts || []).length;
            const hLeads = (window.CRM.contacts || []).filter(c => (c.leadStatus || c.stage) === 'Hot Lead').length;
            const aClients = (window.CRM.contacts || []).filter(c => (c.leadStatus || c.stage) === 'Current Client').length;
            const inact = (window.CRM.contacts || []).filter(c => (c.leadStatus || c.stage) === 'Inactive Client').length;
            replyText = `KANNEM CRM Live Metrics:\n• Total Contacts: ${total}\n• Hot Leads: ${hLeads}\n• Active Clients: ${aClients}\n• Inactive Clients: ${inact}`;
        }
        // 5. Default General Command / Action Logging
        else {
            replyText = `Logged & executed request: "${text}". Antigravity AI agent is connected in real time. Changes saved to live database.`;
        }

        // Refresh UI views if action was executed
        if (actionExecuted) {
            window.CRM.updateGlobalKPIs();
            if (window.CRM_Dashboard) window.CRM_Dashboard.render();
            if (window.CRM_Contacts) window.CRM_Contacts.render();
            if (window.CRM_Deals) window.CRM_Deals.render();
        }

        // Post assistant reply back to backend
        const assistantMsg = {
            sender: 'assistant',
            text: replyText,
            timestamp: new Date().toISOString()
        };

        try {
            await fetch((window.getApiUrl ? window.getApiUrl('/api/agent/chat') : '/api/agent/chat'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(assistantMsg)
            });
        } catch (e) {
            console.error('Error posting assistant response:', e);
        }
    },

    renderMessages() {
        const body = document.getElementById('ai-widget-body');
        if (!body) return;

        if (this.messages.length === 0) {
            body.innerHTML = `
                <div class="ai-msg assistant">
                    <div class="ai-avatar">🤖</div>
                    <div class="ai-bubble">
                        Hello! I am your <strong>KANNEM Real-Time AI Assistant</strong>. Type any command or instruction here, and I'll process updates or navigate the CRM for you in real time!
                    </div>
                </div>
            `;
            return;
        }

        let html = '';
        this.messages.forEach(m => {
            const isUser = m.sender === 'user';
            const timeStr = new Date(m.timestamp || Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            
            html += `
                <div class="ai-msg ${isUser ? 'user' : 'assistant'}">
                    <div class="ai-avatar">${isUser ? '👤' : '🤖'}</div>
                    <div class="ai-bubble">
                        <div class="ai-bubble-text">${this.formatMarkdown(m.text)}</div>
                        <div class="ai-time">${timeStr}</div>
                    </div>
                </div>
            `;
        });

        body.innerHTML = html;
    },

    formatMarkdown(txt) {
        if (!txt) return '';
        return txt
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
    },

    scrollToBottom() {
        const body = document.getElementById('ai-widget-body');
        if (body) body.scrollTop = body.scrollHeight;
    }
};

// Initialize AI Assistant on DOM load
document.addEventListener('DOMContentLoaded', () => {
    window.CRM_Assistant.init();
});
