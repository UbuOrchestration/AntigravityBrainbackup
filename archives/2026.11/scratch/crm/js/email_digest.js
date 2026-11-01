// KANNEM CRM - 9 AM Flagged Action Items Email Digest Generator

window.CRM_EmailDigest = {
    init() {
        this.bindEvents();
    },

    bindEvents() {
        const openBtn = document.getElementById('btn-open-email-digest');
        const closeBtn = document.getElementById('btn-close-digest-modal');
        const closeFooter = document.getElementById('btn-close-digest-footer');
        const dispatchBtn = document.getElementById('btn-trigger-email-dispatch');

        if (openBtn) {
            openBtn.onclick = () => this.openModal();
        }

        if (closeBtn) {
            closeBtn.onclick = () => this.closeModal();
        }

        if (closeFooter) {
            closeFooter.onclick = () => this.closeModal();
        }

        if (dispatchBtn) {
            dispatchBtn.onclick = () => this.triggerDispatch();
        }
    },

    openModal() {
        const modal = document.getElementById('modal-email-digest');
        if (!modal) return;

        this.renderDigest();
        modal.classList.add('active');
    },

    closeModal() {
        const modal = document.getElementById('modal-email-digest');
        if (modal) modal.classList.remove('active');
    },

    getFlaggedNotes() {
        const activities = window.CRM.activities || [];
        const flaggedActs = activities.filter(a => a.isFlagged || (a.text && (a.text.includes('🚩') || a.text.toLowerCase().includes('flagged'))));
        
        // Also check if contacts have flagged associatedNote in CSV/database not yet in activities
        const existingCids = new Set(flaggedActs.map(a => String(a.contactId)));
        (window.CRM.contacts || []).forEach(c => {
            if (c.associatedNote && (c.associatedNote.includes('🚩') || c.associatedNote.toLowerCase().includes('flagged'))) {
                const cIdStr = String(c.id || c.recordId);
                const cleanId = cIdStr.replace(/^k_/, '');
                if (!existingCids.has(cIdStr) && !existingCids.has(cleanId)) {
                    flaggedActs.push({
                        id: 'act_note_' + cIdStr,
                        contactId: c.id || c.recordId,
                        type: 'note',
                        text: c.associatedNote,
                        isFlagged: true,
                        timestamp: new Date().toISOString()
                    });
                }
            }
        });

        return flaggedActs;
    },

    renderDigest() {
        const bodyEl = document.getElementById('digest-modal-body');
        const summaryEl = document.getElementById('digest-status-summary');
        if (!bodyEl) return;

        const flagged = this.getFlaggedNotes();

        if (summaryEl) {
            summaryEl.textContent = `${flagged.length} flagged note${flagged.length === 1 ? '' : 's'} scheduled for 9 AM dispatch`;
        }

        if (flagged.length === 0) {
            bodyEl.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: var(--color-text-dim);">
                    <div style="font-size: 36px; margin-bottom: 12px;">🚩</div>
                    <h4 style="font-size: 16px; color: var(--color-text-main); margin-bottom: 6px;">No Flagged Reminders</h4>
                    <p style="font-size: 13px; max-width: 400px; margin: 0 auto;">
                        Click the <strong>🚩 Flag for 9 AM Reminder</strong> button when logging a note to flag it for tomorrow morning's 9:00 AM action items email.
                    </p>
                </div>
            `;
            return;
        }

        // Group flagged notes by contactId
        const groups = {};
        flagged.forEach(act => {
            const key = act.contactId ? String(act.contactId) : 'unassigned';
            if (!groups[key]) groups[key] = [];
            groups[key].push(act);
        });

        // Compute 9:00 AM tomorrow date string
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        const morningDateStr = tomorrow.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

        let html = `
            <div class="email-preview-card" style="background: rgba(10, 15, 30, 0.7); border: 1px solid var(--color-panel-border); border-radius: 12px; padding: 20px; font-family: var(--font-main);">
                <!-- Email Header Banner -->
                <div style="border-bottom: 2px solid var(--color-kannem-blue); padding-bottom: 14px; margin-bottom: 18px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <span style="background: var(--color-kannem-blue); color: #fff; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 4px; text-transform: uppercase;">AUTOMATED 9:00 AM DIGEST</span>
                            <h2 style="font-size: 18px; margin-top: 8px; color: var(--color-text-main);">KANNEM CRM — Morning Action Items & Coordination Report</h2>
                        </div>
                        <span style="font-size: 11.5px; color: var(--color-text-dim); font-family: var(--font-mono);">${morningDateStr} @ 9:00 AM</span>
                    </div>
                </div>

                <p style="font-size: 13.5px; color: var(--color-text-muted); margin-bottom: 16px;">
                    Below is the compiled summary of high-priority client notes flagged for coordination and next contact action items:
                </p>

                <!-- Contact Action Items List -->
                <div style="display: flex; flex-direction: column; gap: 16px;">
        `;

        Object.keys(groups).forEach(cid => {
            let contact = window.CRM.findContact(cid);
            if (!contact && cid !== 'unassigned') {
                contact = (window.CRM.contacts || []).find(c => c.id === cid || c.recordId === cid);
            }
            if (!contact) {
                contact = { name: 'General Client Note', businessName: 'Organization', email: '—', phone: '—', leadStatus: '—' };
            }
            const notes = groups[cid];
            const primaryNote = notes[0];

            const noteDate = new Date(primaryNote.timestamp || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const noteTime = new Date(primaryNote.timestamp || Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

            html += `
                <div style="background: rgba(18, 25, 45, 0.9); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 10px; padding: 14px 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 8px; margin-bottom: 10px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 16px;">🚩</span>
                            <div>
                                <strong style="font-size: 15px; color: var(--color-text-main);">${contact.name}</strong>
                                ${contact.businessName ? `<span style="font-size: 12.5px; color: var(--color-text-muted);"> (${contact.businessName})</span>` : ''}
                            </div>
                        </div>
                        <span style="font-size: 11px; color: #f87171; background: rgba(239, 68, 68, 0.15); padding: 2px 8px; border-radius: 4px; font-weight: 600;">9 AM ACTION ITEM</span>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; font-size: 12px; color: var(--color-text-muted);">
                        <div><strong>Email:</strong> ${contact.email || '—'}</div>
                        <div><strong>Phone:</strong> ${contact.phone || '—'}</div>
                        <div><strong>Status:</strong> ${contact.leadStatus || contact.stage || 'No Contact Yet'}</div>
                        <div><strong>Recorded:</strong> ${noteDate} at ${noteTime}</div>
                    </div>

                    <div style="background: rgba(10, 15, 30, 0.6); border-radius: 6px; padding: 10px 12px; border-left: 3px solid #f87171;">
                        <div style="font-size: 11px; font-weight: 700; color: #f87171; text-transform: uppercase; margin-bottom: 4px;">Recent Coordination & Next Steps:</div>
                        <div style="font-size: 13px; color: var(--color-text-main); white-space: pre-wrap; line-height: 1.5;">${primaryNote.text.replace(/🚩\s*FLAGGED FOR 9 AM REMINDER:?\s*/g, '')}</div>
                    </div>
                </div>
            `;
        });

        html += `
                </div>

                <!-- Footer Note -->
                <div style="margin-top: 20px; padding-top: 14px; border-top: 1px dashed rgba(255, 255, 255, 0.1); font-size: 11.5px; color: var(--color-text-dim); text-align: center;">
                    Scheduled for automated dispatch at 9:00 AM daily via KANNEM Notification Service.
                </div>
            </div>
        `;

        bodyEl.innerHTML = html;
    },

    async triggerDispatch() {
        const bodyEl = document.getElementById('digest-modal-body');
        const html = bodyEl ? bodyEl.innerHTML : '';
        const flagged = this.getFlaggedNotes();

        try {
            const url = window.getApiUrl ? window.getApiUrl('/api/agent/send-digest') : '/api/agent/send-digest';
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    html: html,
                    text: `KANNEM CRM — Morning Flagged Action Items Digest (9:00 AM)\nTotal flagged items: ${flagged.length}`
                })
            });

            const data = await res.json();
            if (data.success) {
                alert(`9:00 AM Email Digest dispatched via AgentMail (KannemCRM@agentmail)!\n\nRecipients: Michael@Kannem.com & MKenna.CAD@gmail.com\nFlagged Items: ${flagged.length}`);
            } else {
                alert(`Email dispatch response: ${JSON.stringify(data)}`);
            }
        } catch (e) {
            console.error('Error dispatching digest:', e);
            alert('Failed to send email digest via AgentMail. Check console for details.');
        }

        this.closeModal();
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.CRM_EmailDigest.init();
});
