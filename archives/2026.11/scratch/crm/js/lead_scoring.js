// KANNEM CRM - Intent-Based Lead Scoring Engine
// Evaluates contacts on a 0-100 Warmth Index based on CAD hiring intent, authority, direct access, market demand, and engagement.

window.CRM_LeadScoring = {
    hiringMap: new Map(),
    isLoaded: false,

    async init() {
        await this.loadHiringData();
        this.isLoaded = true;
        if (window.CRM_Contacts && window.CRM_Contacts.initialized) {
            window.CRM_Contacts.renderTable();
        }
    },

    async loadHiringData() {
        try {
            const endpoint = (window.getApiUrl ? window.getApiUrl('/api/cad-hiring') : '/api/cad-hiring') + '?t=' + Date.now();
            const res = await fetch(endpoint);
            if (res.ok) {
                const list = await res.json();
                if (Array.isArray(list)) {
                    list.forEach(item => {
                        const id = String(item.id || item.recordId || '');
                        if (id) {
                            this.hiringMap.set(id, item);
                            this.hiringMap.set(id.replace(/^k_/, ''), item);
                        }
                        if (item.company) {
                            this.hiringMap.set(item.company.toLowerCase().trim(), item);
                        }
                    });
                }
            }
        } catch (e) {
            console.warn('Could not load CAD hiring results, using fallback indicators:', e);
        }
    },

    calculate(contact) {
        if (!contact) return { score: 10, tier: 'cold', tierLabel: 'Cold Lead', icon: '❄️', breakdown: [] };

        const id = String(contact.recordId || contact.id || '');
        const cleanId = id.replace(/^k_/, '');
        const compKey = (contact.companyName || contact.businessName || '').toLowerCase().trim();

        const hiringEntry = this.hiringMap.get(id) || this.hiringMap.get(cleanId) || this.hiringMap.get(compKey);
        const note = (contact.associatedNote || '').toLowerCase();
        const pos = (contact.position || '').toLowerCase();

        const isHiring = !!hiringEntry || 
                         /cad|drafter|drafting|civil 3d|carlson|autocad|hiring|technician/i.test(note) ||
                         /cad|drafter|drafting/i.test(pos);

        let score = 0;
        const breakdown = [];

        // 1. Intent / CAD Hiring Signal (+35 pts)
        if (isHiring) {
            score += 35;
            const kw = hiringEntry && hiringEntry.keywords ? hiringEntry.keywords : 'Active CAD/Drafting Opening';
            breakdown.push({ label: `CAD Hiring Signal (${kw})`, pts: 35, type: 'intent', icon: '🎯' });
        }

        // 2. Verified Decision Maker & Executive Authority (+15 pts)
        const isExecutive = /owner|president|principal|managing|founder|partner|chief|director|lead surveyor/i.test(pos);
        if (isExecutive) {
            score += 15;
            breakdown.push({ label: `Executive Authority (${contact.position || 'Owner/President'})`, pts: 15, type: 'authority', icon: '👑' });
        } else if (contact.position && contact.position.trim()) {
            score += 8;
            breakdown.push({ label: `Identified Role (${contact.position})`, pts: 8, type: 'authority', icon: '👤' });
        }

        // 3. Direct Contact Access (+10 pts)
        if (contact.email && contact.email.includes('@') && !contact.email.includes('example.com')) {
            score += 5;
            breakdown.push({ label: 'Direct Business Email', pts: 5, type: 'contact', icon: '✉️' });
        }
        const rawPhone = String(contact.phone || '').replace(/\D/g, '');
        if (rawPhone.length >= 10) {
            score += 5;
            breakdown.push({ label: 'Direct Phone Line', pts: 5, type: 'contact', icon: '📞' });
        }

        // 4. High-Growth Target Survey Market (+15 pts)
        const state = (contact.stateRegion || contact.address || '').toLowerCase().trim();
        const priorityStates = ['florida', 'georgia', 'texas', 'california', 'north carolina', 'colorado', 'arizona', 'washington', 'virginia'];
        if (priorityStates.some(st => state.includes(st))) {
            score += 15;
            breakdown.push({ label: `Priority Growth Market (${contact.stateRegion || 'Key State'})`, pts: 15, type: 'market', icon: '📍' });
        } else if (state && state !== 'no state') {
            score += 10;
            breakdown.push({ label: `Territory Coverage (${contact.stateRegion})`, pts: 10, type: 'market', icon: '🗺️' });
        }

        // 5. Digital Footprint & Prior CRM Interaction (+25 pts)
        if (contact.websiteUrl && contact.websiteUrl.startsWith('http')) {
            score += 5;
            breakdown.push({ label: 'Corporate Website Verified', pts: 5, type: 'presence', icon: '🌐' });
        }

        if (contact.associatedNote && contact.associatedNote.trim().length > 10) {
            score += 15;
            breakdown.push({ label: 'Outreach History Logged', pts: 15, type: 'engagement', icon: '📝' });
        }

        // Stage-based warmth modifier
        const stage = contact.leadStatus || contact.stage || '';
        if (stage === 'Hot Lead' || stage === 'Interested Follow Up') {
            score += 10;
            breakdown.push({ label: `Active Stage (${stage})`, pts: 10, type: 'status', icon: '⚡' });
        }

        // Clamp 10 - 100
        score = Math.min(100, Math.max(10, score));

        // Tiers
        let tier = 'cold';
        let tierLabel = 'Cold Lead';
        let icon = '❄️';
        let badgeClass = 'warmth-badge-cold';

        if (score >= 75) {
            tier = 'high';
            tierLabel = 'High Intent';
            icon = '🔥';
            badgeClass = 'warmth-badge-high';
        } else if (score >= 50) {
            tier = 'warm';
            tierLabel = 'Warm Lead';
            icon = '⚡';
            badgeClass = 'warmth-badge-warm';
        }

        return {
            score,
            tier,
            tierLabel,
            icon,
            badgeClass,
            breakdown,
            isHiring,
            hiringDetails: hiringEntry || null
        };
    },

    renderBadge(contact) {
        const res = this.calculate(contact);
        const titleTooltip = res.breakdown.map(b => `${b.icon} ${b.label} (+${b.pts})`).join('&#10;');
        return `
            <span class="warmth-score-pill ${res.badgeClass}" title="${titleTooltip}" data-score="${res.score}">
                <span class="warmth-icon">${res.icon}</span>
                <span class="warmth-score-num">${res.score}</span>
                <span class="warmth-label-sub">${res.tierLabel}</span>
            </span>
        `;
    },

    renderProfileCard(contact) {
        const res = this.calculate(contact);
        const cadInfo = res.hiringDetails;

        let breakdownHtml = '';
        res.breakdown.forEach(item => {
            breakdownHtml += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 11.5px;">
                    <span style="color: var(--color-text-muted);">${item.icon} ${item.label}</span>
                    <span class="text-bold" style="color: var(--color-primary); font-family: var(--font-mono);">+${item.pts}</span>
                </div>
            `;
        });

        let cadHiringNotice = '';
        if (res.isHiring) {
            cadHiringNotice = `
                <div style="background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 6px; padding: 8px 10px; margin-top: 10px; font-size: 11.5px;">
                    <div style="color: #f59e0b; font-weight: 700; margin-bottom: 2px;">🎯 Active CAD Hiring Detected</div>
                    <div style="color: var(--color-text-main);">${cadInfo ? (cadInfo.keywords || 'CAD Technician / Drafter') : 'Civil 3D / CAD Drafting Need'}</div>
                    ${cadInfo && cadInfo.careersUrl ? `<a href="${cadInfo.careersUrl}" target="_blank" style="color: var(--color-primary); text-decoration: underline; font-size: 11px; display: inline-block; margin-top: 4px;">View Career Posting &rarr;</a>` : ''}
                </div>
            `;
        }

        return `
            <div class="lead-warmth-panel" style="background: rgba(18, 25, 43, 0.95); border: 1px solid var(--color-panel-border); border-radius: var(--radius-md); padding: 14px; margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-dim); font-weight: 700;">Intent Warmth Index</div>
                    <span class="badge ${res.badgeClass}">${res.icon} ${res.tierLabel}</span>
                </div>
                <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px;">
                    <span style="font-size: 32px; font-weight: 800; font-family: var(--font-heading); color: ${res.score >= 75 ? 'var(--color-danger)' : res.score >= 50 ? 'var(--color-warning)' : 'var(--color-text-muted)'}; line-height: 1;">${res.score}</span>
                    <span style="font-size: 13px; color: var(--color-text-dim);">/ 100 points</span>
                </div>
                <div style="background: rgba(255,255,255,0.08); height: 6px; border-radius: 3px; overflow: hidden; margin-bottom: 12px;">
                    <div style="width: ${res.score}%; height: 100%; background: ${res.score >= 75 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : res.score >= 50 ? 'linear-gradient(90deg, #00f5d4, #f59e0b)' : 'rgba(255,255,255,0.2)'};"></div>
                </div>
                <div style="margin-bottom: 8px;">
                    <div style="font-size: 11px; font-weight: 600; color: var(--color-text-muted); margin-bottom: 4px;">Scoring Breakdown:</div>
                    ${breakdownHtml}
                </div>
                ${cadHiringNotice}
                <button class="btn btn-primary btn-sm btn-full" id="btn-profile-ai-pitch" style="margin-top: 12px;" onclick="window.CRM_PitchDrafter.openModal('${contact.id}')">
                    ⚡ Draft AI Cold Pitch
                </button>
            </div>
        `;
    }
};

// Auto initialize on load
document.addEventListener('DOMContentLoaded', () => {
    window.CRM_LeadScoring.init();
});
