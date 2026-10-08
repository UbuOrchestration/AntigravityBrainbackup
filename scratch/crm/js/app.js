// Global API URL helper for cross-origin and file:// compatibility
window.getApiUrl = function(endpoint) {
    if (window.location.protocol === 'file:') {
        return 'http://localhost:8080' + endpoint;
    }
    return endpoint;
};

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

    deletedContactIds: new Set(),

    registerDeletedContact(id) {
        if (!id) return;
        if (!this.deletedContactIds) this.deletedContactIds = new Set();
        const str = String(id);
        const clean = str.replace(/^k_/, '');
        this.deletedContactIds.add(str);
        this.deletedContactIds.add(clean);
        this.deletedContactIds.add('k_' + clean);

        try {
            localStorage.setItem('crm_deleted_contacts', JSON.stringify(Array.from(this.deletedContactIds)));
        } catch (e) {}
    },

    isDeletedContact(id) {
        if (!id || !this.deletedContactIds) return false;
        const str = String(id);
        const clean = str.replace(/^k_/, '');
        return this.deletedContactIds.has(str) || this.deletedContactIds.has(clean) || this.deletedContactIds.has('k_' + clean);
    },

    loadState() {
        try {
            // Restore persistent set of deleted contact IDs
            try {
                const deletedArr = JSON.parse(localStorage.getItem('crm_deleted_contacts')) || [];
                this.deletedContactIds = new Set(deletedArr);
            } catch (e) {
                this.deletedContactIds = new Set();
            }

            // 1. Synchronous instant load from localStorage or baseline KANNEM_EXPORT_DATA
            let localContacts = [];
            try {
                localContacts = JSON.parse(localStorage.getItem('crm_contacts')) || [];
            } catch (e) {
                localContacts = [];
            }

            if (localContacts.length > 0) {
                this.contacts = localContacts.filter(c => c && !this.isDeletedContact(c.id) && !this.isDeletedContact(c.recordId));
            } else if (window.KANNEM_EXPORT_DATA) {
                this.contacts = JSON.parse(JSON.stringify(window.KANNEM_EXPORT_DATA)).filter(c => c && !this.isDeletedContact(c.id) && !this.isDeletedContact(c.recordId));
            } else {
                this.contacts = [];
            }

            this.activities = JSON.parse(localStorage.getItem('crm_activities')) || [];
            this.tasks = JSON.parse(localStorage.getItem('crm_tasks')) || [];

            // 2. Async live load from contacts_database.md via API with anti-caching & strict deletion enforcement
            fetch(window.getApiUrl('/api/contacts?t=' + Date.now()), { cache: 'no-store' })
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data) && data.length > 0) {
                        const validDiskContacts = data.filter(c => c && !this.isDeletedContact(c.id) && !this.isDeletedContact(c.recordId));

                        const localMap = new Map();
                        (this.contacts || []).forEach(c => {
                            if (!c) return;
                            if (c.id) localMap.set(String(c.id), c);
                            if (c.recordId) localMap.set(String(c.recordId), c);
                            if (c.id) localMap.set(String(c.id).replace(/^k_/, ''), c);
                            if (c.recordId) localMap.set(String(c.recordId).replace(/^k_/, ''), c);
                        });

                        const diskIdSet = new Set();
                        validDiskContacts.forEach(d => {
                            if (d.id) diskIdSet.add(String(d.id));
                            if (d.recordId) diskIdSet.add(String(d.recordId));
                            const clean = String(d.id || d.recordId).replace(/^k_/, '');
                            diskIdSet.add(clean);
                            diskIdSet.add('k_' + clean);
                        });

                        const reconciled = validDiskContacts.map(diskC => {
                            const cleanId = String(diskC.id || diskC.recordId).replace(/^k_/, '');
                            const localC = localMap.get(String(diskC.id)) || localMap.get(String(diskC.recordId)) || localMap.get(cleanId);
                            if (!localC) return diskC;

                            return {
                                ...diskC,
                                ...localC,
                                position: localC.position !== undefined ? localC.position : (diskC.position || ''),
                                leadStatus: localC.leadStatus || localC.stage || diskC.leadStatus || diskC.stage || 'No Contact Yet',
                                stage: localC.stage || localC.leadStatus || diskC.stage || diskC.leadStatus || 'No Contact Yet',
                                associatedNote: localC.associatedNote !== undefined ? localC.associatedNote : (diskC.associatedNote || ''),
                                websiteUrl: localC.websiteUrl !== undefined ? localC.websiteUrl : (diskC.websiteUrl || '')
                            };
                        });

                        // Preserve any newly created local contacts that are not yet written to disk!
                        const newLocalContacts = (this.contacts || []).filter(localC => {
                            if (!localC) return false;
                            if (this.isDeletedContact(localC.id) || this.isDeletedContact(localC.recordId)) return false;
                            const lId = String(localC.id);
                            const rId = String(localC.recordId);
                            const clean = lId.replace(/^k_/, '');
                            return !diskIdSet.has(lId) && !diskIdSet.has(rId) && !diskIdSet.has(clean);
                        });

                        this.contacts = [...reconciled, ...newLocalContacts];
                        localStorage.setItem('crm_contacts', JSON.stringify(this.contacts));

                        // If disk contained deleted contacts or new local contacts exist, write to disk immediately
                        if (data.length > validDiskContacts.length || newLocalContacts.length > 0) {
                            this.syncToMD(false);
                        }
                    } else if (this.contacts.length === 0 && window.KANNEM_EXPORT_DATA) {
                        this.contacts = JSON.parse(JSON.stringify(window.KANNEM_EXPORT_DATA)).filter(c => c && !this.isDeletedContact(c.id) && !this.isDeletedContact(c.recordId));
                    }
                    this.updateGlobalKPIs();
                    if (window.CRM_Dashboard) window.CRM_Dashboard.render();
                    if (window.CRM_Contacts) window.CRM_Contacts.render();
                    if (window.CRM_Deals) window.CRM_Deals.render();
                })
                .catch(err => {
                    console.error('Live database sync load failed, using local fallback:', err);
                    if (this.contacts.length === 0 && window.KANNEM_EXPORT_DATA) {
                        this.contacts = JSON.parse(JSON.stringify(window.KANNEM_EXPORT_DATA)).filter(c => c && !this.isDeletedContact(c.id) && !this.isDeletedContact(c.recordId));
                    }
                    this.updateGlobalKPIs();
                    if (window.CRM_Contacts) window.CRM_Contacts.render();
                });

            // Async live load from activities_database.json via API
            fetch(window.getApiUrl('/api/activities?t=' + Date.now()), { cache: 'no-store' })
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data) && data.length > 0) {
                        const localActIds = new Set((this.activities || []).map(a => a.id));
                        data.forEach(act => {
                            if (!localActIds.has(act.id)) {
                                this.activities.push(act);
                            }
                        });
                        localStorage.setItem('crm_activities', JSON.stringify(this.activities));
                        if (window.CRM_Contacts && window.CRM_Contacts.selectedContactId) {
                            window.CRM_Contacts.renderTimeline();
                        }
                    }
                })
                .catch(err => console.error('Live activities sync load failed:', err));

            // Async live load from tasks_database.json via API
            fetch(window.getApiUrl('/api/tasks?t=' + Date.now()), { cache: 'no-store' })
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data) && data.length > 0) {
                        this.tasks = data;
                        localStorage.setItem('crm_tasks', JSON.stringify(this.tasks));
                        if (window.CRM_Tasks) window.CRM_Tasks.render();
                    }
                })
                .catch(err => console.error('Live tasks sync load failed:', err));

        } catch (e) {
            console.error('Error loading state:', e);
        }
    },

    saveState() {
        try {
            localStorage.setItem('crm_contacts', JSON.stringify(this.contacts));
            localStorage.setItem('crm_activities', JSON.stringify(this.activities));
            localStorage.setItem('crm_tasks', JSON.stringify(this.tasks));
            this.updateGlobalKPIs();

            // Real-time live sync to contacts_database.md, activities_database.json, and tasks_database.json
            return this.syncToMD(false);
        } catch (e) {
            console.error('Error saving state to localStorage:', e);
            return Promise.resolve(false);
        }
    },

    async syncToMD(useBeacon = false) {
        try {
            const payload = JSON.stringify(this.contacts || []);
            const targetUrl = window.getApiUrl('/api/contacts');

            const actPayload = JSON.stringify(this.activities || []);
            const actTargetUrl = window.getApiUrl('/api/activities');

            const taskPayload = JSON.stringify(this.tasks || []);
            const taskTargetUrl = window.getApiUrl('/api/tasks');

            if (useBeacon && navigator.sendBeacon) {
                navigator.sendBeacon(targetUrl, new Blob([payload], { type: 'application/json' }));
                navigator.sendBeacon(actTargetUrl, new Blob([actPayload], { type: 'application/json' }));
                navigator.sendBeacon(taskTargetUrl, new Blob([taskPayload], { type: 'application/json' }));
                return true;
            } else {
                const results = await Promise.all([
                    fetch(targetUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: payload
                    }),
                    fetch(actTargetUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: actPayload
                    }),
                    fetch(taskTargetUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: taskPayload
                    })
                ]);
                return results.every(r => r.ok);
            }
        } catch (e) {
            console.error('Error syncing state to markdown file:', e);
            return false;
        }
    },

    async manualSaveChanges() {
        const saveBtn = document.getElementById('btn-global-save-changes');
        if (saveBtn) {
            saveBtn.innerHTML = '⏳ SAVING TO DISK...';
            saveBtn.disabled = true;
        }

        await this.saveState();

        if (saveBtn) saveBtn.disabled = false;

        this.clearDirty();
        alert('✅ All CRM changes have been successfully recorded to contacts_database.md and local databases!');
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

    isDirty: false,

    markDirty() {
        this.isDirty = true;
        const saveBtn = document.getElementById('btn-global-save-changes');
        if (saveBtn) {
            saveBtn.classList.remove('btn-success');
            saveBtn.classList.add('btn-warning');
            saveBtn.innerHTML = '💾 SAVE CHANGES <span style="background:rgba(0,0,0,0.25); padding:2px 6px; border-radius:10px; font-size:10px; margin-left:4px;">UNSAVED</span>';
        }
    },

    clearDirty() {
        this.isDirty = false;
        const saveBtn = document.getElementById('btn-global-save-changes');
        if (saveBtn) {
            saveBtn.classList.remove('btn-warning');
            saveBtn.classList.add('btn-success');
            saveBtn.innerHTML = '✅ CHANGES SAVED';
            setTimeout(() => {
                if (!this.isDirty && saveBtn) {
                    saveBtn.innerHTML = '💾 SAVE CHANGES';
                }
            }, 3000);
        }
    },

    async manualSaveChanges() {
        const saveBtn = document.getElementById('btn-global-save-changes');
        if (saveBtn) {
            saveBtn.innerHTML = '⏳ SAVING TO DISK...';
            saveBtn.disabled = true;
        }

        const success = await this.saveState();

        if (saveBtn) saveBtn.disabled = false;

        if (success) {
            this.clearDirty();
            alert('✅ All CRM changes have been successfully recorded to contacts_database.md and local databases!');
        } else {
            alert('⚠️ Save completed locally, but disk synchronization returned a warning. Changes remain preserved in local session.');
        }
    },

    formatPhoneNumber(phone) {
        if (!phone) return '';
        let digits = String(phone).replace(/\D/g, '');
        if (digits.length === 11 && digits.startsWith('1')) {
            digits = digits.substring(1);
        }
        if (digits.length === 10) {
            return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6, 10)}`;
        }
        let clean = String(phone).trim().replace(/^\+?1[\s-.]?/, '');
        if (clean.startsWith('(') && clean.includes(')')) {
            clean = clean.replace(/^\(1(\d{3})\)/, '($1)');
        }
        return clean || phone;
    },

    initGlobalEvents() {
        // Explicit sidebar navigation click handlers
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const view = item.getAttribute('data-view');
                if (view) {
                    e.preventDefault();
                    window.location.hash = view;
                    this.switchView(view);
                }
            });
        });

        // Unsaved changes confirmation prompt & interface closeout sync
        window.addEventListener('beforeunload', (e) => {
            this.syncToMD(true);
            if (this.isDirty) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes in the CRM! Please click SAVE CHANGES to ensure progress is recorded.';
                return e.returnValue;
            }
        });

        window.addEventListener('pagehide', () => this.syncToMD(true));
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.syncToMD(true);
            }
        });

        // Logo click handler - navigates to Dashboard view
        const logoEl = document.getElementById('crm-logo-home') || document.querySelector('.logo');
        if (logoEl) {
            logoEl.addEventListener('click', () => {
                window.location.hash = 'dashboard';
                this.switchView('dashboard');
            });
        }

        // Global SAVE CHANGES button handler
        const btnSaveGlobal = document.getElementById('btn-global-save-changes');
        if (btnSaveGlobal) {
            btnSaveGlobal.addEventListener('click', () => {
                this.manualSaveChanges();
            });
        }

        // Global search input keyup
        const searchInput = document.getElementById('global-search');
        if (searchInput) {
            searchInput.addEventListener('keyup', (e) => {
                const query = e.target.value.toLowerCase().trim();
                
                if (this.currentView === 'deals' && window.CRM_Deals) {
                    window.CRM_Deals.filterQuery(query);
                } else {
                    if (this.currentView !== 'contacts' && query.length > 0) {
                        this.switchView('contacts');
                    }
                    if (window.CRM_Contacts) {
                        window.CRM_Contacts.filterQuery(query);
                    }
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
        const cardTotal = document.getElementById('kpi-card-total');
        if (cardTotal) cardTotal.setAttribute('title', `Click to view all ${this.contacts.length} contact records`);

        // Hot Leads Count
        const hotLeads = this.contacts.filter(c => (c.leadStatus || c.stage) === 'Hot Lead').length;
        const kpiHotLeads = document.getElementById('kpi-hot-leads');
        if (kpiHotLeads) kpiHotLeads.textContent = hotLeads;
        const cardHotLeads = document.getElementById('kpi-card-hot-leads');
        if (cardHotLeads) cardHotLeads.setAttribute('title', `Click to view all ${hotLeads} Hot Leads`);

        // Active Clients Count
        const activeClients = this.contacts.filter(c => (c.leadStatus || c.stage) === 'Current Client').length;
        const kpiActiveClients = document.getElementById('kpi-active-clients');
        if (kpiActiveClients) kpiActiveClients.textContent = activeClients;
        const cardActiveClients = document.getElementById('kpi-card-active-clients');
        if (cardActiveClients) cardActiveClients.setAttribute('title', `Click to view all ${activeClients} Active Clients`);

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
    findContact(targetId) {
        if (!targetId) return null;
        const targetStr = String(targetId);
        const cleanId = targetStr.replace(/^k_/, '');
        return (this.contacts || []).find(c => {
            if (!c) return false;
            const cId = c.id ? String(c.id) : '';
            const cRecId = c.recordId ? String(c.recordId) : '';
            const cIdClean = cId.replace(/^k_/, '');
            const cRecIdClean = cRecId.replace(/^k_/, '');
            return cId === targetStr || cRecId === targetStr || cIdClean === cleanId || cRecIdClean === cleanId;
        }) || null;
    },

    isSameContact(id1, id2) {
        if (!id1 || !id2) return false;
        if (id1 === id2) return true;
        const clean1 = String(id1).replace(/^k_/, '');
        const clean2 = String(id2).replace(/^k_/, '');
        return clean1 === clean2;
    },

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
