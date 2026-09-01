import fs from 'fs';
import path from 'path';

const CONFIG_DIR = path.join(__dirname, '..', 'config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'ebay_credentials.json');
const RUNTIME_DATA_FILE = path.join(CONFIG_DIR, 'listings_metadata.json');

export interface EbayConfig {
  clientId: string;
  clientSecret: string;
  ruName: string;
  sandbox: boolean;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
  sellerUsername?: string;
  scraperApiKey?: string;
  targetRoi: number;      // Default e.g. 20%
  minProfit: number;      // Default e.g. 2.00 ($)
  maxDeliveryDays?: number; // Stop selling if delivery takes > X days
  competitivenessTolerancePercent?: number; // e.g., 15 for 15% tolerance over Average Sold Price
}

export interface ListingMap {
  itemId: string;
  title: string;
  currentPrice: number;
  sourceUrl: string;
  sourceSku: string;
  sourcePrice: number;
  autoPrice: boolean;
  autoStock: boolean;
  targetRoi?: number;
  minProfit?: number;
  shippingCost?: number;
  shippingCharged?: number;
  lastChecked?: string;
  status?: string;
}

const defaultConfig: EbayConfig = {
  clientId: '',
  clientSecret: '',
  ruName: '',
  sandbox: true,
  targetRoi: 40,
  minProfit: 15.00,
  maxDeliveryDays: 5,
  competitivenessTolerancePercent: 10
};

export function loadConfig(): EbayConfig {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    if (!fs.existsSync(CONFIG_FILE)) {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
      return defaultConfig;
    }
    const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error loading config:', error);
    return defaultConfig;
  }
}

export function saveConfig(config: EbayConfig): void {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Error saving config:', error);
  }
}
