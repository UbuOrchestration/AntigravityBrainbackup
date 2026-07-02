import { ListingMap } from './config.js';

// Static lists for risk mitigation
const VERO_BLACKLIST = [
  'apple',
  'nike',
  'rolex',
  'disney',
  'sony',
  'microsoft',
  'velcro',
  'yeti',
  // RV specific restricted brands
  'onangenerator',
  'dometic-oem', // example
];

const DOMAIN_WHITELIST = [
  'amazon.com',
  'walmart.com',
  'homedepot.com',
  'lowes.com',
  'opentip.com'
];

export interface QCResult {
  passed: boolean;
  reason?: string;
  statusFlag?: 'REJECT_VERO_RISK' | 'REJECT_UNTRUSTED_SOURCE' | 'REJECT_IMAGE_COUNT';
}

/**
 * Executes a full Quality Control and Risk Mitigation check on a listing.
 */
export function runQC(map: ListingMap): QCResult {
  // 1. Domain Validation
  try {
    const url = new URL(map.sourceUrl);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    if (!DOMAIN_WHITELIST.includes(hostname)) {
      return {
        passed: false,
        reason: `Source domain ${hostname} is not whitelisted.`,
        statusFlag: 'REJECT_UNTRUSTED_SOURCE'
      };
    }
  } catch (err) {
    return {
      passed: false,
      reason: 'Invalid Source URL',
      statusFlag: 'REJECT_UNTRUSTED_SOURCE'
    };
  }

  // 2. VeRO Blacklist Check
  const titleLower = map.title.toLowerCase();
  for (const brand of VERO_BLACKLIST) {
    // Basic word boundary check for brand names
    const regex = new RegExp(`\\b${brand}\\b`, 'i');
    if (regex.test(titleLower)) {
      return {
        passed: false,
        reason: `Title contains VeRO restricted brand: ${brand}`,
        statusFlag: 'REJECT_VERO_RISK'
      };
    }
  }

  // Note: Image verification would typically happen here if we tracked 
  // the array of images in the ListingMap config. 
  // Since we don't currently store the array of images in `listings_metadata.json`,
  // we focus primarily on the critical risk factors (VeRO + Domains) for the background loop.

  return { passed: true };
}
