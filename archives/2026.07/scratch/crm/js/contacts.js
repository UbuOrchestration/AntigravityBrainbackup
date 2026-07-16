// Private CRM - Contacts Controller
window.CRM_Contacts = {
    selectedContactId: null,
    searchQuery: '',
    statusFilter: 'all',
    activeTimelineType: 'note',

    render() {
        this.renderTable();
        this.initEvents();
    },

    renderTable() {
        const tbody = document.getElementById('contacts-table-body');
        if (!tbody) return;

        // Apply filters
        let filtered = window.CRM.contacts;

        if (this.statusFilter !== 'all') {
            filtered = filtered.filter(c => c.stage === this.statusFilter);
        }

        if (this.searchQuery) {
            const q = this.searchQuery;
            filtered = filtered.filter(c => 
                (c.name && c.name.toLowerCase().includes(q)) ||
                (c.businessName && c.businessName.toLowerCase().includes(q)) ||
                (c.position && c.position.toLowerCase().includes(q)) ||
                (c.email && c.email.toLowerCase().includes(q)) ||
                (c.address && c.address.toLowerCase().includes(q))
            );
        }

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-muted">No client records found. Use "Data Migration" or "Create Contact".</td></tr>`;
            return;
        }

        let html = '';
        filtered.forEach(c => {
            const initials = c.name ? c.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??';
            const valFormatted = window.CRM.formatCurrency(c.value || 0);
            
            html += `
                <tr data-id="${c.id}" class="contact-row">
                    <td><input type="checkbox" class="select-contact-chk" data-id="${c.id}" onclick="event.stopPropagation()"></td>
                    <td class="contact-name-cell">
                        <div class="avatar-dot">${initials}</div>
                        <span>${c.name}</span>
                    </td>
                    <td>${c.businessName || '<span class="text-dim">—</span>'}</td>
                    <td>${c.position || '<span class="text-dim">—</span>'}</td>
                    <td>${c.email || '<span class="text-dim">—</span>'}</td>
                    <td>${c.phone || '<span class="text-dim">—</span>'}</td>
                    <td title="${c.address || ''}">${c.address ? this.truncate(c.address, 15) : '<span class="text-dim">—</span>'}</td>
                    <td><span class="status-badge ${c.stage ? c.stage.toLowerCase() : 'lead'}">${c.stage || 'Lead'}</span></td>
                    <td class="text-bold">${valFormatted}</td>
                    <td>
                        <div class="card-action-btns">
                            <button class="card-btn btn-edit-contact" data-id="${c.id}" onclick="event.stopPropagation()">Edit</button>
                            <button class="card-btn btn-delete-contact" data-id="${c.id}" onclick="event.stopPropagation()" style="color: var(--color-danger)">Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;

        // Add event listeners to rows to open detail drawer
        document.querySelectorAll('.contact-row').forEach(row => {
            row.addEventListener('click', () => {
                const id = row.getAttribute('data-id');
                this.openDetailsPanel(id);
            });
        });

        // Add event listeners to individual action buttons
        document.querySelectorAll('.btn-edit-contact').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.getAttribute('data-id');
                this.openEditModal(id);
            });
        });

        document.querySelectorAll('.btn-delete-contact').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.getAttribute('data-id');
                this.deleteContact(id);
            });
        });

        // Setup individual checkbox triggers
        document.querySelectorAll('.select-contact-chk').forEach(chk => {
            chk.addEventListener('change', () => {
                this.toggleBulkDeleteBtn();
            });
        });
    },

    initEvents() {
        // Table filters
        const filterStatus = document.getElementById('filter-contact-status');
        if (filterStatus) {
            filterStatus.value = this.statusFilter;
            filterStatus.onchange = (e) => {
                this.statusFilter = e.target.value;
                this.renderTable();
            };
        }

        const contactsSearch = document.getElementById('contacts-search-input');
        if (contactsSearch) {
            contactsSearch.value = this.searchQuery;
            contactsSearch.onkeyup = (e) => {
                this.searchQuery = e.target.value.toLowerCase().trim();
                this.renderTable();
            };
        }

        // Checkbox Select All
        const selectAll = document.getElementById('select-all-contacts');
        if (selectAll) {
            selectAll.onchange = (e) => {
                const checked = e.target.checked;
                document.querySelectorAll('.select-contact-chk').forEach(chk => {
                    chk.checked = checked;
                });
                this.toggleBulkDeleteBtn();
            };
        }

        // Bulk delete execution
        const btnBulkDelete = document.getElementById('btn-bulk-delete');
        if (btnBulkDelete) {
            btnBulkDelete.onclick = () => {
                const ids = [];
                document.querySelectorAll('.select-contact-chk:checked').forEach(chk => {
                    ids.push(chk.getAttribute('data-id'));
                });

                if (confirm(`Are you sure you want to delete ${ids.length} contacts?`)) {
                    window.CRM.contacts = window.CRM.contacts.filter(c => !ids.includes(c.id));
                    // Cleanup tasks and activities
                    window.CRM.tasks = window.CRM.tasks.filter(t => !ids.includes(t.contactId));
                    window.CRM.activities = window.CRM.activities.filter(a => !ids.includes(a.contactId));
                    
                    window.CRM.saveState();
                    this.renderTable();
                    btnBulkDelete.style.display = 'none';
                    if (selectAll) selectAll.checked = false;
                }
            };
        }

        // Modal Forms
        const contactForm = document.getElementById('contact-form');
        if (contactForm) {
            contactForm.onsubmit = (e) => {
                e.preventDefault();
                this.saveContactForm();
            };
        }

        // Cancel buttons
        const btnCancelContact = document.getElementById('btn-cancel-contact');
        if (btnCancelContact) {
            btnCancelContact.onclick = () => this.closeContactModal();
        }

        const btnCloseContactModal = document.getElementById('btn-close-contact-modal');
        if (btnCloseContactModal) {
            btnCloseContactModal.onclick = () => this.closeContactModal();
        }

        // Close details modal
        const btnCloseDetailsModal = document.getElementById('btn-close-details-modal');
        if (btnCloseDetailsModal) {
            btnCloseDetailsModal.onclick = () => this.closeDetailsModal();
        }

        // Save activity logs in details panel
        const btnSaveActivity = document.getElementById('btn-save-activity');
        if (btnSaveActivity) {
            btnSaveActivity.onclick = () => this.saveActivityLog();
        }

        // Activity Logging tabs
        document.querySelectorAll('.act-tab').forEach(tab => {
            tab.onclick = () => {
                document.querySelectorAll('.act-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.activeTimelineType = tab.getAttribute('data-type');
                
                const txt = document.getElementById('activity-log-input');
                if (txt) txt.placeholder = `Type a ${this.activeTimelineType} details...`;
            };
        });

        // Edit details button inside timeline
        const btnEditCurrent = document.getElementById('btn-edit-current-contact');
        if (btnEditCurrent) {
            btnEditCurrent.onclick = () => {
                if (this.selectedContactId) {
                    this.closeDetailsModal();
                    this.openEditModal(this.selectedContactId);
                }
            };
        }
    },

    filterQuery(q) {
        this.searchQuery = q;
        const contactsSearch = document.getElementById('contacts-search-input');
        if (contactsSearch) contactsSearch.value = q;
        this.renderTable();
    },

    toggleBulkDeleteBtn() {
        const btnBulkDelete = document.getElementById('btn-bulk-delete');
        const checkedCount = document.querySelectorAll('.select-contact-chk:checked').length;
        if (btnBulkDelete) {
            if (checkedCount > 0) {
                btnBulkDelete.style.display = 'block';
                btnBulkDelete.textContent = `Delete Selected (${checkedCount})`;
            } else {
                btnBulkDelete.style.display = 'none';
            }
        }
    },

    openAddModal() {
        const modal = document.getElementById('modal-contact');
        document.getElementById('contact-modal-title').textContent = 'Create Contact';
        document.getElementById('contact-form-id').value = '';
        document.getElementById('contact-form').reset();
        if (modal) modal.classList.add('active');
    },

    openEditModal(id) {
        const modal = document.getElementById('modal-contact');
        const c = window.CRM.contacts.find(x => x.id === id);
        if (!c) return;

        document.getElementById('contact-modal-title').textContent = 'Edit Profile Details';
        document.getElementById('contact-form-id').value = c.id;
        
        document.getElementById('c-name').value = c.name || '';
        document.getElementById('c-email').value = c.email || '';
        document.getElementById('c-phone').value = c.phone || '';
        document.getElementById('c-address').value = c.address || '';
        document.getElementById('c-business').value = c.businessName || '';
        document.getElementById('c-position').value = c.position || '';
        document.getElementById('c-stage').value = c.stage || 'Lead';
        document.getElementById('c-value').value = c.value || 0;

        if (modal) modal.classList.add('active');
    },

    closeContactModal() {
        const modal = document.getElementById('modal-contact');
        if (modal) modal.classList.remove('active');
    },

    saveContactForm() {
        const id = document.getElementById('contact-form-id').value;
        const name = document.getElementById('c-name').value.trim();
        const email = document.getElementById('c-email').value.trim();
        const phone = document.getElementById('c-phone').value.trim();
        const address = document.getElementById('c-address').value.trim();
        const businessName = document.getElementById('c-business').value.trim();
        const position = document.getElementById('c-position').value.trim();
        const stage = document.getElementById('c-stage').value;
        const value = parseFloat(document.getElementById('c-value').value || 0);

        if (!name) return;

        if (id) {
            // Update
            const idx = window.CRM.contacts.findIndex(x => x.id === id);
            if (idx !== -1) {
                const old = window.CRM.contacts[idx];
                window.CRM.contacts[idx] = { ...old, name, email, phone, address, businessName, position, stage, value };
                window.CRM.logActivity(id, 'system', `Updated contact profile fields.`);
            }
        } else {
            // Create
            const newId = 'c_' + Math.random().toString(36).substr(2, 9);
            window.CRM.contacts.push({ id: newId, name, email, phone, address, businessName, position, stage, value });
            window.CRM.logActivity(newId, 'system', `Client record created.`);
        }

        window.CRM.saveState();
        this.closeContactModal();
        this.render();
    },

    deleteContact(id) {
        if (confirm('Are you sure you want to delete this contact?')) {
            window.CRM.contacts = window.CRM.contacts.filter(x => x.id !== id);
            window.CRM.tasks = window.CRM.tasks.filter(t => t.contactId !== id);
            window.CRM.activities = window.CRM.activities.filter(a => a.contactId !== id);
            
            window.CRM.saveState();
            this.render();
        }
    },

    openDetailsPanel(id) {
        const modal = document.getElementById('modal-contact-details');
        const c = window.CRM.contacts.find(x => x.id === id);
        if (!c) return;

        this.selectedContactId = id;
        
        // Render Profile Sidebar
        document.getElementById('p-avatar-init').textContent = c.name ? c.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??';
        document.getElementById('p-name').textContent = c.name;
        document.getElementById('p-position-business').textContent = (c.position || '') + (c.businessName ? ` at ${c.businessName}` : '');
        
        document.getElementById('p-email').textContent = c.email || '—';
        document.getElementById('p-phone').textContent = c.phone || '—';
        document.getElementById('p-address').textContent = c.address || '—';
        
        const stageBadge = document.getElementById('p-stage');
        stageBadge.textContent = c.stage || 'Lead';
        stageBadge.className = `status-badge ${c.stage ? c.stage.toLowerCase() : 'lead'}`;
        
        document.getElementById('p-value').textContent = window.CRM.formatCurrency(c.value || 0);

        // Render timeline
        this.renderTimeline();

        if (modal) modal.classList.add('active');
    },

    closeDetailsModal() {
        const modal = document.getElementById('modal-contact-details');
        if (modal) modal.classList.remove('active');
        this.selectedContactId = null;
        // Rerender main table to make sure any updates reflect
        this.renderTable();
    },

    renderTimeline() {
        const stream = document.getElementById('contact-timeline-stream');
        if (!stream) return;

        const timeline = window.CRM.activities.filter(a => a.contactId === this.selectedContactId);
        
        if (timeline.length === 0) {
            stream.innerHTML = `<div class="feed-empty">No logged activities. Add a note or log a call above!</div>`;
            return;
        }

        let html = '';
        timeline.forEach(act => {
            let bgClass = '';
            let iconSvg = '';

            if (act.type === 'call') {
                bgClass = 'bg-warning';
                iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>`;
            } else if (act.type === 'email') {
                bgClass = 'bg-info';
                iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>`;
            } else if (act.type === 'system') {
                bgClass = 'bg-primary';
                iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
            } else { // Note
                bgClass = 'bg-success';
                iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
            }

            const formattedTime = new Date(act.timestamp).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            html += `
                <div class="activity-feed-item">
                    <div class="feed-icon-wrap ${bgClass}">${iconSvg}</div>
                    <div class="feed-content">
                        <div class="feed-meta-row">
                            <span class="feed-user">${act.type.toUpperCase()}</span>
                            <span class="feed-time">${formattedTime}</span>
                        </div>
                        <div class="feed-text">${act.text}</div>
                    </div>
                </div>
            `;
        });

        stream.innerHTML = html;
    },

    saveActivityLog() {
        const textarea = document.getElementById('activity-log-input');
        if (!textarea) return;

        const val = textarea.value.trim();
        if (!val || !this.selectedContactId) return;

        window.CRM.logActivity(this.selectedContactId, this.activeTimelineType, val);
        textarea.value = ''; // Reset input
        this.renderTimeline(); // Refresh stream
    },

    truncate(str, n) {
        return (str.length > n) ? str.substr(0, n - 1) + '...' : str;
    }
};
