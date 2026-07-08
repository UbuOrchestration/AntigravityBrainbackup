const puppeteer = require('C:\\Users\\Ubu\\.gemini\\antigravity\\scratch\\youtube-uploader\\node_modules\\puppeteer-core');
const path = require('path');
const fs = require('fs');

// Connect to local Chrome on port 9222 and fetch channel ID
async function getChromeChannelId(browser) {
  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes('youtube.com'));
  if (!page) {
    page = pages[0] || await browser.newPage();
  }
  
  await page.goto('https://studio.youtube.com', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 5000));
  
  const currentUrl = page.url();
  const match = currentUrl.match(/channel\/([a-zA-Z0-9_-]+)/);
  if (!match) {
    throw new Error('Could not resolve YouTube Channel ID. Make sure you are signed in on Chrome.');
  }
  return { page, channelId: match[1] };
}

// Fetch Profile from Chrome
async function getProfileFromChrome() {
  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });
    
    const { page, channelId } = await getChromeChannelId(browser);
    const profileUrl = `https://studio.youtube.com/channel/${channelId}/editing/profile`;
    await page.goto(profileUrl, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 4000));
    
    const info = await page.evaluate(() => {
      const nameInput = document.querySelector('input[placeholder="Enter channel name"]') || {};
      const descInput = document.querySelector('ytcp-form-textarea#description textarea') || 
                        document.querySelector('textarea[placeholder="Tell viewers about your channel"]') || 
                        document.querySelector('ytcp-form-textarea textarea') || {};
      
      return {
        title: nameInput.value || '',
        description: descInput.value || ''
      };
    });
    
    await browser.disconnect();
    return {
      success: true,
      channelId,
      title: info.title,
      description: info.description
    };
  } catch (err) {
    if (browser) await browser.disconnect();
    return { success: false, error: err.message };
  }
}

// Update Profile on Chrome
async function updateProfileOnChrome(title, description, avatarPath, bannerPath) {
  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });
    
    const { page, channelId } = await getChromeChannelId(browser);
    
    // 1. Update Title and Description in /editing/profile
    if (title || description) {
      const profileUrl = `https://studio.youtube.com/channel/${channelId}/editing/profile`;
      console.log(`Navigating to Profile tab: ${profileUrl}`);
      await page.goto(profileUrl, { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 4000));
      
      if (title) {
        console.log(`Updating title to: ${title}`);
        const nameSelector = 'input[placeholder="Enter channel name"]';
        await page.waitForSelector(nameSelector);
        await page.focus(nameSelector);
        await page.click(nameSelector, { clickCount: 3 });
        await page.keyboard.press('Backspace');
        await page.type(nameSelector, title);
      }
      
      if (description) {
        console.log(`Updating description...`);
        const descSelector = 'ytcp-form-textarea#description textarea, ytcp-form-textarea textarea';
        await page.waitForSelector(descSelector);
        await page.focus(descSelector);
        await page.click(descSelector, { clickCount: 3 });
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        await page.type(descSelector, description);
      }
    }
    
    // 2. Update Avatar or Banner in /editing/branding
    if (avatarPath || bannerPath) {
      const brandingUrl = `https://studio.youtube.com/channel/${channelId}/editing/branding`;
      console.log(`Navigating to Branding tab: ${brandingUrl}`);
      await page.goto(brandingUrl, { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 4000));
      
      const fileInputs = await page.$$('input[type="file"]');
      
      if (avatarPath && fileInputs[0]) {
        console.log(`Uploading Avatar: ${avatarPath}`);
        const fullAvatarPath = path.resolve(avatarPath);
        await fileInputs[0].uploadFile(fullAvatarPath);
        await new Promise(r => setTimeout(r, 2000));
        const doneButtons = await page.$$('ytcp-button#done-button, ytcp-button');
        for (const btn of doneButtons) {
          const text = await page.evaluate(el => el.textContent, btn);
          if (text.includes('Done')) {
            await btn.click();
            break;
          }
        }
        await new Promise(r => setTimeout(r, 2000));
      }
      
      if (bannerPath && fileInputs[1]) {
        console.log(`Uploading Banner: ${bannerPath}`);
        const fullBannerPath = path.resolve(bannerPath);
        await fileInputs[1].uploadFile(fullBannerPath);
        await new Promise(r => setTimeout(r, 2000));
        const doneButtons = await page.$$('ytcp-button#done-button, ytcp-button');
        for (const btn of doneButtons) {
          const text = await page.evaluate(el => el.textContent, btn);
          if (text.includes('Done')) {
            await btn.click();
            break;
          }
        }
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    
    // 3. Click Publish Button to apply all changes
    console.log('Publishing profile customizations...');
    const publishButtonSelector = 'ytcp-button#publish-button, ytcp-button[id*="publish"]';
    await page.waitForSelector(publishButtonSelector);
    await page.click(publishButtonSelector);
    await new Promise(r => setTimeout(r, 6000));
    
    await browser.disconnect();
    return { success: true, message: 'YouTube channel profile successfully customized in active Chrome!' };
  } catch (err) {
    if (browser) await browser.disconnect();
    return { success: false, error: err.message };
  }
}

module.exports = {
  getProfileFromChrome,
  updateProfileOnChrome
};
