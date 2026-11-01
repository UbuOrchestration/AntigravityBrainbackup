// imap_scanner.ts - Stub for future IMAP mail parsing (Returns, Messages, etc)

export async function scanMailbox() {
    console.log('[IMAP SCANNER] Checking mailbox for supplier return labels or buyer messages...');
    // Future IMAP logic (e.g. using node-imap or imap-simple) goes here.
    // E.g., parsing Amazon return emails to auto-upload to eBay returns API.
}

let imapInterval: NodeJS.Timeout | null = null;

export function startImapScanner(intervalMinutes = 120) {
  if (imapInterval) {
    console.log('[IMAP SCANNER] Daemon is already running.');
    return;
  }
  
  console.log(`[IMAP SCANNER] Starting background mail processing daemon. Interval: ${intervalMinutes} minutes.`);
  scanMailbox(); // run immediately on startup
  
  imapInterval = setInterval(scanMailbox, intervalMinutes * 60 * 1000);
}
