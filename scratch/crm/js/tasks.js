// Private CRM - Task Board Controller
window.CRM_Tasks = {
    render() {
        this.renderList();
        this.initEvents();
    },

    renderList() {
        const pendingList = document.getElementById('pending-tasks-list');
        const completedList = document.getElementById('completed-tasks-list');

        if (!pendingList || !completedList) return;

        const pending = window.CRM.tasks.filter(t => !t.completed);
        const completed = window.CRM.tasks.filter(t => t.completed);

        const todayStr = new Date().toISOString().split('T')[0];

        // 1. Render Pending
        if (pending.length === 0) {
            pendingList.innerHTML = `<div class="empty-state">No pending tasks. Keep it up!</div>`;
        } else {
            let html = '';
            pending.forEach(t => {
                const contact = window.CRM.contacts.find(c => c.id === t.contactId);
                const isOverdue = t.date < todayStr;
                const formattedDate = window.CRM.formatDate(t.date);

                html += `
                    <div class="task-item" data-id="${t.id}">
                        <input type="checkbox" class="task-chk-btn" data-id="${t.id}">
                        <div class="task-details">
                            <div class="task-text">${t.title}</div>
                            <div class="task-meta">
                                <span class="task-date ${isOverdue ? 'overdue' : ''}">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px; height:12px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                    ${isOverdue ? 'Overdue: ' : ''}${formattedDate}
                                </span>
                                ${contact ? `<span class="task-assoc" data-cid="${contact.id}">@${contact.name}</span>` : ''}
                            </div>
                        </div>
                        <button class="card-btn btn-delete-task" data-id="${t.id}" style="color: var(--color-danger); padding:0; height:auto; margin-left: 10px;">&times;</button>
                    </div>
                `;
            });
            pendingList.innerHTML = html;
        }

        // 2. Render Completed
        if (completed.length === 0) {
            completedList.innerHTML = `<div class="empty-state">No completed tasks yet.</div>`;
        } else {
            let html = '';
            completed.forEach(t => {
                const contact = window.CRM.contacts.find(c => c.id === t.contactId);
                const formattedDate = window.CRM.formatDate(t.date);

                html += `
                    <div class="task-item" data-id="${t.id}">
                        <input type="checkbox" class="task-chk-btn" data-id="${t.id}" checked>
                        <div class="task-details">
                            <div class="task-text">${t.title}</div>
                            <div class="task-meta">
                                <span class="task-date">Completed</span>
                                ${contact ? `<span class="task-assoc" data-cid="${contact.id}">@${contact.name}</span>` : ''}
                            </div>
                        </div>
                        <button class="card-btn btn-delete-task" data-id="${t.id}" style="color: var(--color-danger); padding:0; height:auto; margin-left: 10px;">&times;</button>
                    </div>
                `;
            });
            completedList.innerHTML = html;
        }

        // Action binding
        document.querySelectorAll('.task-chk-btn').forEach(btn => {
            btn.onchange = (e) => {
                const id = btn.getAttribute('data-id');
                const checked = e.target.checked;
                this.toggleTaskComplete(id, checked);
            };
        });

        document.querySelectorAll('.btn-delete-task').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-id');
                this.deleteTask(id);
            };
        });

        // Trigger detail modal on associated contact links
        document.querySelectorAll('.task-assoc').forEach(link => {
            link.onclick = () => {
                const cid = link.getAttribute('data-cid');
                if (window.CRM_Contacts) {
                    window.CRM_Contacts.openDetailsPanel(cid);
                }
            };
        });
    },

    initEvents() {
        const btnAddTaskModal = document.getElementById('btn-add-task-modal');
        if (btnAddTaskModal) {
            btnAddTaskModal.onclick = () => this.openAddTaskModal();
        }

        const btnCloseTaskModal = document.getElementById('btn-close-task-modal');
        if (btnCloseTaskModal) {
            btnCloseTaskModal.onclick = () => this.closeAddTaskModal();
        }

        const btnCancelTask = document.getElementById('btn-cancel-task');
        if (btnCancelTask) {
            btnCancelTask.onclick = () => this.closeAddTaskModal();
        }

        const taskForm = document.getElementById('task-form');
        if (taskForm) {
            taskForm.onsubmit = (e) => {
                e.preventDefault();
                this.saveTaskForm();
            };
        }
    },

    openAddTaskModal() {
        const modal = document.getElementById('modal-task');
        const select = document.getElementById('t-contact-id');
        if (!select) return;

        // Populate contact selector
        select.innerHTML = '<option value="">None</option>';
        window.CRM.contacts.forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });

        // Set default due date to tomorrow
        const tomorrow = new Date(Date.now() + 86400000);
        document.getElementById('t-date').value = tomorrow.toISOString().split('T')[0];
        document.getElementById('task-form').reset();
        document.getElementById('t-date').value = tomorrow.toISOString().split('T')[0];

        if (modal) modal.classList.add('active');
    },

    closeAddTaskModal() {
        const modal = document.getElementById('modal-task');
        if (modal) modal.classList.remove('active');
    },

    saveTaskForm() {
        const title = document.getElementById('t-title').value.trim();
        const date = document.getElementById('t-date').value;
        const contactId = document.getElementById('t-contact-id').value;

        if (!title || !date) return;

        const task = {
            id: 'task_' + Math.random().toString(36).substr(2, 9),
            title,
            date,
            contactId: contactId || null,
            completed: false
        };

        window.CRM.tasks.push(task);
        
        if (contactId) {
            window.CRM.logActivity(contactId, 'system', `Scheduled action task: "${title}" due by ${window.CRM.formatDate(date)}.`);
        }

        window.CRM.saveState();
        this.closeAddTaskModal();
        this.renderList();
    },

    toggleTaskComplete(id, completed) {
        const idx = window.CRM.tasks.findIndex(t => t.id === id);
        if (idx !== -1) {
            window.CRM.tasks[idx].completed = completed;
            const task = window.CRM.tasks[idx];
            
            if (task.contactId) {
                const actionText = completed ? 'Completed action task' : 'Re-opened action task';
                window.CRM.logActivity(task.contactId, 'system', `${actionText}: "${task.title}".`);
            }

            window.CRM.saveState();
            this.renderList();
        }
    },

    deleteTask(id) {
        if (confirm('Are you sure you want to delete this task?')) {
            window.CRM.tasks = window.CRM.tasks.filter(t => t.id !== id);
            window.CRM.saveState();
            this.renderList();
        }
    }
};
