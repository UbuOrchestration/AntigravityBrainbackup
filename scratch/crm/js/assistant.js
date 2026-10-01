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
        const lower = text.toLowerCase();
        let replyText = "";

        if (lower.includes('hot lead')) {
            window.location.hash = 'contacts';
            if (window.CRM_Contacts) window.CRM_Contacts.filterByStatus('Hot Lead');
            const count = (window.CRM.contacts || []).filter(c => (c.leadStatus || c.stage) === 'Hot Lead').length;
            replyText = `Showing all **Hot Leads** (${count} contacts) in the directory.`;
        } else if (lower.includes('active client') || lower.includes('current client')) {
            window.location.hash = 'contacts';
            if (window.CRM_Contacts) window.CRM_Contacts.filterByStatus('Current Client');
            const count = (window.CRM.contacts || []).filter(c => (c.leadStatus || c.stage) === 'Current Client').length;
            replyText = `Showing current **Active Clients** (${count} contacts) in the directory.`;
        } else if (lower.includes('dashboard') || lower.includes('home')) {
            window.location.hash = 'dashboard';
            replyText = "Switched to main Dashboard overview.";
        } else if (lower.includes('status board') || lower.includes('deal') || lower.includes('kanban')) {
            window.location.hash = 'deals';
            replyText = "Switched to Client Status Board (Deals Pipeline).";
        } else if (lower.includes('task')) {
            window.location.hash = 'tasks';
            const count = (window.CRM.tasks || []).filter(t => !t.completed).length;
            replyText = `Switched to Task Board. You have **${count} open tasks**.`;
        } else if (lower.includes('count') || lower.includes('total') || lower.includes('how many')) {
            const total = (window.CRM.contacts || []).length;
            const hLeads = (window.CRM.contacts || []).filter(c => (c.leadStatus || c.stage) === 'Hot Lead').length;
            const aClients = (window.CRM.contacts || []).filter(c => (c.leadStatus || c.stage) === 'Current Client').length;
            replyText = `Current KANNEM CRM Metrics:\n• Total Contacts: ${total}\n• Hot Leads: ${hLeads}\n• Active Clients: ${aClients}`;
        } else {
            replyText = `Understood! I've logged your request: "${text}". The Antigravity AI agent is connected and will process codebase updates in real time.`;
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
