// Private CRM - Deals & Kanban Board Controller
window.CRM_Deals = {
    searchQuery: '',

    render() {
        this.renderBoard();
        this.initEvents();
    },

    renderBoard() {
        const stages = ['Lead', 'Contacted', 'Proposal Sent', 'In Negotiation', 'Won', 'Lost'];
        
        // Reset columns
        stages.forEach(stage => {
            const cardContainer = document.getElementById(`cards-${stage.replace(/ /g, '-')}`);
            if (cardContainer) cardContainer.innerHTML = '';
        });

        // Track totals per stage
        const totals = { Lead: 0, Contacted: 0, 'Proposal Sent': 0, 'In Negotiation': 0, Won: 0, Lost: 0 };
        const counts = { Lead: 0, Contacted: 0, 'Proposal Sent': 0, 'In Negotiation': 0, Won: 0, Lost: 0 };

        // Group contacts (who have deal values) into stages
        let deals = window.CRM.contacts;

        // Apply global search if defined
        if (this.searchQuery) {
            const q = this.searchQuery;
            deals = deals.filter(c => 
                c.name.toLowerCase().includes(q) ||
                (c.businessName && c.businessName.toLowerCase().includes(q))
            );
        }

        deals.forEach(c => {
            const stage = c.stage || 'Lead';
            const val = parseFloat(c.value || 0);

            if (stages.includes(stage)) {
                totals[stage] += val;
                counts[stage]++;

                const container = document.getElementById(`cards-${stage.replace(/ /g, '-')}`);
                if (container) {
                    const card = this.createCardElement(c);
                    container.appendChild(card);
                }
            }
        });

        // Update headers count & totals
        stages.forEach(stage => {
            const idStage = stage.replace(/ /g, '-');
            const totalEl = document.getElementById(`total-${idStage}`);
            const badgeEl = document.getElementById(`badge-${idStage}`);

            if (totalEl) totalEl.textContent = window.CRM.formatCurrency(totals[stage]);
            if (badgeEl) badgeEl.textContent = counts[stage];
        });

        // Initialize drag and drop handlers
        this.initDragAndDrop();
    },

    createCardElement(contact) {
        const div = document.createElement('div');
        div.className = 'kanban-card';
        div.setAttribute('draggable', 'true');
        div.setAttribute('data-id', contact.id);

        div.innerHTML = `
            <div class="card-title">${contact.businessName || 'Independent Deal'}</div>
            <div class="card-client">${contact.name}</div>
            <div class="card-footer">
                <span class="card-value">${window.CRM.formatCurrency(contact.value || 0)}</span>
                <div class="card-action-btns">
                    <button class="card-btn btn-view-deal-contact" data-id="${contact.id}">Profile</button>
                </div>
            </div>
        `;

        // Event for viewing profile
        div.querySelector('.btn-view-deal-contact').onclick = (e) => {
            e.stopPropagation();
            if (window.CRM_Contacts) {
                window.CRM_Contacts.openDetailsPanel(contact.id);
            }
        };

        return div;
    },

    initEvents() {
        // Quick add deal modal triggers
        const btnAddDealModal = document.getElementById('btn-add-deal-modal');
        if (btnAddDealModal) {
            btnAddDealModal.onclick = () => this.openAddDealModal();
        }

        const btnCloseDealModal = document.getElementById('btn-close-deal-modal');
        if (btnCloseDealModal) {
            btnCloseDealModal.onclick = () => this.closeAddDealModal();
        }

        const btnCancelDeal = document.getElementById('btn-cancel-deal');
        if (btnCancelDeal) {
            btnCancelDeal.onclick = () => this.closeAddDealModal();
        }

        const dealForm = document.getElementById('deal-form');
        if (dealForm) {
            dealForm.onsubmit = (e) => {
                e.preventDefault();
                this.saveDealForm();
            };
        }
    },

    filterQuery(q) {
        this.searchQuery = q;
        this.renderBoard();
    },

    openAddDealModal() {
        const modal = document.getElementById('modal-deal');
        const select = document.getElementById('d-contact-id');
        if (!select) return;

        // Reset selector
        select.innerHTML = '<option value="">Select a contact...</option>';
        window.CRM.contacts.forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.name} (${c.businessName || 'Individual'})</option>`;
        });

        document.getElementById('deal-form').reset();
        if (modal) modal.classList.add('active');
    },

    closeAddDealModal() {
        const modal = document.getElementById('modal-deal');
        if (modal) modal.classList.remove('active');
    },

    saveDealForm() {
        const contactId = document.getElementById('d-contact-id').value;
        const title = document.getElementById('d-title').value.trim();
        const stage = document.getElementById('d-stage').value;
        const value = parseFloat(document.getElementById('d-value').value || 0);

        if (!contactId || !title) return;

        // Associate with contact
        const contactIdx = window.CRM.contacts.findIndex(x => x.id === contactId);
        if (contactIdx !== -1) {
            const old = window.CRM.contacts[contactIdx];
            window.CRM.contacts[contactIdx] = {
                ...old,
                stage: stage,
                value: value,
                // Append custom businessName title if not defined
                businessName: old.businessName || title
            };
            window.CRM.logActivity(contactId, 'system', `Created deal "${title}" for ${window.CRM.formatCurrency(value)} in stage "${stage}".`);
            window.CRM.saveState();
        }

        this.closeAddDealModal();
        this.renderBoard();
        window.CRM.updateGlobalKPIs();
    },

    initDragAndDrop() {
        const cards = document.querySelectorAll('.kanban-card');
        const columns = document.querySelectorAll('.kanban-column');

        cards.forEach(card => {
            card.addEventListener('dragstart', () => {
                card.classList.add('dragging');
            });

            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
            });
        });

        columns.forEach(column => {
            const cardsContainer = column.querySelector('.kanban-cards');
            const stage = column.getAttribute('data-stage');

            column.addEventListener('dragover', (e) => {
                e.preventDefault();
                column.classList.add('drag-over');
            });

            column.addEventListener('dragleave', () => {
                column.classList.remove('drag-over');
            });

            column.addEventListener('drop', (e) => {
                e.preventDefault();
                column.classList.remove('drag-over');
                
                const draggingCard = document.querySelector('.dragging');
                if (!draggingCard) return;

                const contactId = draggingCard.getAttribute('data-id');
                const contact = window.CRM.contacts.find(c => c.id === contactId);
                
                if (contact && contact.stage !== stage) {
                    const oldStage = contact.stage || 'Lead';
                    contact.stage = stage;
                    
                    // Log movement activity
                    window.CRM.logActivity(contactId, 'system', `Moved pipeline deal stage from "${oldStage}" to "${stage}".`);
                    window.CRM.saveState();
                    
                    // Rerender Board
                    this.renderBoard();
                    window.CRM.updateGlobalKPIs();
                }
            });
        });
    }
};
