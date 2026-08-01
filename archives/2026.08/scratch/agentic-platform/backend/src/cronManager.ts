import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface BackupStatus {
  lastRun?: string;
  status: 'idle' | 'success' | 'failed' | 'running';
  logSnippet?: string;
}

export class CronManager {
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
  }

  public getBackupStatus(): BackupStatus {
    const logPath = path.join(this.repoPath, 'backup.log');
    if (!fs.existsSync(logPath)) {
      return { status: 'idle', logSnippet: 'No backups recorded yet.' };
    }

    try {
      const logs = fs.readFileSync(logPath, 'utf8').trim().split('\n');
      const lastLine = logs[logs.length - 1];
      const runTime = lastLine.match(/^\[(.*?)\]/)?.[1] || new Date().toISOString();
      
      let status: 'success' | 'failed' | 'running' = 'running';
      if (lastLine.includes('✅')) {
        status = 'success';
      } else if (lastLine.includes('❌')) {
        status = 'failed';
      }

      return {
        lastRun: runTime,
        status,
        logSnippet: logs.slice(Math.max(0, logs.length - 10)).join('\n')
      };
    } catch (e) {
      return { status: 'failed', logSnippet: `Error reading logs: ${(e as Error).message}` };
    }
  }

  public triggerBackup(): Promise<BackupStatus> {
    return new Promise((resolve) => {
      const scriptPath = path.join(this.repoPath, 'github_backup.ps1');
      const command = `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`;

      exec(command, { cwd: this.repoPath }, (error, stdout, stderr) => {
        resolve(this.getBackupStatus());
      });
    });
  }
}
