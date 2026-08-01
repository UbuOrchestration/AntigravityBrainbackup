// Private CRM - Data Migration & Export Controller
window.CRM_Migration = {
    csvParsedData: [],

    init() {
        this.initDragAndDrop();
        this.initEvents();
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

        // Load HubSpot Seeds
        const btnLoadSamples = document.getElementById('btn-load-samples');
        if (btnLoadSamples) {
            btnLoadSamples.onclick = () => {
                if (confirm('This will load HubSpot dummy data and reset your timeline. Proceed?')) {
                    window.CRM.loadSampleData();
                    alert('Sample HubSpot client data loaded successfully!');
                    window.CRM.switchView('dashboard');
                }
            };
        }

        // Purge Database
        const btnClearDb = document.getElementById('btn-clear-db');
        if (btnClearDb) {
            btnClearDb.onclick = () => {
                if (confirm('WARNING: Are you sure you want to delete ALL contacts, deals, activities and tasks? This cannot be undone.')) {
                    localStorage.clear();
                    window.CRM.contacts = [];
                    window.CRM.activities = [];
                    window.CRM.tasks = [];
                    window.CRM.saveState();
                    alert('Database cleared successfully.');
                    window.location.reload();
                }
            };
        }

        // Process CSV Button
        const btnProcessCsv = document.getElementById('btn-process-csv');
        if (btnProcessCsv) {
            btnProcessCsv.onclick = () => this.importCSVRecords();
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
    }
};

// Auto initialize on script load
document.addEventListener('DOMContentLoaded', () => {
    window.CRM_Migration.init();
});
