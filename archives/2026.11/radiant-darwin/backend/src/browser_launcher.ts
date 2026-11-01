import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import { loadConfig } from './config.js';

export interface LaunchResult {
  success: boolean;
  url: string;
  commandUsed?: string;
  error?: string;
  timestamp: string;
}

export function sanitizeUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('Target URL must be a non-empty string.');
  }

  const trimmed = rawUrl.trim();
  let parsed: URL;

  try {
    parsed = new URL(trimmed);
  } catch (err: any) {
    throw new Error(`Invalid URL format: "${trimmed}" - ${err.message}`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`Unsupported protocol: "${parsed.protocol}". Only http: and https: are permitted.`);
  }

  return parsed.toString();
}

/**
 * Finds the direct browser executable on Windows to ensure immediate GUI tab creation
 */
function getWindowsBrowserExecutable(): string | null {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
    'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe'
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Launches the system browser. On Windows, directly targets Chrome or Edge
 * to ensure GUI tabs open immediately in the user's interactive session.
 */
export async function launchSystemBrowser(url: string): Promise<LaunchResult> {
  const timestamp = new Date().toISOString();
  let sanitized: string;

  try {
    sanitized = sanitizeUrl(url);
  } catch (err: any) {
    return {
      success: false,
      url,
      error: `URL validation failed: ${err.message}`,
      timestamp
    };
  }

  const platform = os.platform();

  if (platform === 'win32') {
    const browserExe = getWindowsBrowserExecutable();

    if (browserExe) {
      try {
        const child = spawn(browserExe, [sanitized], {
          detached: true,
          stdio: 'ignore'
        });
        child.unref();

        return {
          success: true,
          url: sanitized,
          commandUsed: `"${browserExe}" "${sanitized}"`,
          timestamp
        };
      } catch (err: any) {
        console.warn(`[BrowserLauncher] Direct binary launch failed: ${err.message}, falling back to cmd.exe start`);
      }
    }

    // Fallback: cmd.exe start
    try {
      const cmdChild = spawn('cmd.exe', ['/c', 'start', '""', sanitized], {
        detached: true,
        stdio: 'ignore'
      });
      cmdChild.unref();

      return {
        success: true,
        url: sanitized,
        commandUsed: `cmd.exe /c start "" "${sanitized}"`,
        timestamp
      };
    } catch (cmdErr: any) {
      return {
        success: false,
        url: sanitized,
        error: `Process launch failed: ${cmdErr.message}`,
        timestamp
      };
    }
  } else if (platform === 'darwin') {
    try {
      const child = spawn('open', [sanitized], { detached: true, stdio: 'ignore' });
      child.unref();
      return { success: true, url: sanitized, commandUsed: `open "${sanitized}"`, timestamp };
    } catch (err: any) {
      return { success: false, url: sanitized, error: err.message, timestamp };
    }
  } else {
    try {
      const child = spawn('xdg-open', [sanitized], { detached: true, stdio: 'ignore' });
      child.unref();
      return { success: true, url: sanitized, commandUsed: `xdg-open "${sanitized}"`, timestamp };
    } catch (err: any) {
      return { success: false, url: sanitized, error: err.message, timestamp };
    }
  }
}

// 1. LIVE EBAY STORE LAUNCHER
export interface OpenStoreOptions {
  sellerUsername?: string;
  mode?: 'store' | 'active_items';
}

export async function openEbayStore(options: OpenStoreOptions = {}): Promise<LaunchResult> {
  const config = loadConfig();
  const seller = options.sellerUsername || config.sellerUsername;

  let url: string;
  if (seller && seller.trim().length > 0 && seller !== 'Active Seller') {
    const cleanSeller = encodeURIComponent(seller.trim());
    if (options.mode === 'active_items') {
      url = `https://www.ebay.com/sch/i.html?_ssn=${cleanSeller}&_sop=12`;
    } else {
      url = `https://www.ebay.com/usr/${cleanSeller}`;
    }
  } else {
    url = 'https://www.ebay.com/sh/lst/active';
  }

  return await launchSystemBrowser(url);
}

// 2. INDIVIDUAL LIVE EBAY LISTINGS
export async function openEbayListing(itemId: string): Promise<LaunchResult> {
  if (!itemId || !itemId.trim()) {
    return {
      success: false,
      url: '',
      error: 'Item ID is required to open an eBay listing.',
      timestamp: new Date().toISOString()
    };
  }

  const cleanId = itemId.trim().replace(/^[^0-9]+/, '');
  const url = `https://www.ebay.com/itm/${cleanId}`;
  return await launchSystemBrowser(url);
}

// 3. SUPPLIER PRODUCT PAGES
export async function openSupplierProduct(identifierOrUrl: string, platform?: 'amazon' | 'walmart'): Promise<LaunchResult> {
  if (!identifierOrUrl || !identifierOrUrl.trim()) {
    return {
      success: false,
      url: '',
      error: 'Product identifier or URL is required.',
      timestamp: new Date().toISOString()
    };
  }

  const input = identifierOrUrl.trim();
  let targetUrl = input;

  if (input.startsWith('http://') || input.startsWith('https://')) {
    targetUrl = input;
  } else if (platform === 'amazon' || /^[A-Z0-9]{10}$/i.test(input)) {
    targetUrl = `https://www.amazon.com/dp/${encodeURIComponent(input)}`;
  } else if (platform === 'walmart' || /^\d+$/.test(input)) {
    targetUrl = `https://www.walmart.com/ip/${encodeURIComponent(input)}`;
  } else {
    return {
      success: false,
      url: input,
      error: `Unable to resolve supplier URL from identifier: "${input}".`,
      timestamp: new Date().toISOString()
    };
  }

  return await launchSystemBrowser(targetUrl);
}
