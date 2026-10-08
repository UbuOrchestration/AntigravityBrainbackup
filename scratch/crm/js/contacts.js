// Private CRM - Contacts Controller
window.CRM_Contacts = {
    selectedContactId: null,
    
    // Filters State
    nameFilter: '',
    businessFilter: '',
    statusFilter: 'all',
    stateFilter: 'all',
    recordFilter: '',

    // Pagination State
    currentPage: 1,
    perPage: 25, // default 25 (options: 25, 50, 100, 'all')

    activeTimelineType: 'note',
    isNoteFlagged: false,
    initialized: false,

    render() {
        if (!this.initialized) {
            this.initEvents();
            this.initialized = true;
        }
        this.populateStateOptions();
        this.renderTable();
    },

    populateStateOptions() {
        const selectState = document.getElementById('filter-contact-state');
        if (!selectState) return;

        const states = Array.from(new Set(
            (window.CRM.contacts || [])
                .map(c => c.stateRegion ? c.stateRegion.trim() : '')
                .filter(Boolean)
        )).sort();

        const currentVal = this.stateFilter || selectState.value || 'all';

        let html = '<option value="all">All States / Regions</option>';
        states.forEach(st => {
            html += `<option value="${st}">${st}</option>`;
        });

        selectState.innerHTML = html;
        selectState.value = currentVal;
    },

    filterByStatus(statusName) {
        this.statusFilter = statusName;
        this.currentPage = 1;
        const selectStatus = document.getElementById('filter-contact-status');
        if (selectStatus) selectStatus.value = statusName;
        this.renderTable();
    },

    resetFilters() {
        this.nameFilter = '';
        this.businessFilter = '';
        this.statusFilter = 'all';
        this.stateFilter = 'all';
        this.recordFilter = '';
        this.currentPage = 1;

        const fName = document.getElementById('filter-contact-name');
        if (fName) fName.value = '';

        const fBus = document.getElementById('filter-contact-business');
        if (fBus) fBus.value = '';

        const fStatus = document.getElementById('filter-contact-status');
        if (fStatus) fStatus.value = 'all';

        const fState = document.getElementById('filter-contact-state');
        if (fState) fState.value = 'all';

        const fRec = document.getElementById('filter-contact-record');
        if (fRec) fRec.value = '';

        this.renderTable();
    },

    renderTable() {
        const tbody = document.getElementById('contacts-table-body');
        if (!tbody) return;

        // Apply multi-column filters
        let filtered = window.CRM.contacts || [];

        if (this.nameFilter) {
            const q = this.nameFilter.toLowerCase();
            filtered = filtered.filter(c => c.name && c.name.toLowerCase().includes(q));
        }

        if (this.businessFilter) {
            const q = this.businessFilter.toLowerCase();
            filtered = filtered.filter(c => c.businessName && c.businessName.toLowerCase().includes(q));
        }

        if (this.statusFilter !== 'all') {
            filtered = filtered.filter(c => (c.leadStatus || c.stage) === this.statusFilter);
        }

        if (this.stateFilter !== 'all') {
            filtered = filtered.filter(c => c.stateRegion && c.stateRegion.trim() === this.stateFilter);
        }

        if (this.recordFilter) {
            const q = this.recordFilter.toLowerCase();
            filtered = filtered.filter(c => 
                (c.recordId && c.recordId.toLowerCase().includes(q)) ||
                (c.email && c.email.toLowerCase().includes(q)) ||
                (c.phone && c.phone.includes(q))
            );
        }

        const totalRecords = filtered.length;

        if (totalRecords === 0) {
            tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-muted">No client records match the current filters.</td></tr>`;
            this.updatePagination(0, 0, 0, 0);
            return;
        }

        // Pagination calculations
        let displayList = filtered;
        let totalPages = 1;
        
        if (this.perPage !== 'all') {
            const limit = parseInt(this.perPage, 10) || 25;
            totalPages = Math.ceil(totalRecords / limit);

            // Clamp page range
            if (this.currentPage > totalPages) this.currentPage = totalPages;
            if (this.currentPage < 1) this.currentPage = 1;

            const startIndex = (this.currentPage - 1) * limit;
            const endIndex = Math.min(startIndex + limit, totalRecords);
            displayList = filtered.slice(startIndex, endIndex);

            this.updatePagination(startIndex + 1, endIndex, totalRecords, totalPages);
        } else {
            this.currentPage = 1;
            this.updatePagination(1, totalRecords, totalRecords, 1);
        }

        let html = '';
        displayList.forEach(c => {
            const initials = (c.name || '').trim().split(/\s+/).filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??';
            const currentStatus = c.leadStatus || c.stage || 'No Contact Yet';
            
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
                    <td>${c.phone ? window.CRM.formatPhoneNumber(c.phone) : '<span class="text-dim">—</span>'}</td>
                    <td>
                        <select class="quick-status-select row-status-select" data-id="${c.id}" data-status="${currentStatus}" onclick="event.stopPropagation()">
                            <option value="Hot Lead" ${currentStatus === 'Hot Lead' ? 'selected' : ''}>Hot Lead</option>
                            <option value="Cold Lead" ${currentStatus === 'Cold Lead' ? 'selected' : ''}>Cold Lead</option>
                            <option value="Cold Lead - AI Scraped" ${currentStatus === 'Cold Lead - AI Scraped' ? 'selected' : ''}>Cold Lead - AI Scraped</option>
                            <option value="Prospect" ${currentStatus === 'Prospect' ? 'selected' : ''}>Prospect</option>
                            <option value="Current Client" ${currentStatus === 'Current Client' ? 'selected' : ''}>Current Client</option>
                            <option value="Inactive Client" ${currentStatus === 'Inactive Client' ? 'selected' : ''}>Inactive Client</option>
                            <option value="Interested Follow Up" ${currentStatus === 'Interested Follow Up' ? 'selected' : ''}>Interested Follow Up</option>
                            <option value="Uninterested - Follow up" ${currentStatus === 'Uninterested - Follow up' ? 'selected' : ''}>Uninterested - Follow up</option>
                            <option value="Attempted to Contact" ${currentStatus === 'Attempted to Contact' ? 'selected' : ''}>Attempted to Contact</option>
                            <option value="No Contact Yet" ${currentStatus === 'No Contact Yet' ? 'selected' : ''}>No Contact Yet</option>
                            <option value="In Progress" ${currentStatus === 'In Progress' ? 'selected' : ''}>In Progress</option>
                            <option value="Subconsultant" ${currentStatus === 'Subconsultant' ? 'selected' : ''}>Subconsultant</option>
                            <option value="Spam" ${currentStatus === 'Spam' ? 'selected' : ''}>Spam</option>
                        </select>
                    </td>
                    <td class="font-mono">${c.recordId || c.id || '—'}</td>
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

        // Bind quick status dropdown change handler
        document.querySelectorAll('.row-status-select').forEach(sel => {
            sel.addEventListener('change', (e) => {
                e.stopPropagation();
                const id = sel.getAttribute('data-id');
                const newStatus = sel.value;

                const selectedChks = document.querySelectorAll('.select-contact-chk:checked');
                const checkedIds = Array.from(selectedChks).map(chk => chk.getAttribute('data-id'));

                if (checkedIds.length > 1 && checkedIds.includes(id)) {
                    this.bulkUpdateContactStatus(checkedIds, newStatus);
                } else {
                    this.updateContactStatus(id, newStatus);
                }
            });
        });

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
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                this.openEditModal(id);
            });
        });

        document.querySelectorAll('.btn-delete-contact').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
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

    updatePagination(start, end, total, totalPages) {
        const infoEl = document.getElementById('contacts-pagination-info');
        if (infoEl) {
            infoEl.textContent = total > 0 ? `Showing ${start}-${end} of ${total} contacts` : '0 contacts';
        }

        const pageNumEl = document.getElementById('contacts-page-num');
        if (pageNumEl) {
            pageNumEl.textContent = `Page ${this.currentPage} of ${totalPages || 1}`;
        }

        const btnPrev = document.getElementById('btn-prev-page');
        if (btnPrev) btnPrev.disabled = this.currentPage <= 1;

        const btnNext = document.getElementById('btn-next-page');
        if (btnNext) btnNext.disabled = this.currentPage >= totalPages || totalPages === 0;
    },

    initEvents() {
        // Multi-column Header Filter Inputs
        const fName = document.getElementById('filter-contact-name');
        if (fName) {
            fName.onkeyup = (e) => {
                this.nameFilter = e.target.value.trim();
                this.currentPage = 1;
                this.renderTable();
            };
        }

        const fBus = document.getElementById('filter-contact-business');
        if (fBus) {
            fBus.onkeyup = (e) => {
                this.businessFilter = e.target.value.trim();
                this.currentPage = 1;
                this.renderTable();
            };
        }

        const fStatus = document.getElementById('filter-contact-status');
        if (fStatus) {
            fStatus.value = this.statusFilter;
            fStatus.onchange = (e) => {
                this.statusFilter = e.target.value;
                this.currentPage = 1;
                this.renderTable();
            };
        }

        const fState = document.getElementById('filter-contact-state');
        if (fState) {
            fState.value = this.stateFilter;
            fState.onchange = (e) => {
                this.stateFilter = e.target.value;
                this.currentPage = 1;
                this.renderTable();
            };
        }

        const fRec = document.getElementById('filter-contact-record');
        if (fRec) {
            fRec.onkeyup = (e) => {
                this.recordFilter = e.target.value.trim();
                this.currentPage = 1;
                this.renderTable();
            };
        }

        const btnReset = document.getElementById('btn-reset-filters');
        if (btnReset) {
            btnReset.onclick = () => this.resetFilters();
        }

        // Pagination Controls
        const selectPerPage = document.getElementById('contacts-per-page');
        if (selectPerPage) {
            selectPerPage.value = this.perPage;
            selectPerPage.onchange = (e) => {
                this.perPage = e.target.value;
                this.currentPage = 1;
                this.renderTable();
            };
        }

        const btnPrev = document.getElementById('btn-prev-page');
        if (btnPrev) {
            btnPrev.onclick = () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.renderTable();
                }
            };
        }

        const btnNext = document.getElementById('btn-next-page');
        if (btnNext) {
            btnNext.onclick = () => {
                this.currentPage++;
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
                const selectedChks = document.querySelectorAll('.select-contact-chk:checked');
                if (selectedChks.length === 0) return;

                const ids = Array.from(selectedChks).map(chk => chk.getAttribute('data-id'));
                const randomCode = Math.floor(Math.random() * 10);

                const userInput = prompt(
                    `⚠️ BULK DELETE CONFIRMATION REQUIRED\n\n` +
                    `You are about to permanently delete ${ids.length} selected contact(s).\n` +
                    `To confirm deletion, please type the single-digit verification number below:\n\n` +
                    `Verification Number (0-9): ${randomCode}`
                );

                if (userInput === null) return;

                if (parseInt(userInput.trim(), 10) === randomCode) {
                    ids.forEach(id => {
                        const c = window.CRM.findContact(id);
                        if (c) {
                            window.CRM.registerDeletedContact(c.id);
                            window.CRM.registerDeletedContact(c.recordId);
                        }
                        window.CRM.registerDeletedContact(id);
                    });
                    window.CRM.contacts = window.CRM.contacts.filter(c => !ids.some(id => window.CRM.isSameContact(c.id, id) || window.CRM.isSameContact(c.recordId, id)));
                    window.CRM.tasks = window.CRM.tasks.filter(t => !ids.some(id => window.CRM.isSameContact(t.contactId, id)));
                    window.CRM.activities = window.CRM.activities.filter(a => !ids.some(id => window.CRM.isSameContact(a.contactId, id)));

                    window.CRM.markDirty();
                    window.CRM.saveState();
                    this.renderTable();
                    btnBulkDelete.style.display = 'none';
                    if (selectAll) selectAll.checked = false;
                    alert(`${ids.length} contact(s) deleted successfully.`);
                } else {
                    alert(`❌ Incorrect confirmation code (${userInput}). Bulk deletion cancelled.`);
                }
            };
        }

        // Bulk status toolbar dropdown listener
        const selectBulkStatus = document.getElementById('select-bulk-status');
        if (selectBulkStatus) {
            selectBulkStatus.onchange = (e) => {
                const newStatus = e.target.value;
                if (!newStatus) return;
                const selectedChks = document.querySelectorAll('.select-contact-chk:checked');
                const ids = Array.from(selectedChks).map(chk => chk.getAttribute('data-id'));
                if (ids.length > 0) {
                    this.bulkUpdateContactStatus(ids, newStatus);
                }
                selectBulkStatus.value = '';
            };
        }

        // New Contact Button Triggers
        const btnAddContactsPage = document.getElementById('btn-contacts-page-add-contact');
        if (btnAddContactsPage) {
            btnAddContactsPage.onclick = () => this.openAddModal();
        }

        const btnAddHeaderModal = document.getElementById('btn-add-contact-modal');
        if (btnAddHeaderModal) {
            btnAddHeaderModal.onclick = () => this.openAddModal();
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

        // Red Flag toggle button for notes
        const btnFlag = document.getElementById('btn-toggle-note-flag');
        if (btnFlag) {
            btnFlag.onclick = () => {
                this.isNoteFlagged = !this.isNoteFlagged;
                const txt = document.getElementById('flag-btn-text');
                if (this.isNoteFlagged) {
                    btnFlag.classList.add('active');
                    if (txt) txt.textContent = '🚩 Flagged for 9 AM Email';
                } else {
                    btnFlag.classList.remove('active');
                    if (txt) txt.textContent = 'Flag for 9 AM Reminder';
                }
            };
        }

        // Save activity logs in details panel
        const btnSaveActivity = document.getElementById('btn-save-activity');
        if (btnSaveActivity) {
            btnSaveActivity.onclick = () => this.saveActivityLog();
        }

        // Enter key shortcut for note textarea (Shift+Enter for line break)
        const txtInput = document.getElementById('activity-log-input');
        if (txtInput) {
            txtInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.saveActivityLog();
                }
            });
        }

        // Activity Logging tabs
        document.querySelectorAll('.act-tab').forEach(tab => {
            tab.onclick = () => {
                document.querySelectorAll('.act-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.activeTimelineType = tab.getAttribute('data-type');
                
                const txt = document.getElementById('activity-log-input');
                if (txt) txt.placeholder = `Type a ${this.activeTimelineType} details... (Press Enter to save instantly)`;
            };
        });

        // Edit details button inside timeline / profile lander
        const btnEditCurrent = document.getElementById('btn-edit-current-contact');
        if (btnEditCurrent) {
            btnEditCurrent.onclick = () => {
                if (this.selectedContactId) {
                    this.toggleProfileEditMode(true);
                }
            };
        }

        // Delete contact button inside profile lander
        const btnDeleteCurrent = document.getElementById('btn-delete-current-contact');
        if (btnDeleteCurrent) {
            btnDeleteCurrent.onclick = () => {
                if (this.selectedContactId) {
                    this.deleteContact(this.selectedContactId);
                }
            };
        }

        const btnSaveProfileLander = document.getElementById('btn-save-profile-lander');
        if (btnSaveProfileLander) {
            btnSaveProfileLander.onclick = () => this.saveProfileLander();
        }

        const btnCancelProfileLander = document.getElementById('btn-cancel-profile-lander');
        if (btnCancelProfileLander) {
            btnCancelProfileLander.onclick = () => this.toggleProfileEditMode(false);
        }
    },

    async updateContactStatus(id, newStatus) {
        const c = window.CRM.findContact(id);
        if (!c) return;

        const oldStatus = c.leadStatus || c.stage || 'No Contact Yet';
        if (oldStatus === newStatus) return;

        c.leadStatus = newStatus;
        c.stage = newStatus;

        window.CRM.logActivity(id, 'system', `Status changed from "${oldStatus}" to "${newStatus}"`);
        window.CRM.markDirty();
        await window.CRM.saveState();
        window.CRM.clearDirty();

        // Update detail drawer dropdown if open
        const pSelect = document.getElementById('p-stage-select');
        if (pSelect && window.CRM.isSameContact(this.selectedContactId, id)) {
            pSelect.value = newStatus;
            pSelect.setAttribute('data-status', newStatus);
        }

        // Refresh table and global KPIs across app
        this.renderTable();
        window.CRM.updateGlobalKPIs();
        if (window.CRM_Dashboard) window.CRM_Dashboard.render();
    },

    async bulkUpdateContactStatus(ids, newStatus) {
        if (!ids || ids.length === 0 || !newStatus) return;

        let updatedCount = 0;
        ids.forEach(id => {
            const c = window.CRM.findContact(id);
            if (c) {
                const oldStatus = c.leadStatus || c.stage || 'No Contact Yet';
                if (oldStatus !== newStatus) {
                    c.leadStatus = newStatus;
                    c.stage = newStatus;
                    window.CRM.logActivity(id, 'system', `Bulk status updated from "${oldStatus}" to "${newStatus}"`);
                    updatedCount++;
                }
            }
        });

        if (updatedCount > 0) {
            window.CRM.markDirty();
            await window.CRM.saveState();
            window.CRM.clearDirty();
        }

        const selectAll = document.getElementById('select-all-contacts');
        if (selectAll) selectAll.checked = false;

        this.renderTable();
        this.toggleBulkDeleteBtn();
        window.CRM.updateGlobalKPIs();
        if (window.CRM_Dashboard) window.CRM_Dashboard.render();
    },

    filterQuery(q) {
        this.nameFilter = q;
        this.currentPage = 1;
        const fName = document.getElementById('filter-contact-name');
        if (fName) fName.value = q;
        this.renderTable();
    },

    toggleBulkDeleteBtn() {
        const btnBulkDelete = document.getElementById('btn-bulk-delete');
        const selectBulkStatus = document.getElementById('select-bulk-status');
        const checkedCount = document.querySelectorAll('.select-contact-chk:checked').length;

        if (btnBulkDelete) {
            if (checkedCount > 0) {
                btnBulkDelete.style.display = 'inline-block';
                btnBulkDelete.textContent = `Delete Selected (${checkedCount})`;
            } else {
                btnBulkDelete.style.display = 'none';
            }
        }

        if (selectBulkStatus) {
            if (checkedCount > 0) {
                selectBulkStatus.style.display = 'inline-block';
                const defaultOpt = selectBulkStatus.options[0];
                if (defaultOpt) defaultOpt.textContent = `⚡ Bulk Change Status (${checkedCount})...`;
                selectBulkStatus.value = '';
            } else {
                selectBulkStatus.style.display = 'none';
            }
        }
    },

    openAddModal() {
        const modal = document.getElementById('modal-contact');
        document.getElementById('contact-modal-title').textContent = 'Create New Contact';
        document.getElementById('contact-form-id').value = '';
        document.getElementById('contact-form').reset();
        const webEl = document.getElementById('c-website');
        if (webEl) webEl.value = '';
        const noteEl = document.getElementById('c-note');
        if (noteEl) noteEl.value = '';
        if (modal) modal.classList.add('active');
    },

    openEditModal(id) {
        const modal = document.getElementById('modal-contact');
        const c = window.CRM.findContact(id);
        if (!c) return;

        document.getElementById('contact-modal-title').textContent = 'Edit Profile Details';
        document.getElementById('contact-form-id').value = c.id;
        
        document.getElementById('c-name').value = c.name || '';
        document.getElementById('c-email').value = c.email || '';
        document.getElementById('c-phone').value = window.CRM ? window.CRM.formatPhoneNumber(c.phone || '') : (c.phone || '');
        document.getElementById('c-address').value = c.stateRegion || c.address || '';
        document.getElementById('c-business').value = c.businessName || c.companyName || '';
        document.getElementById('c-position').value = c.position || '';
        document.getElementById('c-stage').value = c.leadStatus || c.stage || 'No Contact Yet';
        document.getElementById('c-value').value = c.value || 0;

        const webEl = document.getElementById('c-website');
        if (webEl) webEl.value = c.websiteUrl || c.website || '';
        const noteEl = document.getElementById('c-note');
        if (noteEl) noteEl.value = c.associatedNote || '';

        if (modal) modal.classList.add('active');
    },

    closeContactModal() {
        const modal = document.getElementById('modal-contact');
        if (modal) modal.classList.remove('active');
    },

    async saveContactForm() {
        const submitBtn = document.querySelector('#contact-form button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '⏳ Saving to Disk...';
        }

        const id = document.getElementById('contact-form-id').value;
        const name = document.getElementById('c-name').value.trim();
        const email = document.getElementById('c-email').value.trim();
        const rawPhone = document.getElementById('c-phone').value.trim();
        const phone = window.CRM ? window.CRM.formatPhoneNumber(rawPhone) : rawPhone;
        const address = document.getElementById('c-address').value.trim();
        const businessName = document.getElementById('c-business').value.trim();
        const position = document.getElementById('c-position').value.trim();
        const stage = document.getElementById('c-stage').value;
        const value = parseFloat(document.getElementById('c-value').value || 0);
        const websiteUrl = document.getElementById('c-website') ? document.getElementById('c-website').value.trim() : '';
        const associatedNote = document.getElementById('c-note') ? document.getElementById('c-note').value.trim() : '';

        if (!name) {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Save Contact';
            }
            return;
        }

        const parts = name.split(' ');
        const firstName = parts[0] || name;
        const lastName = parts.slice(1).join(' ') || '';

        if (id) {
            // Update
            const idx = window.CRM.contacts.findIndex(x => window.CRM.isSameContact(x.id, id) || window.CRM.isSameContact(x.recordId, id));
            if (idx !== -1) {
                const old = window.CRM.contacts[idx];
                window.CRM.contacts[idx] = { 
                    ...old, 
                    name, 
                    firstName, 
                    lastName, 
                    email, 
                    phone, 
                    address, 
                    stateRegion: address, 
                    businessName, 
                    companyName: businessName, 
                    position, 
                    leadStatus: stage, 
                    stage: stage, 
                    value,
                    websiteUrl,
                    associatedNote
                };
                window.CRM.logActivity(id, 'system', `Updated contact profile fields.`);
                if (associatedNote && associatedNote !== old.associatedNote) {
                    window.CRM.logActivity(id, 'note', associatedNote);
                }
            }
        } else {
            // Create
            const newId = 'c_' + Math.random().toString(36).substr(2, 9);
            window.CRM.contacts.push({ 
                id: newId, 
                recordId: newId, 
                name, 
                firstName, 
                lastName, 
                email, 
                phone, 
                address, 
                stateRegion: address, 
                businessName, 
                companyName: businessName, 
                position, 
                leadStatus: stage, 
                stage: stage, 
                value,
                websiteUrl,
                associatedNote
            });
            window.CRM.logActivity(newId, 'system', `Client record created.`);
            if (associatedNote) {
                window.CRM.logActivity(newId, 'note', associatedNote);
            }
        }

        window.CRM.markDirty();
        await window.CRM.saveState();
        window.CRM.clearDirty();

        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Save Contact';
        }

        this.closeContactModal();
        this.render();
    },

    async deleteContact(id) {
        const c = window.CRM.findContact(id);
        const nameStr = c ? c.name : 'this contact';
        const randomCode = Math.floor(Math.random() * 10);

        const userInput = prompt(
            `⚠️ DELETE CONTACT CONFIRMATION\n\n` +
            `You are about to permanently delete "${nameStr}".\n` +
            `To confirm deletion, please type the single-digit verification number below:\n\n` +
            `Verification Number (0-9): ${randomCode}`
        );

        if (userInput === null) return;

        if (parseInt(userInput.trim(), 10) === randomCode) {
            if (c) {
                window.CRM.registerDeletedContact(c.id);
                window.CRM.registerDeletedContact(c.recordId);
            }
            window.CRM.registerDeletedContact(id);
            window.CRM.contacts = window.CRM.contacts.filter(x => !window.CRM.isSameContact(x.id, id) && !window.CRM.isSameContact(x.recordId, id));
            window.CRM.tasks = window.CRM.tasks.filter(t => !window.CRM.isSameContact(t.contactId, id));
            window.CRM.activities = window.CRM.activities.filter(a => !window.CRM.isSameContact(a.contactId, id));

            window.CRM.markDirty();
            await window.CRM.saveState();
            window.CRM.clearDirty();

            if (this.selectedContactId && window.CRM.isSameContact(this.selectedContactId, id)) {
                this.closeDetailsModal();
            }
            this.render();
            alert(`Contact "${nameStr}" has been permanently deleted.`);
        } else {
            alert(`❌ Incorrect verification code (${userInput}). Deletion cancelled.`);
        }
    },

    toggleProfileEditMode(showEdit) {
        const vBox = document.getElementById('p-view-container');
        const eBox = document.getElementById('p-edit-container');
        if (!vBox || !eBox) return;

        if (showEdit) {
            const c = window.CRM.findContact(this.selectedContactId);
            if (!c) return;

            const peName = document.getElementById('pe-name');
            if (peName) peName.value = c.name || '';

            const peBus = document.getElementById('pe-business');
            if (peBus) peBus.value = c.businessName || c.companyName || '';

            const pePos = document.getElementById('pe-position');
            if (pePos) pePos.value = c.position || '';

            const peEmail = document.getElementById('pe-email');
            if (peEmail) peEmail.value = c.email || '';

            const pePhone = document.getElementById('pe-phone');
            if (pePhone) pePhone.value = window.CRM ? window.CRM.formatPhoneNumber(c.phone || '') : (c.phone || '');

            const peReg = document.getElementById('pe-region');
            if (peReg) peReg.value = c.stateRegion || c.address || '';

            const peWeb = document.getElementById('pe-website');
            if (peWeb) peWeb.value = c.websiteUrl || '';

            const peStage = document.getElementById('pe-stage');
            if (peStage) peStage.value = c.leadStatus || c.stage || 'No Contact Yet';

            const peNote = document.getElementById('pe-note');
            if (peNote) peNote.value = c.associatedNote || '';

            vBox.style.display = 'none';
            eBox.style.display = 'block';
        } else {
            eBox.style.display = 'none';
            vBox.style.display = 'block';
        }
    },

    async saveProfileLander() {
        if (!this.selectedContactId) return;

        const saveBtn = document.getElementById('btn-save-profile-lander');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '⏳ Saving...';
        }

        const c = window.CRM.findContact(this.selectedContactId);
        if (!c) {
            if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '💾 Save Settings'; }
            return;
        }

        const nameEl = document.getElementById('pe-name');
        const name = nameEl ? nameEl.value.trim() : c.name;
        if (!name) {
            if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '💾 Save Settings'; }
            return;
        }

        const parts = name.split(' ');
        const firstName = parts[0] || name;
        const lastName = parts.slice(1).join(' ') || '';

        const businessName = document.getElementById('pe-business') ? document.getElementById('pe-business').value.trim() : (c.businessName || '');
        const position = document.getElementById('pe-position') ? document.getElementById('pe-position').value.trim() : (c.position || '');
        const email = document.getElementById('pe-email') ? document.getElementById('pe-email').value.trim() : (c.email || '');
        const rawPhone = document.getElementById('pe-phone') ? document.getElementById('pe-phone').value.trim() : (c.phone || '');
        const phone = window.CRM ? window.CRM.formatPhoneNumber(rawPhone) : rawPhone;
        const region = document.getElementById('pe-region') ? document.getElementById('pe-region').value.trim() : (c.stateRegion || '');
        const websiteUrl = document.getElementById('pe-website') ? document.getElementById('pe-website').value.trim() : (c.websiteUrl || '');
        const stage = document.getElementById('pe-stage') ? document.getElementById('pe-stage').value : (c.leadStatus || 'No Contact Yet');
        const note = document.getElementById('pe-note') ? document.getElementById('pe-note').value.trim() : (c.associatedNote || '');

        const idx = window.CRM.contacts.findIndex(x => window.CRM.isSameContact(x.id, this.selectedContactId) || window.CRM.isSameContact(x.recordId, this.selectedContactId));
        if (idx !== -1) {
            window.CRM.contacts[idx] = {
                ...c,
                name,
                firstName,
                lastName,
                businessName,
                companyName: businessName,
                position,
                email,
                phone,
                address: region,
                stateRegion: region,
                websiteUrl,
                leadStatus: stage,
                stage: stage,
                associatedNote: note
            };

            window.CRM.logActivity(c.id, 'system', `Updated contact profile settings via Profile Lander.`);
            window.CRM.markDirty();
            await window.CRM.saveState();
            window.CRM.clearDirty();
        }

        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '💾 Save Settings';
        }

        this.openDetailsPanel(c.id);
        this.toggleProfileEditMode(false);
        this.renderTable();
        window.CRM.updateGlobalKPIs();
        if (window.CRM_Dashboard) window.CRM_Dashboard.render();
    },

    openDetailsPanel(id) {
        const modal = document.getElementById('modal-contact-details');
        const c = window.CRM.findContact(id);
        if (!c) return;

        this.selectedContactId = id;
        this.toggleProfileEditMode(false);
        
        // Render Profile Sidebar
        document.getElementById('p-avatar-init').textContent = c.name ? c.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??';
        document.getElementById('p-name').textContent = c.name;
        document.getElementById('p-position-business').textContent = (c.position || '') + (c.businessName ? ` at ${c.businessName}` : '');
        
        const recordIdEl = document.getElementById('p-record-id');
        if (recordIdEl) recordIdEl.textContent = c.recordId || c.id || '—';

        document.getElementById('p-email').textContent = c.email || '—';
        document.getElementById('p-phone').textContent = c.phone ? window.CRM.formatPhoneNumber(c.phone) : '—';
        
        const regionEl = document.getElementById('p-region');
        if (regionEl) regionEl.textContent = c.stateRegion || '—';

        const webEl = document.getElementById('p-website');
        if (webEl) {
            if (c.websiteUrl) {
                const url = c.websiteUrl.startsWith('http') ? c.websiteUrl : `https://${c.websiteUrl}`;
                webEl.innerHTML = `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: var(--color-primary); text-decoration: underline;">${c.websiteUrl}</a>`;
            } else {
                webEl.textContent = '—';
            }
        }

        const pSelect = document.getElementById('p-stage-select');
        if (pSelect) {
            const status = c.leadStatus || c.stage || 'No Contact Yet';
            pSelect.value = status;
            pSelect.setAttribute('data-status', status);
            pSelect.onchange = (e) => {
                this.updateContactStatus(id, e.target.value);
            };
        }
        
        const dateInput = document.getElementById('activity-date-input');
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = today;
        }

        const pValEl = document.getElementById('p-value');
        if (pValEl) pValEl.textContent = 'Active Record';

        const noteContainer = document.getElementById('p-note-container');
        const noteEl = document.getElementById('p-note');
        if (noteContainer && noteEl) {
            if (c.associatedNote) {
                noteEl.textContent = c.associatedNote;
                noteContainer.style.display = 'block';
            } else {
                noteContainer.style.display = 'none';
            }
        }

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

        const selectedContact = window.CRM.findContact(this.selectedContactId);
        const validIds = new Set();
        if (this.selectedContactId) {
            validIds.add(String(this.selectedContactId));
            validIds.add(String(this.selectedContactId).replace(/^k_/, ''));
        }
        if (selectedContact) {
            if (selectedContact.id) {
                validIds.add(String(selectedContact.id));
                validIds.add(String(selectedContact.id).replace(/^k_/, ''));
            }
            if (selectedContact.recordId) {
                validIds.add(String(selectedContact.recordId));
                validIds.add(String(selectedContact.recordId).replace(/^k_/, ''));
            }
        }
        const timeline = window.CRM.activities.filter(a => a.contactId && (validIds.has(String(a.contactId)) || validIds.has(String(a.contactId).replace(/^k_/, ''))));
        
        if (timeline.length === 0) {
            stream.innerHTML = `<div class="feed-empty">No logged activities. Add a note or log a call above!</div>`;
            return;
        }

        let html = '';
        timeline.forEach(act => {
            const dateObj = new Date(act.timestamp || Date.now());
            const dateFormatted = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const timeFormatted = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const isFlagged = act.isFlagged || (act.text && act.text.includes('🚩'));

            if (act.type === 'note') {
                html += `
                    <div class="dated-doc-card ${isFlagged ? 'flagged' : ''}">
                        <div class="dated-doc-header">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span class="dated-doc-badge">${isFlagged ? '🚩 FLAGGED FOR 9 AM EMAIL' : 'Filed Note'} — ${dateFormatted}</span>
                                <button class="flag-action-btn" data-actid="${act.id}" title="${isFlagged ? 'Unflag note' : 'Flag note for 9 AM email digest'}">${isFlagged ? '🚩' : '🏳️'}</button>
                            </div>
                            <span class="dated-doc-time">${timeFormatted}</span>
                        </div>
                        <div class="dated-doc-body">${act.text.replace(/🚩\s*FLAGGED FOR 9 AM REMINDER:?\s*/g, '')}</div>
                    </div>
                `;
            } else {
                let bgClass = act.type === 'call' ? 'bg-warning' : (act.type === 'email' ? 'bg-info' : 'bg-primary');
                let iconSvg = act.type === 'call' ? 
                    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>` : 
                    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;

                html += `
                    <div class="activity-feed-item">
                        <div class="feed-icon-wrap ${bgClass}">${iconSvg}</div>
                        <div class="feed-content">
                            <div class="feed-meta-row">
                                <span class="feed-user">${act.type.toUpperCase()}</span>
                                <span class="feed-time">${dateFormatted} ${timeFormatted}</span>
                            </div>
                            <div class="feed-text">${act.text}</div>
                        </div>
                    </div>
                `;
            }
        });

        stream.innerHTML = html;

        // Bind flag action toggle buttons on timeline cards
        document.querySelectorAll('.flag-action-btn').forEach(btn => {
            btn.onclick = () => {
                const actId = btn.getAttribute('data-actid');
                this.toggleActivityFlag(actId);
            };
        });
    },

    toggleActivityFlag(actId) {
        const act = window.CRM.activities.find(a => a.id === actId);
        if (act) {
            act.isFlagged = !act.isFlagged;
            window.CRM.markDirty();
            window.CRM.saveState();
            this.renderTimeline();
        }
    },

    saveActivityLog() {
        const textarea = document.getElementById('activity-log-input');
        if (!textarea) return;

        let val = textarea.value.trim();
        if (!val || !this.selectedContactId) return;

        const dateInput = document.getElementById('activity-date-input');
        let timestamp;

        if (dateInput && dateInput.value) {
            const now = new Date();
            const [y, m, d] = dateInput.value.split('-').map(Number);
            const customDate = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
            timestamp = customDate.toISOString();
        } else {
            timestamp = new Date().toISOString();
        }

        const isFlagged = this.isNoteFlagged;

        const activity = {
            id: 'act_' + Math.random().toString(36).substr(2, 9),
            contactId: this.selectedContactId,
            type: this.activeTimelineType,
            text: isFlagged ? `🚩 FLAGGED FOR 9 AM REMINDER:\n${val}` : val,
            isFlagged: isFlagged,
            timestamp: timestamp
        };

        const contact = window.CRM.findContact(this.selectedContactId);
        if (contact) {
            contact.associatedNote = val;
        }

        window.CRM.activities.unshift(activity);
        window.CRM.markDirty();
        window.CRM.saveState();

        // Reset input & flag state
        textarea.value = '';
        this.isNoteFlagged = false;
        const btnFlag = document.getElementById('btn-toggle-note-flag');
        const flagTxt = document.getElementById('flag-btn-text');
        if (btnFlag) btnFlag.classList.remove('active');
        if (flagTxt) flagTxt.textContent = 'Flag for 9 AM Reminder';

        this.renderTimeline(); // Refresh stream
    },

    truncate(str, n) {
        if (!str) return '';
        const s = String(str);
        return (s.length > n) ? s.substr(0, n - 1) + '...' : s;
    }
};

// Safety auto-render on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    if (window.CRM_Contacts) window.CRM_Contacts.render();
});
