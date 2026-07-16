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
            this.contacts = JSON.parse(localStorage.getItem('crm_contacts')) || [];
            this.activities = JSON.parse(localStorage.getItem('crm_activities')) || [];
            this.tasks = JSON.parse(localStorage.getItem('crm_tasks')) || [];
            
            // If empty, automatically load sample data
            if (this.contacts.length === 0) {
                this.loadSampleData();
            }
        } catch (e) {
            console.error('Error loading localStorage state:', e);
            this.contacts = [];
            this.activities = [];
            this.tasks = [];
        }
    },

    saveState() {
        try {
            localStorage.setItem('crm_contacts', JSON.stringify(this.contacts));
            localStorage.setItem('crm_activities', JSON.stringify(this.activities));
            localStorage.setItem('crm_tasks', JSON.stringify(this.tasks));
            this.updateGlobalKPIs();
        } catch (e) {
            console.error('Error saving state to localStorage:', e);
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
        // Compute pipeline sum
        const activeDeals = this.contacts.filter(c => c.value && c.stage !== 'Won' && c.stage !== 'Lost');
        const pipelineTotal = activeDeals.reduce((sum, c) => sum + parseFloat(c.value || 0), 0);
        
        const kpiPipelineValue = document.getElementById('kpi-pipeline-value');
        if (kpiPipelineValue) kpiPipelineValue.textContent = this.formatCurrency(pipelineTotal);

        const kpiPipelineCount = document.getElementById('kpi-pipeline-count');
        if (kpiPipelineCount) kpiPipelineCount.textContent = `${activeDeals.length} Active Deals`;

        // Contacts KPI
        const kpiContactCount = document.getElementById('kpi-contact-count');
        if (kpiContactCount) kpiContactCount.textContent = this.contacts.length;

        const payingCustomers = this.contacts.filter(c => c.stage === 'Won').length;
        const kpiCustomerCount = document.getElementById('kpi-customer-count');
        if (kpiCustomerCount) kpiCustomerCount.textContent = `${payingCustomers} paying customers`;

        // Conversion Rate KPI
        const totalClosedDeals = this.contacts.filter(c => c.stage === 'Won' || c.stage === 'Lost').length;
        const conversionRate = totalClosedDeals > 0 ? Math.round((payingCustomers / totalClosedDeals) * 100) : 0;
        
        const kpiConversionRate = document.getElementById('kpi-conversion-rate');
        if (kpiConversionRate) kpiConversionRate.textContent = `${conversionRate}%`;

        const kpiDealsWon = document.getElementById('kpi-deals-won');
        if (kpiDealsWon) kpiDealsWon.textContent = `${payingCustomers} deals won`;

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

    // Load HubSpot seed sample data
    loadSampleData() {
        const mockContacts = [
            {
                id: 'c_1',
                name: 'Robert Vance',
                email: 'rvance@vancebuilt.com',
                phone: '(405) 555-8910',
                address: '742 N Broadway, Oklahoma City, OK',
                businessName: 'Vance Construction Partners',
                position: 'VP of Operations',
                stage: 'Lead',
                value: 12500
            },
            {
                id: 'c_2',
                name: 'Samantha Cross',
                email: 'samantha@crosssurveying.net',
                phone: '(405) 555-0912',
                address: '1504 Meridian Ave, OKC, OK',
                businessName: 'Cross Land Surveying Services',
                position: 'Principal Land Surveyor',
                stage: 'Contacted',
                value: 6800
            },
            {
                id: 'c_3',
                name: 'Marcus Brody',
                email: 'mbrody@brodydrafting.com',
                phone: '(405) 555-6321',
                address: '890 NW 4th St, Oklahoma City, OK',
                businessName: 'Brody Architects & Design',
                position: 'Lead CAD Architect',
                stage: 'Customer', // Won
                value: 4500
            },
            {
                id: 'c_4',
                name: 'Douglas Miller',
                email: 'd.miller@millerhomesok.com',
                phone: '(405) 555-4309',
                address: '3200 Expressway Road, Edmond, OK',
                businessName: 'Miller Custom Homes LLC',
                position: 'General Contractor',
                stage: 'Lead',
                value: 18000
            },
            {
                id: 'c_5',
                name: 'Laura Croft',
                email: 'lcroft@archaeopermits.com',
                phone: '(405) 555-7281',
                address: '121 Heritage Blvd, Norman, OK',
                businessName: 'Archaeology & Environmental Permitting',
                position: 'Environmental Specialist',
                stage: 'Lead',
                value: 3500
            }
        ];

        // Seed activities
        const mockActivities = [
            {
                id: 'act_1',
                contactId: 'c_2',
                type: 'call',
                text: 'Discussed boundary plat overlay for the new Quail Creek project. Client requires AutoCAD layout by Friday.',
                timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
            },
            {
                id: 'act_2',
                contactId: 'c_3',
                type: 'email',
                text: 'Sent finalized residential plot plan permit drawings for Stonegate lot 12. Transaction complete.',
                timestamp: new Date(Date.now() - 3600000 * 24).toISOString()
            },
            {
                id: 'act_3',
                contactId: 'c_1',
                type: 'note',
                text: 'Discovered lead through AutoCAD drafting landing page. Roberts business needs surveying support for subdivision planning.',
                timestamp: new Date(Date.now() - 3600000 * 48).toISOString()
            }
        ];

        // Seed tasks
        const mockTasks = [
            {
                id: 'task_1',
                title: 'Review zoning setback lines for Vance subdivision project',
                date: new Date().toISOString().split('T')[0], // Due today
                completed: false,
                contactId: 'c_1'
            },
            {
                id: 'task_2',
                title: 'Draft topographic AutoCAD model for Cross Land Surveying',
                date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], // 2 days from now
                completed: false,
                contactId: 'c_2'
            },
            {
                id: 'task_3',
                title: 'Collect signature on subdivision easement exhibit',
                date: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Overdue
                completed: false,
                contactId: 'c_3'
            }
        ];

        this.contacts = mockContacts;
        // Map HubSpot stages to standard board stages
        this.contacts.forEach(c => {
            if (c.stage === 'Customer') c.stage = 'Won';
        });
        
        this.activities = mockActivities;
        this.tasks = mockTasks;
        
        this.saveState();
        
        // Dispatch UI updates
        this.init();
    }
};

// Initialize application on load
document.addEventListener('DOMContentLoaded', () => {
    window.CRM.init();
});
