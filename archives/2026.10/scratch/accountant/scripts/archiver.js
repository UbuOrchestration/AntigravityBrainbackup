const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const archivesDir = path.join(rootDir, 'archives');
const dataDir = path.join(rootDir, 'data');
const uploadsDir = path.join(rootDir, 'uploads');
const logFile = path.join(archivesDir, 'backup_manifest.json');

function runBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupId = `backup-${timestamp}`;
  const backupFolder = path.join(archivesDir, backupId);

  if (!fs.existsSync(backupFolder)) {
    fs.mkdirSync(backupFolder, { recursive: true });
  }

  // Backup data files
  const dataBackupDir = path.join(backupFolder, 'data');
  fs.mkdirSync(dataBackupDir, { recursive: true });
  if (fs.existsSync(dataDir)) {
    fs.readdirSync(dataDir).forEach(file => {
      fs.copyFileSync(path.join(dataDir, file), path.join(dataBackupDir, file));
    });
  }

  // Backup uploaded statement files
  const uploadsBackupDir = path.join(backupFolder, 'uploads');
  fs.mkdirSync(uploadsBackupDir, { recursive: true });
  if (fs.existsSync(uploadsDir)) {
    fs.readdirSync(uploadsDir).forEach(file => {
      fs.copyFileSync(path.join(uploadsDir, file), path.join(uploadsBackupDir, file));
    });
  }

  // Create summary record
  const backupRecord = {
    id: backupId,
    timestamp: new Date().toISOString(),
    formattedDate: new Date().toLocaleString(),
    backupPath: backupFolder,
    status: 'SUCCESS',
    filesCount: fs.readdirSync(dataBackupDir).length + fs.readdirSync(uploadsBackupDir).length
  };

  // Update backup manifest log
  let manifest = [];
  if (fs.existsSync(logFile)) {
    try {
      manifest = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    } catch (e) {
      manifest = [];
    }
  }
  manifest.unshift(backupRecord);
  fs.writeFileSync(logFile, JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`[ARCHIVER] Backup ${backupId} completed successfully with ${backupRecord.filesCount} files.`);
  return backupRecord;
}

if (require.main === module) {
  runBackup();
}

module.exports = { runBackup, logFile };
