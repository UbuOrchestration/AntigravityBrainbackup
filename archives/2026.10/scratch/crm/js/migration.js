// Private CRM - Data Migration & Export Controller
window.CRM_Migration = {
    csvParsedData: [],

    batches: [],

    init() {
        this.initDragAndDrop();
        this.initEvents();
        this.loadBatches();
    },

    initEvents() {
        // Process pasted JSON
        const btnProcessJson = document.getElementById('btn-process-json');
        if (btnProcessJson) {
            btnProcessJson.onclick = () => this.processPastedJSON();
        }

        // Export Database
        const btnExportDb = document.getElementById('btn-export-db');
        if (btnExportDb) {
            btnExportDb.onclick = () => this.exportDatabase();
        }

        // Process CSV Button
        const btnProcessCsv = document.getElementById('btn-process-csv');
        if (btnProcessCsv) {
            btnProcessCsv.onclick = () => this.importCSVRecords();
        }

        // Open Scrape Batch Modal
        const btnOpenScrapeModal = document.getElementById('btn-open-scrape-batch-modal');
        if (btnOpenScrapeModal) {
            btnOpenScrapeModal.onclick = () => this.openScrapeBatchModal();
        }

        // Close Scrape Batch Modal
        const btnCloseScrapeModal = document.getElementById('btn-close-scrape-batch-modal');
        if (btnCloseScrapeModal) {
            btnCloseScrapeModal.onclick = () => this.closeScrapeBatchModal();
        }

        const btnCancelScrapeBatch = document.getElementById('btn-cancel-scrape-batch');
        if (btnCancelScrapeBatch) {
            btnCancelScrapeBatch.onclick = () => this.closeScrapeBatchModal();
        }

        // Form Submit
        const scrapeBatchForm = document.getElementById('scrape-batch-form');
        if (scrapeBatchForm) {
            scrapeBatchForm.onsubmit = (e) => {
                e.preventDefault();
                this.saveScrapeBatchForm();
            };
        }
    },

    initDragAndDrop() {
        const zone = document.getElementById('csv-upload-zone');
        const fileInput = document.getElementById('csv-file-input');
        const preview = document.getElementById('csv-preview-area');

        if (!zone || !fileInput) return;

        zone.onclick = () => fileInput.click();

        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.style.borderColor = 'var(--color-primary)';
            zone.style.backgroundColor = 'var(--color-panel-hover)';
        });

        zone.addEventListener('dragleave', () => {
            zone.style.borderColor = 'var(--color-panel-border)';
            zone.style.backgroundColor = 'transparent';
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.style.borderColor = 'var(--color-panel-border)';
            zone.style.backgroundColor = 'transparent';
            
            if (e.dataTransfer.files.length > 0) {
                this.handleCSVFile(e.dataTransfer.files[0]);
            }
        });

        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                this.handleCSVFile(fileInput.files[0]);
            }
        });
    },

    handleCSVFile(file) {
        if (!file.name.endsWith('.csv')) {
            alert('Please select a valid CSV file exported from your CRM.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            this.parseCSV(text, file.name);
        };
        reader.readAsText(file);
    },

    parseCSV(text, filename) {
        // Clean carriage returns
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) {
            alert('The CSV file appears to be empty or lacks headers.');
            return;
        }

        // Simple CSV parser supporting quotes
        const parseCSVLine = (line) => {
            const result = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current.trim());
            return result;
        };

        const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/["']/g, ''));
        const records = [];

        // Identify column mappings
        const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('first') || h.includes('client') || h.includes('contact'));
        const emailIdx = headers.findIndex(h => h.includes('email') || h.includes('mail'));
        const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('number') || h.includes('mobile'));
        const addressIdx = headers.findIndex(h => h.includes('address') || h.includes('street') || h.includes('location') || h.includes('city'));
        const businessIdx = headers.findIndex(h => h.includes('business') || h.includes('company') || h.includes('firm') || h.includes('org'));
        const positionIdx = headers.findIndex(h => h.includes('position') || h.includes('title') || h.includes('job') || h.includes('role'));
        const stageIdx = headers.findIndex(h => h.includes('stage') || h.includes('status') || h.includes('lifecycle'));
        const valueIdx = headers.findIndex(h => h.includes('value') || h.includes('deal') || h.includes('amount') || h.includes('revenue'));

        for (let i = 1; i < lines.length; i++) {
            const cols = parseCSVLine(lines[i]);
            if (cols.length < headers.length) continue; // Skip malformed rows

            const record = {
                name: nameIdx !== -1 ? cols[nameIdx] : 'Unnamed Client',
                email: emailIdx !== -1 ? cols[emailIdx] : '',
                phone: phoneIdx !== -1 ? cols[phoneIdx] : '',
                address: addressIdx !== -1 ? cols[addressIdx] : '',
                businessName: businessIdx !== -1 ? cols[businessIdx] : '',
                position: positionIdx !== -1 ? cols[positionIdx] : '',
                stage: stageIdx !== -1 ? cols[stageIdx] : 'Lead',
                value: valueIdx !== -1 ? parseFloat(cols[valueIdx].replace(/[^0-9.]/g, '')) || 0 : 0
            };

            // Map CRM stages to local stages
            if (record.stage.toLowerCase().includes('won') || record.stage.toLowerCase().includes('closed won') || record.stage.toLowerCase().includes('customer')) {
                record.stage = 'Won';
            } else if (record.stage.toLowerCase().includes('lost') || record.stage.toLowerCase().includes('closed lost')) {
                record.stage = 'Lost';
            } else if (record.stage.toLowerCase().includes('negotiat')) {
                record.stage = 'In Negotiation';
            } else if (record.stage.toLowerCase().includes('proposal') || record.stage.toLowerCase().includes('quote')) {
                record.stage = 'Proposal Sent';
            } else if (record.stage.toLowerCase().includes('contact') || record.stage.toLowerCase().includes('meet')) {
                record.stage = 'Contacted';
            } else {
                record.stage = 'Lead';
            }

            records.push(record);
        }

        this.csvParsedData = records;

        // Toggle UI view to Process state
        const uploadZone = document.getElementById('csv-upload-zone');
        const previewArea = document.getElementById('csv-preview-area');
        
        if (uploadZone && previewArea) {
            uploadZone.style.display = 'none';
            previewArea.style.display = 'block';
            document.getElementById('csv-filename').textContent = filename;
            document.getElementById('csv-rowcount').textContent = `${records.length} client record(s) parsed`;
        }
    },

    importCSVRecords() {
        if (this.csvParsedData.length === 0) return;

        let importedCount = 0;
        let updatedCount = 0;

        this.csvParsedData.forEach(record => {
            // Deduplicate: check if email or phone already exists
            const existingIdx = window.CRM.contacts.findIndex(c => 
                (c.email && c.email.toLowerCase() === record.email.toLowerCase()) || 
                (c.phone && c.phone.replace(/[^0-9]/g, '') === record.phone.replace(/[^0-9]/g, ''))
            );

            if (existingIdx !== -1) {
                // Update existing record details
                const old = window.CRM.contacts[existingIdx];
                window.CRM.contacts[existingIdx] = {
                    ...old,
                    name: record.name || old.name,
                    phone: record.phone || old.phone,
                    address: record.address || old.address,
                    businessName: record.businessName || old.businessName,
                    position: record.position || old.position,
                    stage: record.stage || old.stage,
                    value: record.value || old.value
                };
                window.CRM.logActivity(old.id, 'system', 'Updated fields during migration sync.');
                updatedCount++;
            } else {
                // Import as new contact
                const id = 'c_' + Math.random().toString(36).substr(2, 9);
                window.CRM.contacts.push({
                    id,
                    ...record
                });
                window.CRM.logActivity(id, 'system', 'Client data migrated from public CRM.');
                importedCount++;
            }
        });

        window.CRM.saveState();
        alert(`Migration completed! Imported ${importedCount} new clients and synced/updated ${updatedCount} existing records.`);
        
        // Reset CSV forms
        this.csvParsedData = [];
        document.getElementById('csv-upload-zone').style.display = 'flex';
        document.getElementById('csv-preview-area').style.display = 'none';
        document.getElementById('csv-file-input').value = '';

        // Navigate to contacts
        window.CRM.switchView('contacts');
    },

    processPastedJSON() {
        const textInput = document.getElementById('json-paste-input');
        if (!textInput) return;

        const val = textInput.value.trim();
        if (!val) {
            alert('Please paste valid JSON list first.');
            return;
        }

        try {
            const data = JSON.parse(val);
            const list = Array.isArray(data) ? data : [data];
            let count = 0;

            list.forEach(item => {
                const id = 'c_' + Math.random().toString(36).substr(2, 9);
                
                // Map stages
                let stage = item.stage || 'Lead';
                if (['customer', 'won', 'closed won'].includes(stage.toLowerCase())) stage = 'Won';
                if (['lost', 'closed lost'].includes(stage.toLowerCase())) stage = 'Lost';

                const client = {
                    id,
                    name: item.name || 'Unnamed Client',
                    email: item.email || '',
                    phone: item.phone || '',
                    address: item.address || '',
                    businessName: item.businessName || '',
                    position: item.position || '',
                    stage: stage,
                    value: parseFloat(item.value || 0)
                };

                window.CRM.contacts.push(client);
                window.CRM.logActivity(id, 'system', 'Record pasted and imported into private CRM.');
                count++;
            });

            window.CRM.saveState();
            textInput.value = '';
            alert(`Successfully imported ${count} client records from JSON!`);
            window.CRM.switchView('contacts');
        } catch (e) {
            alert('Failed to parse JSON. Please check formatting. Example:\n[\n  { "name": "John Doe", "email": "john@example.com" }\n]');
        }
    },

    exportDatabase() {
        const dbBackup = {
            contacts: window.CRM.contacts,
            activities: window.CRM.activities,
            tasks: window.CRM.tasks,
            exportTime: new Date().toISOString()
        };

        const jsonString = JSON.stringify(dbBackup, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `private_crm_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    async loadBatches() {
        try {
            const res = await fetch('/api/batches');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    this.batches = data;
                }
            }
        } catch (e) {
            console.warn('Failed to fetch batches from server, using local fallback:', e);
        }

        if (!this.batches || this.batches.length === 0) {
            this.batches = [
                {
                    id: 'batch_hubspot_import',
                    title: 'HubSpot Data Import',
                    date: '2026-10-01',
                    source: 'HubSpot CSV Migration',
                    recordCount: 245,
                    status: 'Completed',
                    description: 'Initial organization client dataset imported from HubSpot CSV (245 accounts).'
                },
                {
                    id: 'batch_cold_leads_scrape_1',
                    title: 'Data Scrape Existing Cold Leads',
                    date: '2026-10-08',
                    source: 'AI Web Scraper & Registry Search',
                    recordCount: 56,
                    status: 'Completed',
                    description: 'AI web scrape & registry research enriching 56 Cold Leads with decision maker details, emails, websites & states.'
                }
            ];
        }

        this.renderBatchLogTable();
    },

    renderBatchLogTable() {
        const tbody = document.getElementById('batch-log-table-body');
        if (!tbody) return;

        if (!this.batches || this.batches.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-3 text-muted">No ingestion or scrape entries logged yet.</td></tr>`;
            return;
        }

        let html = '';
        this.batches.forEach(b => {
            const statusClass = b.status === 'Completed' ? 'badge-success' : 'badge-info';
            html += `
                <tr>
                    <td class="font-mono text-bold">${b.date || '—'}</td>
                    <td>
                        <div style="font-weight: 600; color: var(--color-primary);">${b.title}</div>
                        <div style="font-size: 11.5px; color: var(--color-text-dim); margin-top: 2px;">${b.description || ''}</div>
                    </td>
                    <td><span class="badge">${b.source || 'Scraped Data Farm'}</span></td>
                    <td class="text-bold">${b.recordCount || 0} records</td>
                    <td><span class="badge ${statusClass}">${b.status || 'Completed'}</span></td>
                    <td>
                        <button class="btn btn-outline btn-sm btn-view-batch" data-title="${b.title}" data-source="${b.source}">
                            View Contacts
                        </button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;

        // Bind View Contacts button on batch rows
        tbody.querySelectorAll('.btn-view-batch').forEach(btn => {
            btn.onclick = () => {
                const title = btn.getAttribute('data-title');
                if (title && title.includes('Cold Leads')) {
                    if (window.CRM_Contacts) window.CRM_Contacts.filterByStatus('Cold Lead - AI Scraped');
                } else {
                    if (window.CRM_Contacts) window.CRM_Contacts.filterByStatus('all');
                }
                window.CRM.switchView('contacts');
            };
        });
    },

    openScrapeBatchModal() {
        const modal = document.getElementById('modal-scrape-batch');
        const form = document.getElementById('scrape-batch-form');
        const dateInput = document.getElementById('sb-date');

        if (form) form.reset();
        if (dateInput) {
            const todayStr = new Date().toISOString().split('T')[0];
            dateInput.value = todayStr;
        }

        if (modal) modal.classList.add('active');
    },

    closeScrapeBatchModal() {
        const modal = document.getElementById('modal-scrape-batch');
        if (modal) modal.classList.remove('active');
    },

    async saveScrapeBatchForm() {
        const title = document.getElementById('sb-title').value.trim();
        const date = document.getElementById('sb-date').value;
        const source = document.getElementById('sb-source').value;
        const assignedStatus = document.getElementById('sb-status-assign').value;
        const rawData = document.getElementById('sb-raw-data').value.trim();

        if (!title || !date || !rawData) {
            alert('Please fill out all required fields and paste raw scraped data.');
            return;
        }

        const newContacts = [];

        // Parse CSV or JSON data
        try {
            if (rawData.startsWith('[') || rawData.startsWith('{')) {
                const parsed = JSON.parse(rawData);
                const list = Array.isArray(parsed) ? parsed : [parsed];
                list.forEach(item => {
                    const newId = 'rec_scraped_' + Math.random().toString(36).substr(2, 9);
                    newContacts.push({
                        id: newId,
                        recordId: newId,
                        name: item.name || item.contactName || 'Scraped Contact',
                        companyName: item.companyName || item.businessName || '',
                        businessName: item.companyName || item.businessName || '',
                        position: item.position || item.role || 'Decision Maker',
                        email: item.email || '',
                        phone: item.phone ? window.CRM.formatPhoneNumber(item.phone) : '',
                        stateRegion: item.stateRegion || item.state || '',
                        leadStatus: assignedStatus,
                        stage: assignedStatus,
                        websiteUrl: item.websiteUrl || item.website || '',
                        associatedNote: `[Scraped Data Ingestion - ${date}] Source: ${source}`
                    });
                });
            } else {
                // CSV Parsing
                const lines = rawData.split(/\r?\n/).filter(l => l.trim().length > 0);
                const parseCSVLine = (line) => {
                    const result = [];
                    let current = '';
                    let inQuotes = false;
                    for (let i = 0; i < line.length; i++) {
                        const char = line[i];
                        if (char === '"') inQuotes = !inQuotes;
                        else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
                        else current += char;
                    }
                    result.push(current.trim());
                    return result;
                };

                lines.forEach((line, idx) => {
                    if (idx === 0 && line.toLowerCase().includes('name')) return;
                    const cols = parseCSVLine(line);
                    if (cols.length < 1) return;

                    const newId = 'rec_scraped_' + Math.random().toString(36).substr(2, 9);
                    newContacts.push({
                        id: newId,
                        recordId: newId,
                        name: cols[0] || 'Scraped Contact',
                        companyName: cols[1] || '',
                        businessName: cols[1] || '',
                        position: cols[2] || 'Decision Maker',
                        email: cols[3] || '',
                        phone: cols[4] ? window.CRM.formatPhoneNumber(cols[4]) : '',
                        stateRegion: cols[5] || '',
                        leadStatus: assignedStatus,
                        stage: assignedStatus,
                        websiteUrl: cols[6] || '',
                        associatedNote: `[Scraped Data Ingestion - ${date}] Source: ${source}`
                    });
                });
            }
        } catch (e) {
            alert('Failed to parse scraped data payload. Please check your CSV/JSON format.');
            return;
        }

        if (newContacts.length === 0) {
            alert('No valid contact records found in payload.');
            return;
        }

        // Push new contacts into CRM state & save
        window.CRM.contacts.push(...newContacts);
        window.CRM.markDirty();
        await window.CRM.saveState();
        window.CRM.clearDirty();

        // Create new Batch Registry Entry
        const newBatch = {
            id: 'batch_' + Math.random().toString(36).substr(2, 9),
            title: title,
            date: date,
            source: source,
            recordCount: newContacts.length,
            status: 'Completed',
            description: `Bulk data farm & scrape (${newContacts.length} records assigned status "${assignedStatus}").`
        };

        this.batches.unshift(newBatch);
        this.renderBatchLogTable();

        // Persist batches to server
        try {
            await fetch('/api/batches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.batches)
            });
        } catch (e) {
            console.error('Failed to sync batch registry to server:', e);
        }

        this.closeScrapeBatchModal();
        alert(`⚡ Data Scrape Batch '${title}' registered successfully with ${newContacts.length} imported contact records!`);
        
        if (window.CRM_Contacts) window.CRM_Contacts.render();
        window.CRM.switchView('contacts');
    }
};

// Auto initialize on script load
document.addEventListener('DOMContentLoaded', () => {
    window.CRM_Migration.init();
});
