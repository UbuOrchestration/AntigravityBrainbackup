// Private CRM - Core State & View Controller

// Global application state
window.CRM = {
    contacts: [],
    activities: [],
    tasks: [],
    currentView: 'dashboard',
    
    // Core database saving & loading
    init() {
        this.loadState();
        this.initRouting();
        this.initGlobalEvents();
        this.updateGlobalKPIs();
        
        // Initial render for views
        if (window.CRM_Dashboard) window.CRM_Dashboard.render();
        if (window.CRM_Contacts) window.CRM_Contacts.render();
        if (window.CRM_Deals) window.CRM_Deals.render();
        if (window.CRM_Tasks) window.CRM_Tasks.render();
    },

    loadState() {
        try {
            // Synchronous instant load from localStorage/dataset
            this.contacts = JSON.parse(localStorage.getItem('crm_contacts')) || [];
            this.activities = JSON.parse(localStorage.getItem('crm_activities')) || [];
            this.tasks = JSON.parse(localStorage.getItem('crm_tasks')) || [];

            if (this.contacts.length === 0 && window.KANNEM_EXPORT_DATA) {
                this.contacts = JSON.parse(JSON.stringify(window.KANNEM_EXPORT_DATA));
            }

            // Async live load from contacts_database.md
            fetch('/api/contacts')
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data) && data.length > 0) {
                        this.contacts = data;
                        localStorage.setItem('crm_contacts', JSON.stringify(this.contacts));
                        this.updateGlobalKPIs();
                        if (this.currentView === 'dashboard' && window.CRM_Dashboard) window.CRM_Dashboard.render();
                        if (this.currentView === 'contacts' && window.CRM_Contacts) window.CRM_Contacts.render();
                        if (this.currentView === 'deals' && window.CRM_Deals) window.CRM_Deals.render();
                    }
                })
                .catch(err => console.error('Live database sync load failed, using local fallback:', err));

        } catch (e) {
            console.error('Error loading state from localStorage:', e);
        }
    },

    saveState() {
        try {
            localStorage.setItem('crm_contacts', JSON.stringify(this.contacts));
            localStorage.setItem('crm_activities', JSON.stringify(this.activities));
            localStorage.setItem('crm_tasks', JSON.stringify(this.tasks));
            this.updateGlobalKPIs();

            // Real-time live sync to contacts_database.md
            this.syncToMD(false);
        } catch (e) {
            console.error('Error saving state to localStorage:', e);
        }
    },

    syncToMD(useBeacon = false) {
        try {
            const payload = JSON.stringify(this.contacts || []);
            if (useBeacon && navigator.sendBeacon) {
                const blob = new Blob([payload], { type: 'application/json' });
                navigator.sendBeacon('/api/contacts', blob);
            } else {
                fetch('/api/contacts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: payload,
                    keepalive: true
                }).catch(err => console.error('Live database sync save failed:', err));
            }
        } catch (e) {
            console.error('Error syncing state to markdown file:', e);
        }
    },

    // Navigation and hash routing
    initRouting() {
        const handleRoute = () => {
            const hash = window.location.hash.replace('#', '') || 'dashboard';
            const views = ['dashboard', 'contacts', 'deals', 'tasks', 'migration'];
            
            if (views.includes(hash)) {
                this.switchView(hash);
            }
        };

        window.addEventListener('hashchange', handleRoute);
        // Load initial hash
        handleRoute();
    },

    switchView(viewName) {
        this.currentView = viewName;
        
        // Update sidebar active state
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
            if (item.getAttribute('data-view') === viewName) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Toggle visibility of views
        document.querySelectorAll('.content-view').forEach(view => {
            if (view.id === `view-${viewName}`) {
                view.classList.add('active');
            } else {
                view.classList.remove('active');
            }
        });

        // Trigger updates on view activations
        if (viewName === 'dashboard' && window.CRM_Dashboard) window.CRM_Dashboard.render();
        if (viewName === 'contacts' && window.CRM_Contacts) window.CRM_Contacts.render();
        if (viewName === 'deals' && window.CRM_Deals) window.CRM_Deals.render();
        if (viewName === 'tasks' && window.CRM_Tasks) window.CRM_Tasks.render();
    },

    initGlobalEvents() {
        // Interface closeout sync listeners (save to md on close/unload/visibility hide)
        const closeoutSync = () => this.syncToMD(true);
        window.addEventListener('beforeunload', closeoutSync);
        window.addEventListener('pagehide', closeoutSync);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                closeoutSync();
            }
        });

        // Global search input keyup
        const searchInput = document.getElementById('global-search');
        if (searchInput) {
            searchInput.addEventListener('keyup', (e) => {
                const query = e.target.value.toLowerCase().trim();
                
                // If on contacts page, filter contacts table
                if (this.currentView === 'contacts' && window.CRM_Contacts) {
                    window.CRM_Contacts.filterQuery(query);
                } else if (this.currentView === 'deals' && window.CRM_Deals) {
                    window.CRM_Deals.filterQuery(query);
                }
            });
        }

        // Header Actions modal triggers
        const btnAddContactModal = document.getElementById('btn-add-contact-modal');
        if (btnAddContactModal) {
            btnAddContactModal.addEventListener('click', () => {
                if (window.CRM_Contacts) window.CRM_Contacts.openAddModal();
            });
        }

        const btnQuickImport = document.getElementById('btn-quick-import');
        if (btnQuickImport) {
            btnQuickImport.addEventListener('click', () => {
                window.location.hash = 'migration';
            });
        }
    },

    updateGlobalKPIs() {
        // Total Contacts KPI
        const kpiContactCount = document.getElementById('kpi-contact-count');
        if (kpiContactCount) kpiContactCount.textContent = this.contacts.length;

        // Hot Leads Count
        const hotLeads = this.contacts.filter(c => (c.leadStatus || c.stage) === 'Hot Lead').length;
        const kpiHotLeads = document.getElementById('kpi-hot-leads');
        if (kpiHotLeads) kpiHotLeads.textContent = hotLeads;

        // Active Clients Count
        const activeClients = this.contacts.filter(c => (c.leadStatus || c.stage) === 'Current Client').length;
        const kpiActiveClients = document.getElementById('kpi-active-clients');
        if (kpiActiveClients) kpiActiveClients.textContent = activeClients;

        // Open Tasks KPI
        const openTasks = this.tasks.filter(t => !t.completed);
        const kpiTaskCount = document.getElementById('kpi-task-count');
        if (kpiTaskCount) kpiTaskCount.textContent = openTasks.length;

        // Tasks due today
        const todayStr = new Date().toISOString().split('T')[0];
        const dueToday = openTasks.filter(t => t.date === todayStr).length;
        
        const kpiTaskDue = document.getElementById('kpi-task-due');
        if (kpiTaskDue) kpiTaskDue.textContent = `${dueToday} due today`;
    },

    // Helpers
    formatCurrency(val) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(val);
    },

    formatDate(dateStr) {
        if (!dateStr) return '';
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', options);
    },

    logActivity(contactId, type, text) {
        const activity = {
            id: 'act_' + Math.random().toString(36).substr(2, 9),
            contactId,
            type, // 'note', 'call', 'email', 'system'
            text,
            timestamp: new Date().toISOString()
        };
        this.activities.unshift(activity); // Add to beginning of array
        this.saveState();
        
        // Rerender timelines if visible
        if (window.CRM_Dashboard) window.CRM_Dashboard.render();
        return activity;
    },

    resetToOrgDataset() {
        if (window.KANNEM_EXPORT_DATA) {
            this.contacts = JSON.parse(JSON.stringify(window.KANNEM_EXPORT_DATA));
            this.activities = [];
            this.tasks = [];
            this.saveState();
            this.init();
        }
    }
};

// Initialize application on load
document.addEventListener('DOMContentLoaded', () => {
    window.CRM.init();
});
