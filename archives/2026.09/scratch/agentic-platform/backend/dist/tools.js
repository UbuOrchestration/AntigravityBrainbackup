"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocManager = void 0;
class DocManager {
    docPath;
    wikiItems = [];
    constructor(docPath) {
        this.docPath = docPath;
        this.loadDocs();
    }
    loadDocs() {
        this.wikiItems = [
            {
                id: 'overview',
                title: 'Antigravity Platform Overview',
                category: 'architecture',
                content: 'Antigravity is an autonomous agentic platform designed to replace OpenClaw. It orchestrates three key agents (Ubu, Ibi, Doc) to execute workflows on the local machine and backup conversation history.'
            },
            {
                id: 'agents',
                title: 'Agent Configurations & Resource Allocation',
                category: 'guides',
                content: 'Agents operate within custom resource sandboxes. The default configuration allocates 500 MHz CPU limits and 256 MiB memory limits per agent, which can be dynamically scaled via the admin dashboard.'
            },
            {
                id: 'backups',
                title: 'Git Backup Automation',
                category: 'cron',
                content: 'Ibi manages hourly log backups via the github_backup.ps1 script, pushing commits directly to the remote repository using a Personal Access Token.'
            }
        ];
    }
    getDocs() {
        return this.wikiItems;
    }
    searchDocs(query) {
        const q = query.toLowerCase();
        return this.wikiItems.filter(item => item.title.toLowerCase().includes(q) ||
            item.content.toLowerCase().includes(q));
    }
    addWikiPage(title, category, content) {
        const id = title.toLowerCase().replace(/\s+/g, '-');
        const newItem = { id, title, category, content };
        this.wikiItems.push(newItem);
        return newItem;
    }
}
exports.DocManager = DocManager;
