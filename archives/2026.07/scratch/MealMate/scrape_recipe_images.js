const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');

const menuStatusPath = path.join(__dirname, 'menu_status.json');
const imagesDir = path.join(__dirname, 'public', 'images');

if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        https.get(response.headers.location, (redirectResponse) => {
          redirectResponse.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        }).on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function scrapeImages() {
  if (!fs.existsSync(menuStatusPath)) {
    console.error('menu_status.json not found.');
    return;
  }

  const menuStatus = JSON.parse(fs.readFileSync(menuStatusPath, 'utf8'));
  const menu = menuStatus.menu;
  if (!menu) {
    console.error('No menu in menu_status.json');
    return;
  }

  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });
  } catch (err) {
    console.error('Could not connect to Chrome:', err.message);
    return;
  }

  const page = await browser.newPage();
  await page.setDefaultTimeout(30000);
  await page.setDefaultNavigationTimeout(30000);

  const recipes = [];
  if (menu.breakfast) recipes.push({ type: 'breakfast', item: menu.breakfast, dest: 'spinach_feta_scramble.jpg' });
  if (menu.lunch) recipes.push({ type: 'lunch', item: menu.lunch, dest: 'chicken_spinach_wrap.jpg' });
  if (menu.dinners) {
    const names = ['grilled_chicken_zucchini.jpg', 'sauteed_chicken_spinach.jpg', 'mediterranean_chicken_stir_fry.jpg'];
    menu.dinners.forEach((d, idx) => {
      recipes.push({ type: `dinner_${idx}`, item: d, dest: names[idx] || `dinner_${idx}.jpg` });
    });
  }

  for (const entry of recipes) {
    const recipe = entry.item;
    const query = `${recipe.name} ${recipe.source || ''}`;
    console.log(`\nSearching Google for: "${query}"`);
    
    try {
      await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded' });
      await new Promise(r => setTimeout(r, 2000));

      // Extract first organic result URL
      const recipeUrl = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('#search a'));
        for (const link of links) {
          const href = link.href;
          if (href && !href.includes('google.com') && !href.includes('webcache.googleusercontent.com')) {
            return href;
          }
        }
        return null;
      });

      if (!recipeUrl) {
        console.log(`No search results for "${query}". Skipping.`);
        continue;
      }

      console.log(`Found recipe URL: ${recipeUrl}`);
      await page.goto(recipeUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await new Promise(r => setTimeout(r, 2000));

      // Extract image URL from OpenGraph or JSON-LD or standard img tags
      const imageUrl = await page.evaluate(() => {
        // 1. Try OpenGraph og:image
        const ogImg = document.querySelector('meta[property="og:image"]');
        if (ogImg && ogImg.content) return ogImg.content;

        // 2. Try JSON-LD Recipe schema
        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        for (const script of scripts) {
          try {
            const json = JSON.parse(script.textContent || '');
            const graph = json['@graph'] || (Array.isArray(json) ? json : [json]);
            for (const obj of graph) {
              if (obj['@type'] === 'Recipe' || obj['@type'] === 'recipe') {
                if (typeof obj.image === 'string') return obj.image;
                if (Array.isArray(obj.image) && typeof obj.image[0] === 'string') return obj.image[0];
                if (obj.image && obj.image.url) return obj.image.url;
              }
            }
          } catch (e) {}
        }

        // 3. Fallback: post image classes
        const postImg = document.querySelector('img.wp-post-image, img[class*="recipe-image" i], img[class*="entry-image" i], img[class*="featured" i]');
        if (postImg && postImg.src) return postImg.src;

        // 4. Try any large image in article/entry-content
        const entryContent = document.querySelector('.entry-content, .recipe, .recipe-content, article');
        if (entryContent) {
          const imgs = Array.from(entryContent.querySelectorAll('img'));
          for (const img of imgs) {
            const width = img.naturalWidth || parseInt(img.getAttribute('width') || '0');
            const height = img.naturalHeight || parseInt(img.getAttribute('height') || '0');
            if (img.src && (width > 200 || height > 200)) {
              return img.src;
            }
          }
        }

        return null;
      });

      if (imageUrl) {
        console.log(`Found recipe image: ${imageUrl}`);
        const destPath = path.join(imagesDir, entry.dest);
        await downloadFile(imageUrl, destPath);
        console.log(`Successfully downloaded -> ${destPath}`);
        recipe.image = imageUrl; // Update in-memory menu object
      } else {
        console.log(`Could not find image on page: ${recipeUrl}`);
      }
    } catch (e) {
      console.error(`Error scraping for "${query}":`, e.message);
    }
  }

  // Save updated menu back to menu_status.json
  fs.writeFileSync(menuStatusPath, JSON.stringify(menuStatus, null, 2), 'utf8');
  console.log('\n✅ Successfully updated menu_status.json with scraped food blog images.');
  await page.close();
  await browser.disconnect();
}

scrapeImages();
