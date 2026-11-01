import * as fs from 'fs';
import * as path from 'path';

export interface DocItem {
  id: string;
  title: string;
  category: string;
  content: string;
}

export class DocManager {
  private docPath: string;
  private wikiItems: DocItem[] = [];

  constructor(docPath: string) {
    this.docPath = docPath;
    this.loadDocs();
  }

  private loadDocs() {
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

  public getDocs(): DocItem[] {
    return this.wikiItems;
  }

  public searchDocs(query: string): DocItem[] {
    const q = query.toLowerCase();
    return this.wikiItems.filter(item => 
      item.title.toLowerCase().includes(q) || 
      item.content.toLowerCase().includes(q)
    );
  }

  public addWikiPage(title: string, category: string, content: string): DocItem {
    const id = title.toLowerCase().replace(/\s+/g, '-');
    const newItem: DocItem = { id, title, category, content };
    this.wikiItems.push(newItem);
    return newItem;
  }
}
