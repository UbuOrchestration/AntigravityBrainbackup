const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function diagnose() {
  console.log('Connecting to Chrome on port 9222...');
  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });
    console.log('Connected to Chrome!');

    const pages = await browser.pages();
    console.log(`Found ${pages.length} open pages:`);
    
    // Find the active or relevant tab (typically the one with Publix/Instacart)
    let targetPage = pages[0];
    for (const page of pages) {
      const url = page.url();
      console.log(`- URL: ${url}`);
      if (url.includes('publix') || url.includes('instacart')) {
        targetPage = page;
      }
    }

    if (targetPage) {
      console.log(`Capturing screenshot of active page: ${targetPage.url()}`);
      // Save screenshot to artifacts directory
      const screenshotPath = 'C:\\Users\\Ubu\\.gemini\\antigravity\\brain\\9e4b2519-acb8-4623-a3cd-0d977fb64924\\publix_diagnostic_screenshot.png';
      await targetPage.screenshot({ path: screenshotPath });
      console.log(`Saved screenshot to ${screenshotPath}`);
    } else {
      console.log('No active Publix or Instacart page found.');
    }

    await browser.disconnect();
  } catch (err) {
    console.error('Failed to connect or capture screenshot:', err.message);
  }
}

diagnose();
