// KANNEM CRM - AI In-App Cold Pitch Drafter ("Breeze" Assistant Style)
// Generates hyper-personalized cold outreach pitches for land surveying decision makers.

window.CRM_PitchDrafter = {
    currentContact: null,
    currentFormat: 'email', // 'email' | 'phone' | 'voicemail'
    currentAngle: 'hiring', // 'hiring' | 'turnaround' | 'overhead'
    currentTone: 'confident', // 'confident' | 'consultative' | 'casual'

    init() {
        this.initEvents();
    },

    initEvents() {
        // Close modal triggers
        const btnClose = document.getElementById('btn-close-pitch-modal');
        if (btnClose) btnClose.onclick = () => this.closeModal();

        const btnCancel = document.getElementById('btn-cancel-pitch-modal');
        if (btnCancel) btnCancel.onclick = () => this.closeModal();

        // Format tabs
        document.querySelectorAll('.pitch-format-tab').forEach(tab => {
            tab.onclick = () => {
                document.querySelectorAll('.pitch-format-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentFormat = tab.getAttribute('data-format');
                this.renderPitchContent();
            };
        });

        // Angle and Tone selectors
        const selAngle = document.getElementById('pitch-angle-select');
        if (selAngle) {
            selAngle.onchange = (e) => {
                this.currentAngle = e.target.value;
                this.renderPitchContent();
            };
        }

        const selTone = document.getElementById('pitch-tone-select');
        if (selTone) {
            selTone.onchange = (e) => {
                this.currentTone = e.target.value;
                this.renderPitchContent();
            };
        }

        // Copy button
        const btnCopy = document.getElementById('btn-copy-pitch');
        if (btnCopy) {
            btnCopy.onclick = () => this.copyToClipboard();
        }

        // Send via CRM mailer button
        const btnSend = document.getElementById('btn-send-pitch-email');
        if (btnSend) {
            btnSend.onclick = () => this.sendDraftEmail();
        }

        // Log to timeline button
        const btnLog = document.getElementById('btn-log-pitch-activity');
        if (btnLog) {
            btnLog.onclick = () => this.logPitchToTimeline();
        }

        // Regenerate button
        const btnRegen = document.getElementById('btn-regenerate-pitch');
        if (btnRegen) {
            btnRegen.onclick = () => this.renderPitchContent();
        }
    },

    openModal(contactId) {
        const c = window.CRM ? window.CRM.findContact(contactId) : null;
        if (!c) {
            alert('Contact not found');
            return;
        }

        this.currentContact = c;
        const modal = document.getElementById('modal-ai-pitch');
        if (!modal) return;

        // Auto-select best initial angle
        const scoreData = window.CRM_LeadScoring ? window.CRM_LeadScoring.calculate(c) : null;
        if (scoreData && scoreData.isHiring) {
            this.currentAngle = 'hiring';
        } else {
            this.currentAngle = 'turnaround';
        }

        const selAngle = document.getElementById('pitch-angle-select');
        if (selAngle) selAngle.value = this.currentAngle;

        // Set Header details
        const nameEl = document.getElementById('pitch-contact-name');
        const compEl = document.getElementById('pitch-contact-company');
        const roleEl = document.getElementById('pitch-contact-role');
        const scoreBadgeEl = document.getElementById('pitch-contact-score-badge');
        const hiringPillEl = document.getElementById('pitch-contact-hiring-pill');

        if (nameEl) nameEl.textContent = c.name || 'Decision Maker';
        if (compEl) compEl.textContent = c.companyName || c.businessName || 'Land Survey Firm';
        if (roleEl) roleEl.textContent = `${c.position || 'Principal'} • ${c.stateRegion || 'US'}`;

        if (scoreBadgeEl && scoreData) {
            scoreBadgeEl.innerHTML = `${scoreData.icon} Warmth Score: <strong>${scoreData.score}/100</strong> (${scoreData.tierLabel})`;
            scoreBadgeEl.className = 'badge ' + (scoreData.score >= 75 ? 'badge-danger' : scoreData.score >= 50 ? 'badge-warning' : 'badge-dim');
        }

        if (hiringPillEl) {
            if (scoreData && scoreData.isHiring) {
                hiringPillEl.style.display = 'inline-flex';
                hiringPillEl.textContent = `🎯 Open Role: ${scoreData.hiringDetails ? scoreData.hiringDetails.keywords : 'CAD Drafter'}`;
            } else {
                hiringPillEl.style.display = 'none';
            }
        }

        this.renderPitchContent();
        modal.classList.add('active');
    },

    closeModal() {
        const modal = document.getElementById('modal-ai-pitch');
        if (modal) modal.classList.remove('active');
    },

    renderPitchContent() {
        const c = this.currentContact;
        if (!c) return;

        const firstName = (c.firstName || (c.name ? c.name.split(' ')[0] : 'there')).trim();
        const company = c.companyName || c.businessName || 'your team';
        const state = c.stateRegion || 'your area';
        const position = c.position || 'decision maker';

        const scoreData = window.CRM_LeadScoring ? window.CRM_LeadScoring.calculate(c) : null;
        const kw = scoreData && scoreData.hiringDetails ? scoreData.hiringDetails.keywords : 'CAD Technician / Drafter';

        let subject = '';
        let body = '';

        if (this.currentFormat === 'email') {
            if (this.currentAngle === 'hiring') {
                subject = `Quick question re: ${company}'s CAD drafting search`;
                body = `Hi ${firstName},

I noticed ${company} is currently looking to fill a ${kw} role in ${state}.

We partner directly with land surveying firms as a dedicated Civil 3D and Carlson drafting bench—processing boundary retracements, ALTA/NSPS surveys, and topographic plots in 48 to 72 hours.

Would you be open to an 8-minute call this week to see if we can take immediate pressure off your drawing backlog while you search for full-time staff?

Best regards,

Michael Kenna | KANNEM CAD Drafting
Direct: (405) 555-0123 • mkenna.cad@gmail.com
https://kannem.com`;
            } else if (this.currentAngle === 'turnaround') {
                subject = `48-hour survey drafting overflow for ${company}`;
                body = `Hi ${firstName},

Reaching out to see how ${company}'s drafting queue is holding up against your active field survey schedule.

KANNEM CAD acts as an on-demand drafting overflow team for professional land surveyors across ${state}. We take raw field crew files and deliver sealed-ready boundary, ALTA, and subdivision drawings with consistent 48-hour turnarounds.

Are your field crews waiting on drafting turnaround right now, or are your in-house desks keeping up with current project volume?

Best regards,

Michael Kenna | KANNEM CAD Drafting
Direct: (405) 555-0123 • mkenna.cad@gmail.com`;
            } else {
                subject = `Eliminating CAD overhead & recruitment lag for ${company}`;
                body = `Hi ${firstName},

Hiring full-time CAD technicians in ${state} has become increasingly expensive between recruiting delays, software seats, and onboarding downtime.

KANNEM CAD offers surveying firms a flexible contract model: pay only for the drawing hours you actually need, scaled up or down with zero W-2 overhead, delivered by experienced Civil 3D surveyors.

Would you have 5 minutes Thursday to explore whether our overflow bench fits your upcoming project workflow?

Best regards,

Michael Kenna | KANNEM CAD Drafting
Direct: (405) 555-0123 • mkenna.cad@gmail.com`;
            }

            if (this.currentTone === 'casual') {
                body = body.replace('Best regards,\n\nMichael Kenna', 'Cheers,\n\nMike').replace('Would you be open to an 8-minute call', 'Open to a quick 5-min chat');
            } else if (this.currentTone === 'consultative') {
                body = body.replace('Would you be open', 'If maintaining drafting momentum is a priority this quarter, would you be open');
            }

        } else if (this.currentFormat === 'phone') {
            subject = `Cold-Call Phone Script (30 Seconds)`;
            body = `[1. PERMISSION HOOK]
"Hi ${firstName}, this is Michael Kenna with KANNEM CAD. I saw your team at ${company} was looking for ${this.currentAngle === 'hiring' ? kw + ' support' : 'survey drafting capacity'} in ${state}. I know I caught you out of the blue—do you have 30 seconds for why I'm calling?"

[2. VALUE PROP]
"We partner directly with land surveying firms as an on-demand Civil 3D and Carlson drafting overflow bench. Instead of spending months recruiting or having licensed surveyors stuck behind screens, we turn around boundary, ALTA, and topo drawings in 48 to 72 hours."

[3. QUALIFYING QUESTION]
"Curious—are your field crews currently waiting on drafting turnarounds, or is your in-house team handling all the volume comfortably?"

[4. GATEKEEPER / VOICEMAIL BYPASS]
If receptionist: "Hi, I'm calling for ${firstName} regarding your open CAD drafting requirements—is ${firstName} at his desk or out in the field today?"`;

        } else if (this.currentFormat === 'voicemail') {
            subject = `20-Second Voicemail & Text Script`;
            body = `[VOICEMAIL SCRIPT]
"Hi ${firstName}, Michael Kenna with KANNEM CAD calling for you at ${company}. Reaching out regarding your ${this.currentAngle === 'hiring' ? kw + ' hiring search' : 'survey drafting overflow'} in ${state}. We provide dedicated Civil 3D and Carlson drawing support with 48-hour turnarounds. I just shot a quick note to your email at ${c.email || 'your inbox'}. Give me a call back at (405) 555-0123 whenever you're back from the field. Again, Michael at (405) 555-0123. Thanks."

----------------------------------------
[FOLLOW-UP SMS TEXT]
"Hi ${firstName}, Mike with KANNEM CAD. Just left you a brief voicemail regarding survey drafting overflow for ${company}. Sent a quick note to your email as well. Hope your week is off to a great start!"`;
        }

        const subjInput = document.getElementById('pitch-subject-input');
        const bodyInput = document.getElementById('pitch-body-textarea');

        if (subjInput) subjInput.value = subject;
        if (bodyInput) bodyInput.value = body;
    },

    copyToClipboard() {
        const subj = document.getElementById('pitch-subject-input').value;
        const body = document.getElementById('pitch-body-textarea').value;
        const fullText = this.currentFormat === 'email' ? `Subject: ${subj}\n\n${body}` : body;

        navigator.clipboard.writeText(fullText).then(() => {
            const btn = document.getElementById('btn-copy-pitch');
            if (btn) {
                const orig = btn.innerHTML;
                btn.innerHTML = '✅ Copied to Clipboard!';
                btn.classList.add('btn-success');
                setTimeout(() => {
                    btn.innerHTML = orig;
                    btn.classList.remove('btn-success');
                }, 2000);
            }
        }).catch(err => {
            alert('Could not copy text: ' + err);
        });
    },

    async sendDraftEmail() {
        const c = this.currentContact;
        if (!c) return;

        const subj = document.getElementById('pitch-subject-input').value;
        const body = document.getElementById('pitch-body-textarea').value;

        const targetEmail = prompt(`Dispatch cold pitch email via KANNEM Agent Mailer?\nEnter destination recipient (Defaults to user test inbox):`, 'mkenna.cad@gmail.com');
        if (!targetEmail) return;

        const btn = document.getElementById('btn-send-pitch-email');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '⏳ Dispatching Email...';
        }

        try {
            const htmlBody = body.replace(/\n/g, '<br>');
            const endpoint = window.getApiUrl ? window.getApiUrl('/api/agent/send-digest') : '/api/agent/send-digest';
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: targetEmail.trim(),
                    subject: subj,
                    text: body,
                    html: `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b;">${htmlBody}</div>`
                })
            });

            if (res.ok) {
                alert(`✅ Pitch email successfully sent to ${targetEmail}!\n(Message logged in agentmail.to dispatch network)`);
                this.logPitchToTimeline(true);
            } else {
                alert('Server returned error while sending email.');
            }
        } catch (e) {
            alert('Failed to send email: ' + e.message);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '✉️ Send via Mailer';
            }
        }
    },

    logPitchToTimeline(silent = false) {
        const c = this.currentContact;
        if (!c || !window.CRM) return;

        const formatName = this.currentFormat.toUpperCase();
        const body = document.getElementById('pitch-body-textarea').value;
        const preview = body.substring(0, 120).replace(/\n/g, ' ') + '...';

        window.CRM.logActivity(c.id, this.currentFormat === 'phone' ? 'call' : 'email', `[AI Pitch - ${formatName}] ${preview}`);
        window.CRM.markDirty();
        window.CRM.saveState();

        if (!silent) {
            alert(`✅ Logged ${formatName} pitch activity to ${c.name}'s interaction timeline!`);
        }

        // Refresh details modal if open
        if (window.CRM_Contacts && window.CRM_Contacts.renderTimeline) {
            window.CRM_Contacts.renderTimeline(c.id);
        }
    }
};

// Auto initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.CRM_PitchDrafter.init();
});
