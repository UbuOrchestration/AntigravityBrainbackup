// KANNEM CRM - Data Quality & Automation Hub Controller
window.CRM_DataQuality = {
    auditData: null,
    historyData: [],
    activeTab: 'overview',
    isLoading: false,

    init() {
        this.initEvents();
        this.fetchAudit();
    },

    initEvents() {
        // Tab switching inside Data Quality View
        document.querySelectorAll('.dq-nav-tab').forEach(tab => {
            tab.onclick = () => {
                const target = tab.getAttribute('data-dq-tab');
                this.switchTab(target);
            };
        });

        // Run Audit Now button
        const btnRunAudit = document.getElementById('btn-run-quality-audit');
        if (btnRunAudit) {
            btnRunAudit.onclick = () => this.runManualAudit();
        }

        // Auto Resolve All button
        const btnResolveAll = document.getElementById('btn-auto-resolve-all');
        if (btnResolveAll) {
            btnResolveAll.onclick = () => this.applyAutoResolution('all');
        }
    },

    switchTab(tabName) {
        this.activeTab = tabName;
        document.querySelectorAll('.dq-nav-tab').forEach(tab => {
            if (tab.getAttribute('data-dq-tab') === tabName) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        document.querySelectorAll('.dq-tab-pane').forEach(pane => {
            if (pane.id === `dq-pane-${tabName}`) {
                pane.classList.add('active');
            } else {
                pane.classList.remove('active');
            }
        });
    },

    async fetchAudit() {
        try {
            const res = await fetch(window.getApiUrl('/api/data-quality/audit?t=' + Date.now()));
            if (res.ok) {
                this.auditData = await res.json();
                this.render();
            }
        } catch (e) {
            console.error('Failed to fetch data quality audit:', e);
        }
    },

    async runManualAudit() {
        const btn = document.getElementById('btn-run-quality-audit');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '⏳ Scanning Database...';
        }

        try {
            const res = await fetch(window.getApiUrl('/api/data-quality/run'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.ok) {
                const data = await res.json();
                this.auditData = data.audit || data;
                this.render();
                alert(`✅ Data Quality Audit Scan Complete!\nCurrent Health Score: ${this.auditData.healthScore}% (${this.auditData.healthRating})`);
            }
        } catch (e) {
            alert('Error running audit scan: ' + e.message);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '⚡ Scan Account Now';
            }
        }
    },

    async applyAutoResolution(actionId) {
        if (!confirm(actionId === 'all' 
            ? 'Apply all recommended automatic fixes (format phone numbers & standardize state names)?' 
            : 'Apply this auto-generated recommendation to database records?')) {
            return;
        }

        try {
            const res = await fetch(window.getApiUrl('/api/data-quality/resolve'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ actionId })
            });

            if (res.ok) {
                const data = await res.json();
                this.auditData = data.snapshot;
                this.render();
                alert(`✅ Successfully resolved ${data.modifiedCount} data inconsistencies!\nNew Health Score: ${data.newHealthScore}%`);
                
                // Refresh contacts if contacts controller is initialized
                if (window.CRM && window.CRM.loadState) {
                    window.CRM.loadState();
                }
            }
        } catch (e) {
            alert('Failed to apply resolution: ' + e.message);
        }
    },

    async mergeDuplicates(keepId, removeId) {
        if (!confirm(`Merge duplicate contact (${removeId}) into master record (${keepId})? Incomplete fields will be consolidated.`)) {
            return;
        }

        try {
            const res = await fetch(window.getApiUrl('/api/data-quality/merge-duplicates'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keepId, removeId })
            });

            if (res.ok) {
                const data = await res.json();
                this.auditData = data.snapshot;
                this.render();
                alert('✅ Duplicate records merged successfully!');
                
                if (window.CRM && window.CRM.loadState) {
                    window.CRM.loadState();
                }
            }
        } catch (e) {
            alert('Failed to merge duplicates: ' + e.message);
        }
    },

    render() {
        if (!this.auditData) return;
        const d = this.auditData;

        // 1. Update Top Banner & Health Score
        const scoreEl = document.getElementById('dq-health-score-val');
        const ratingEl = document.getElementById('dq-health-rating');
        const badgeEl = document.getElementById('nav-health-score-badge');
        const progressEl = document.getElementById('dq-health-progress-bar');

        if (scoreEl) scoreEl.textContent = `${d.healthScore}%`;
        if (ratingEl) {
            ratingEl.textContent = d.healthRating;
            ratingEl.className = 'badge ' + (d.healthScore >= 90 ? 'badge-success' : d.healthScore >= 75 ? 'badge-info' : 'badge-warning');
        }
        if (badgeEl) {
            badgeEl.textContent = `${d.healthScore}%`;
            badgeEl.className = 'badge ml-auto ' + (d.healthScore >= 90 ? 'badge-success' : d.healthScore >= 75 ? 'badge-info' : 'badge-warning');
        }
        if (progressEl) {
            progressEl.style.width = `${d.healthScore}%`;
            progressEl.style.backgroundColor = d.healthScore >= 90 ? 'var(--color-success)' : d.healthScore >= 75 ? 'var(--color-primary)' : 'var(--color-warning)';
        }

        // 2. Metric Counters
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        setVal('dq-stat-total-records', d.totalRecords || 0);
        setVal('dq-stat-duplicate-pairs', d.metrics ? d.metrics.duplicatePairsCount : 0);
        setVal('dq-stat-property-issues', d.issuesCount || 0);
        setVal('dq-stat-recommendations-count', (d.recommendations || []).length);

        // 3. Render Property Issues List
        const m = d.metrics || {};
        setVal('dq-prop-unformatted-phone', m.unformattedPhone || 0);
        setVal('dq-prop-nonstandard-state', m.nonStandardState || 0);
        setVal('dq-prop-missing-phone', m.missingPhone || 0);
        setVal('dq-prop-missing-email', m.missingEmail || 0);
        setVal('dq-prop-missing-website', m.missingWebsite || 0);
        setVal('dq-prop-missing-dm', m.missingDecisionMaker || 0);

        // 4. Render Source Breakdown Table
        this.renderSourceBreakdown(d.sourceBreakdown || {});

        // 5. Render Recommendations
        this.renderRecommendations(d.recommendations || []);

        // 6. Render Duplicates
        this.renderDuplicates(d.duplicatePairs || []);

        // 7. Render Audit History
        this.renderHistory();
    },

    renderSourceBreakdown(sources) {
        const tbody = document.getElementById('dq-source-breakdown-body');
        if (!tbody) return;

        let html = '';
        Object.keys(sources).forEach(sourceName => {
            const data = sources[sourceName];
            if (data.total === 0) return;
            const healthPercent = Math.max(0, Math.round(((data.total - data.issues) / data.total) * 100));
            const badgeClass = healthPercent >= 90 ? 'badge-success' : healthPercent >= 75 ? 'badge-info' : 'badge-warning';

            html += `
                <tr>
                    <td class="text-bold">${sourceName}</td>
                    <td>${data.total}</td>
                    <td>${data.issues > 0 ? `<span class="text-warning text-bold">${data.issues} issues</span>` : '<span class="text-success">Clean (0)</span>'}</td>
                    <td><span class="badge ${badgeClass}">${healthPercent}% Healthy</span></td>
                    <td>
                        <div style="background: rgba(255,255,255,0.08); height: 6px; border-radius: 3px; overflow: hidden; width: 100px;">
                            <div style="width: ${healthPercent}%; height: 100%; background: ${healthPercent >= 90 ? 'var(--color-success)' : 'var(--color-primary)'};"></div>
                        </div>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html || '<tr><td colspan="5" class="text-center py-3 text-muted">No data sources detected.</td></tr>';
    },

    renderRecommendations(recs) {
        const container = document.getElementById('dq-recommendations-container');
        if (!container) return;

        if (recs.length === 0) {
            container.innerHTML = `
                <div class="panel" style="text-align: center; padding: 32px;">
                    <div style="font-size: 32px; margin-bottom: 8px;">🎉</div>
                    <h3>All Recommendations Resolved!</h3>
                    <p class="text-muted">Your CRM data meets high-precision data quality standards.</p>
                </div>
            `;
            return;
        }

        let html = '';
        recs.forEach(r => {
            html += `
                <div class="dash-panel" style="margin-bottom: 16px; border-left: 4px solid var(--color-primary);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                <span class="badge badge-info">${r.category}</span>
                                <span class="badge ${r.impact === 'High' ? 'badge-danger' : 'badge-warning'}">${r.impact} Impact</span>
                                <span class="font-mono text-dim" style="font-size: 11px;">${r.affectedCount} record(s)</span>
                            </div>
                            <h4 style="margin: 4px 0 6px 0; color: var(--color-text-main);">${r.title}</h4>
                            <p style="font-size: 13px; color: var(--color-text-muted); margin: 0;">${r.description}</p>
                        </div>
                        <button class="btn btn-primary btn-sm btn-apply-rec" data-rec-id="${r.id}" style="white-space: nowrap;">
                            ⚡ ${r.actionName}
                        </button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        container.querySelectorAll('.btn-apply-rec').forEach(btn => {
            btn.onclick = () => {
                const recId = btn.getAttribute('data-rec-id');
                if (recId === 'rec_duplicate_merge') {
                    this.switchTab('duplicates');
                } else {
                    this.applyAutoResolution(recId);
                }
            };
        });
    },

    renderDuplicates(duplicates) {
        const container = document.getElementById('dq-duplicates-container');
        if (!container) return;

        if (duplicates.length === 0) {
            container.innerHTML = `
                <div class="panel" style="text-align: center; padding: 32px;">
                    <div style="font-size: 32px; margin-bottom: 8px;">🛡️</div>
                    <h3>No Duplicate Contacts Detected</h3>
                    <p class="text-muted">All phone numbers and email addresses across your database are unique.</p>
                </div>
            `;
            return;
        }

        let html = '';
        duplicates.forEach((dup, idx) => {
            html += `
                <div class="dash-panel" style="margin-bottom: 16px; border: 1px solid rgba(239, 68, 68, 0.25);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid var(--color-panel-border); padding-bottom: 8px;">
                        <div>
                            <span class="badge badge-danger">Duplicate Pair #${idx + 1}</span>
                            <span class="font-mono text-dim" style="margin-left: 8px;">Matched on: <strong>${dup.type}</strong> (${dup.matchKey})</span>
                        </div>
                        <button class="btn btn-warning btn-sm btn-merge-dup" data-keep-id="${dup.original.id}" data-remove-id="${dup.duplicate.id}">
                            🤝 Merge & Consolidate
                        </button>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <!-- Original -->
                        <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 6px;">
                            <div style="font-size: 11px; text-transform: uppercase; color: var(--color-primary); font-weight: 700; margin-bottom: 6px;">Primary Record (${dup.original.id})</div>
                            <div style="font-weight: 600;">${dup.original.name}</div>
                            <div style="font-size: 12px; color: var(--color-text-muted);">${dup.original.companyName} &bull; ${dup.original.position || 'No Title'}</div>
                            <div style="font-size: 12px; margin-top: 4px;">📧 ${dup.original.email || 'None'}</div>
                            <div style="font-size: 12px;">📞 ${dup.original.phone || 'None'}</div>
                            <div style="font-size: 12px; color: var(--color-text-dim);">📍 ${dup.original.stateRegion || 'No State'}</div>
                        </div>
                        <!-- Duplicate -->
                        <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 6px;">
                            <div style="font-size: 11px; text-transform: uppercase; color: var(--color-warning); font-weight: 700; margin-bottom: 6px;">Candidate to Merge (${dup.duplicate.id})</div>
                            <div style="font-weight: 600;">${dup.duplicate.name}</div>
                            <div style="font-size: 12px; color: var(--color-text-muted);">${dup.duplicate.companyName} &bull; ${dup.duplicate.position || 'No Title'}</div>
                            <div style="font-size: 12px; margin-top: 4px;">📧 ${dup.duplicate.email || 'None'}</div>
                            <div style="font-size: 12px;">📞 ${dup.duplicate.phone || 'None'}</div>
                            <div style="font-size: 12px; color: var(--color-text-dim);">📍 ${dup.duplicate.stateRegion || 'No State'}</div>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        container.querySelectorAll('.btn-merge-dup').forEach(btn => {
            btn.onclick = () => {
                const keepId = btn.getAttribute('data-keep-id');
                const removeId = btn.getAttribute('data-remove-id');
                this.mergeDuplicates(keepId, removeId);
            };
        });
    },

    async renderHistory() {
        const tbody = document.getElementById('dq-history-table-body');
        if (!tbody) return;

        try {
            const res = await fetch(window.getApiUrl('/api/data-quality/audit?t=' + Date.now()));
            if (res.ok) {
                const cur = await res.json();
                tbody.innerHTML = `
                    <tr>
                        <td class="font-mono text-bold">${new Date(cur.auditDate).toLocaleDateString()} ${new Date(cur.auditDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                        <td class="text-bold">${cur.totalRecords} records</td>
                        <td><span class="badge ${cur.healthScore >= 90 ? 'badge-success' : 'badge-info'}">${cur.healthScore}% (${cur.healthRating})</span></td>
                        <td>${cur.issuesCount} property issues</td>
                        <td>${cur.metrics.duplicatePairsCount} duplicate pairs</td>
                        <td><span class="badge badge-success">Completed</span></td>
                    </tr>
                `;
            }
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-3 text-muted">No audit history logged.</td></tr>';
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.CRM_DataQuality.init();
});
