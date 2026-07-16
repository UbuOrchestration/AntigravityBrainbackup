// Private CRM - Dashboard Controller
window.CRM_Dashboard = {
    render() {
        this.renderPipelineChart();
        this.renderActivityFeed();
    },

    renderPipelineChart() {
        const container = document.querySelector('.chart-container');
        if (!container) return;

        // Group data by stage
        const stages = ['Lead', 'Contacted', 'Proposal Sent', 'In Negotiation', 'Won', 'Lost'];
        const values = stages.map(stage => {
            return window.CRM.contacts
                .filter(c => c.stage === stage)
                .reduce((sum, c) => sum + parseFloat(c.value || 0), 0);
        });

        const maxValue = Math.max(...values, 1000); // Prevent divide-by-zero, minimum height limit

        // Draw custom interactive SVG bar chart
        let svgContent = `
            <svg class="pipeline-bar-chart" viewBox="0 0 500 240" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="var(--color-primary)" />
                        <stop offset="100%" stop-color="rgba(255, 122, 89, 0.3)" />
                    </linearGradient>
                </defs>
        `;

        // Draw horizontal grid lines
        for (let i = 0; i <= 4; i++) {
            const y = 20 + i * 40;
            const gridVal = window.CRM.formatCurrency(maxValue * (1 - i / 4));
            svgContent += `
                <line x1="60" y1="${y}" x2="480" y2="${y}" stroke="var(--color-panel-border)" stroke-width="1" />
                <text x="50" y="${y + 4}" fill="var(--color-text-dim)" font-size="10" text-anchor="end" font-family="var(--font-main)">${gridVal}</text>
            `;
        }

        // Draw bars
        stages.forEach((stage, idx) => {
            const x = 80 + idx * 65;
            const barVal = values[idx];
            const barHeight = (barVal / maxValue) * 160;
            const y = 180 - barHeight;

            svgContent += `
                <g class="chart-bar-group" data-stage="${stage}" data-val="${window.CRM.formatCurrency(barVal)}">
                    <rect class="chart-bar-rect" x="${x}" y="${y}" width="36" height="${barHeight}" />
                    <text x="${x + 18}" y="200" fill="var(--color-text-muted)" font-size="10" text-anchor="middle" font-family="var(--font-heading)" font-weight="500">${stage.substring(0, 8)}</text>
                </g>
            `;
        });

        svgContent += `</svg>`;
        container.innerHTML = svgContent;

        // Add interactive hover effects showing tooltip on SVG elements
        this.initChartInteractions();
    },

    initChartInteractions() {
        const groups = document.querySelectorAll('.chart-bar-group');
        let tooltip = document.getElementById('chart-tooltip-el');
        
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'chart-tooltip-el';
            tooltip.className = 'chart-tooltip';
            document.body.appendChild(tooltip);
        }

        groups.forEach(group => {
            group.addEventListener('mouseenter', (e) => {
                const stage = group.getAttribute('data-stage');
                const val = group.getAttribute('data-val');
                tooltip.innerHTML = `<strong>${stage}</strong>: ${val}`;
                tooltip.style.display = 'block';
            });

            group.addEventListener('mousemove', (e) => {
                tooltip.style.left = (e.pageX + 15) + 'px';
                tooltip.style.top = (e.pageY - 30) + 'px';
            });

            group.addEventListener('mouseleave', () => {
                tooltip.style.display = 'none';
            });
        });
    },

    renderActivityFeed() {
        const feedContainer = document.getElementById('dashboard-activity-feed');
        if (!feedContainer) return;

        if (window.CRM.activities.length === 0) {
            feedContainer.innerHTML = `<div class="feed-empty">No recent interactions logged. Import data to get started!</div>`;
            return;
        }

        // Get recent 10 items
        const recent = window.CRM.activities.slice(0, 10);
        
        let html = '';
        recent.forEach(act => {
            // Find contact
            const contact = window.CRM.contacts.find(c => c.id === act.contactId) || { name: 'Unknown Client' };
            
            // Icon selection
            let iconSvg = '';
            let bgClass = '';
            if (act.type === 'call') {
                bgClass = 'bg-warning';
                iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>`;
            } else if (act.type === 'email') {
                bgClass = 'bg-info';
                iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>`;
            } else { // Note or system
                bgClass = 'bg-primary';
                iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
            }

            const timeDiff = this.timeAgo(new Date(act.timestamp));

            html += `
                <div class="activity-feed-item">
                    <div class="feed-icon-wrap ${bgClass}">${iconSvg}</div>
                    <div class="feed-content">
                        <div class="feed-meta-row">
                            <span class="feed-user">${contact.name}</span>
                            <span class="feed-time">${timeDiff}</span>
                        </div>
                        <div class="feed-text">${act.text}</div>
                    </div>
                </div>
            `;
        });

        feedContainer.innerHTML = html;
    },

    timeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        
        interval = seconds / 864000;
        if (interval > 1) return Math.floor(interval) + " days ago";
        
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        
        return "just now";
    }
};
