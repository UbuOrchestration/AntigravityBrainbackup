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
            
            const hasPresentation = this.contacts.some(c => c.isPresentation);
            const isPurged = localStorage.getItem('crm_presentation_purged') === 'true';

            // Auto load 10 presentation records if not purged or if database is empty
            if (!hasPresentation && !isPurged) {
                this.loadPresentationData();
            } else if (this.contacts.length === 0 && !isPurged) {
                this.loadPresentationData();
            }
        } catch (e) {
            console.error('Error loading localStorage state:', e);
            this.contacts = [];
            this.activities = [];
            this.tasks = [];
            this.loadPresentationData();
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

        // Header Purge Presentation Demo Records Button
        const btnPurgePres = document.getElementById('btn-purge-presentation');
        if (btnPurgePres) {
            btnPurgePres.onclick = () => {
                const count = this.contacts.filter(c => c.isPresentation).length;
                if (count === 0) {
                    alert('No presentation placeholder records to remove.');
                    return;
                }
                if (confirm(`Remove all ${count} presentation placeholder contacts, activities, and tasks?`)) {
                    this.purgePresentationData();
                    alert('All presentation placeholder data removed successfully!');
                }
            };
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

        // Update presentation badge count
        const presCount = this.contacts.filter(c => c.isPresentation).length;
        const presBadge = document.getElementById('pres-count-badge');
        if (presBadge) presBadge.textContent = presCount;

        const btnPurgeHeader = document.getElementById('btn-purge-presentation');
        if (btnPurgeHeader) {
            btnPurgeHeader.style.opacity = presCount === 0 ? '0.5' : '1';
        }
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

    // Load 10 Presentation Placeholder People & Organizations
    loadPresentationData() {
        const presContacts = [
            {
                id: 'pres_1',
                name: 'Eleanor Vance',
                email: 'eleanor.vance@apexsurveying.com',
                phone: '(405) 555-0141',
                address: '1200 N Walker Ave, Oklahoma City, OK',
                businessName: 'Apex Commercial Surveying',
                position: 'Senior Project Director',
                stage: 'Lead',
                value: 14500,
                isPresentation: true
            },
            {
                id: 'pres_2',
                name: 'Harrison Sterling',
                email: 'harrison@sterlingeng.com',
                phone: '(405) 555-0182',
                address: '4500 N Classen Blvd, Oklahoma City, OK',
                businessName: 'Sterling & Associates Engineering',
                position: 'Chief Civil Engineer',
                stage: 'Contacted',
                value: 22000,
                isPresentation: true
            },
            {
                id: 'pres_3',
                name: 'Sophia Martinez',
                email: 'smartinez@redearthdev.com',
                phone: '(405) 555-0199',
                address: '300 NW 10th St, Oklahoma City, OK',
                businessName: 'Red Earth Development Group',
                position: 'Director of Land Planning',
                stage: 'Proposal Sent',
                value: 38500,
                isPresentation: true
            },
            {
                id: 'pres_4',
                name: 'Julian Thorne',
                email: 'julian@thornebuilt.com',
                phone: '(405) 555-0134',
                address: '1800 E 2nd St, Edmond, OK',
                businessName: 'Thorne Custom Homes & Commercial',
                position: 'Owner & Lead Builder',
                stage: 'In Negotiation',
                value: 19000,
                isPresentation: true
            },
            {
                id: 'pres_5',
                name: 'Catherine Dupont',
                email: 'c.dupont@heartlandenv.org',
                phone: '(405) 555-0167',
                address: '800 W Main St, Norman, OK',
                businessName: 'Heartland Environmental & Permitting',
                position: 'Principal Consultant',
                stage: 'Won',
                value: 11200,
                isPresentation: true
            },
            {
                id: 'pres_6',
                name: 'Marcus Brody',
                email: 'mbrody@brodydrafting.com',
                phone: '(405) 555-6321',
                address: '890 NW 4th St, Oklahoma City, OK',
                businessName: 'Brody Architects & Design',
                position: 'Lead CAD Architect',
                stage: 'Won',
                value: 8500,
                isPresentation: true
            },
            {
                id: 'pres_7',
                name: 'David Oaks',
                email: 'doaks@oaksland.com',
                phone: '(405) 555-0175',
                address: '500 S Mustang Rd, Yukon, OK',
                businessName: 'Oaks Boundary & Topo Surveyors',
                position: 'Operations Director',
                stage: 'Contacted',
                value: 15000,
                isPresentation: true
            },
            {
                id: 'pres_8',
                name: 'Rachel Bennett',
                email: 'rachel@prairieridge.com',
                phone: '(405) 555-0128',
                address: '2100 NW 63rd St, Oklahoma City, OK',
                businessName: 'Prairie Ridge Subdivision Corp',
                position: 'Vice President of Development',
                stage: 'Proposal Sent',
                value: 42000,
                isPresentation: true
            },
            {
                id: 'pres_9',
                name: 'Victor Vance',
                email: 'vance@vanceinfra.com',
                phone: '(405) 555-0153',
                address: '600 E Memorial Rd, Edmond, OK',
                businessName: 'Vance Infrastructure Partners',
                position: 'Senior CAD Technician',
                stage: 'Lead',
                value: 9800,
                isPresentation: true
            },
            {
                id: 'pres_10',
                name: 'Amanda Reyes',
                email: 'areyes@pinnaclepermits.com',
                phone: '(405) 555-0116',
                address: '100 N Robinson Ave, Oklahoma City, OK',
                businessName: 'Pinnacle Zoning & Permit Services',
                position: 'Zoning Specialist',
                stage: 'Lost',
                value: 6000,
                isPresentation: true
            }
        ];

        const presActivities = [
            {
                id: 'pres_act_1',
                contactId: 'pres_3',
                type: 'email',
                text: 'Sent CAD drafting quote & project breakdown for the 45-acre Red Earth commercial master plan.',
                timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
                isPresentation: true
            },
            {
                id: 'pres_act_2',
                contactId: 'pres_4',
                type: 'call',
                text: 'Phone call with Julian Thorne regarding setback revisions on lot 4. Agreed to deliver DWG drawings by Thursday.',
                timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
                isPresentation: true
            },
            {
                id: 'pres_act_3',
                contactId: 'pres_5',
                type: 'note',
                text: 'Environmental permit drawings approved by DEQ. Client satisfied with speed of delivery.',
                timestamp: new Date(Date.now() - 3600000 * 20).toISOString(),
                isPresentation: true
            },
            {
                id: 'pres_act_4',
                contactId: 'pres_8',
                type: 'email',
                text: 'Submitted proposal for Prairie Ridge 120-unit residential subdivision exhibit.',
                timestamp: new Date(Date.now() - 3600000 * 30).toISOString(),
                isPresentation: true
            }
        ];

        const presTasks = [
            {
                id: 'pres_task_1',
                title: 'Finalize 3D contour CAD model for Red Earth Development',
                date: new Date().toISOString().split('T')[0], // Today
                completed: false,
                contactId: 'pres_3',
                isPresentation: true
            },
            {
                id: 'pres_task_2',
                title: 'Review zoning overlay lines for Harrison Sterling',
                date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
                completed: false,
                contactId: 'pres_2',
                isPresentation: true
            },
            {
                id: 'pres_task_3',
                title: 'Deliver ALTA boundary survey DWG files',
                date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
                completed: true,
                contactId: 'pres_5',
                isPresentation: true
            }
        ];

        // Merge without duplicating
        const existingNonPres = this.contacts.filter(c => !c.isPresentation);
        this.contacts = [...presContacts, ...existingNonPres];

        const existingAct = this.activities.filter(a => !a.isPresentation);
        this.activities = [...presActivities, ...existingAct];

        const existingTask = this.tasks.filter(t => !t.isPresentation);
        this.tasks = [...presTasks, ...existingTask];

        localStorage.removeItem('crm_presentation_purged');
        this.saveState();
    },

    purgePresentationData() {
        this.contacts = this.contacts.filter(c => !c.isPresentation);
        this.activities = this.activities.filter(a => !a.isPresentation);
        this.tasks = this.tasks.filter(t => !t.isPresentation);

        localStorage.setItem('crm_presentation_purged', 'true');
        this.saveState();
        this.init();
    },

    // Legacy load sample data
    loadSampleData() {
        this.loadPresentationData();
    }
};

// Initialize application on load
document.addEventListener('DOMContentLoaded', () => {
    window.CRM.init();
});
