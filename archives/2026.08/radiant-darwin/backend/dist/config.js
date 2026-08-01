"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
exports.saveConfig = saveConfig;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const CONFIG_DIR = path_1.default.join(__dirname, '..', 'config');
const CONFIG_FILE = path_1.default.join(CONFIG_DIR, 'ebay_credentials.json');
const RUNTIME_DATA_FILE = path_1.default.join(CONFIG_DIR, 'listings_metadata.json');
const defaultConfig = {
    clientId: '',
    clientSecret: '',
    ruName: '',
    sandbox: true,
    targetRoi: 40,
    minProfit: 15.00,
    maxDeliveryDays: 5,
    competitivenessTolerancePercent: 10
};
function loadConfig() {
    try {
        if (!fs_1.default.existsSync(CONFIG_DIR)) {
            fs_1.default.mkdirSync(CONFIG_DIR, { recursive: true });
        }
        if (!fs_1.default.existsSync(CONFIG_FILE)) {
            fs_1.default.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
            return defaultConfig;
        }
        const content = fs_1.default.readFileSync(CONFIG_FILE, 'utf-8');
        return JSON.parse(content);
    }
    catch (error) {
        console.error('Error loading config:', error);
        return defaultConfig;
    }
}
function saveConfig(config) {
    try {
        if (!fs_1.default.existsSync(CONFIG_DIR)) {
            fs_1.default.mkdirSync(CONFIG_DIR, { recursive: true });
        }
        fs_1.default.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    }
    catch (error) {
        console.error('Error saving config:', error);
    }
}
