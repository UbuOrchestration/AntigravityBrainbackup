const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { google } = require('googleapis');
const ffmpeg = require('ffmpeg-static');
const { exec } = require('child_process');
const { generateLofiTrack } = require('./synth');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3005;

// DB file path
const DB_PATH = path.join(__dirname, 'db.json');

// Ensure directories exist
const uploadDir = path.join(__dirname, 'public', 'uploads');
const thumbDir = path.join(__dirname, 'public', 'thumbnails');
const videoDir = path.join(__dirname, 'public', 'videos');
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(thumbDir, { recursive: true });
fs.mkdirSync(videoDir, { recursive: true });

// Copy default thumbnails if they don't exist
const makeDefaultThumbnail = (filename, color, text) => {
  const filePath = path.join(thumbDir, filename);
  if (!fs.existsSync(filePath)) {
    // Write a small 1x1 base64 GIF or just copy a blank file, but let's write a valid simple BMP or SVG
    // Actually, we can write a simple SVG file! Browsers can read SVG.
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${color}" />
          <stop offset="100%" stop-color="#120c1f" />
        </linearGradient>
      </defs>
      <rect width="640" height="360" fill="url(#g)" />
      <text x="320" y="180" font-family="sans-serif" font-weight="bold" font-size="28" fill="#ffffff" text-anchor="middle">${text}</text>
      <text x="320" y="220" font-family="sans-serif" font-size="16" fill="#00ffcc" text-anchor="middle">Synth Shihtzu Studio</text>
    </svg>`;
    fs.writeFileSync(filePath, svg);
  }
};
makeDefaultThumbnail('ambient-1.jpg', '#ff007f', 'Cozy Sleep Lofi');
makeDefaultThumbnail('ambient-2.jpg', '#007fff', 'Night Drive Synth');
makeDefaultThumbnail('default.jpg', '#4b0082', 'Synth Shihtzu');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Read DB helper
function readDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return { videos: [], settings: { youtube_channel: "Synth Shihtzu", simulation_mode: true } };
    }
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch (err) {
    console.error('Error reading database:', err);
    return { videos: [], settings: { youtube_channel: "Synth Shihtzu", simulation_mode: true } };
  }
}

// Write DB helper
function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing database:', err);
  }
}

// OAuth2 Client initialization helper
function getOAuth2Client() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI;
  
  if (!clientId || !clientSecret || !redirectUri) {
    return null;
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// Token cache file path
const TOKEN_PATH = path.join(__dirname, 'token.json');

// Get active OAuth client with token
function getAuthenticatedClient() {
  const oauth2Client = getOAuth2Client();
  if (!oauth2Client) return null;
  
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
      oauth2Client.setCredentials(token);
      return oauth2Client;
    }
  } catch (err) {
    console.error('Error reading token file:', err);
  }
  return null;
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// API Status
app.get('/api/status', (req, res) => {
  const db = readDB();
  const hasClientCreds = !!(process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET);
  const client = getAuthenticatedClient();
  
  res.json({
    simulation_mode: process.env.SIMULATION_MODE === 'true' || db.settings.simulation_mode,
    oauth_configured: hasClientCreds,
    connected: !!client,
    channel_name: db.settings.youtube_channel || "Not Connected"
  });
});

// OAuth Callback Url
app.get('/api/auth-url', (req, res) => {
  const oauth2Client = getOAuth2Client();
  if (!oauth2Client) {
    return res.status(400).json({ error: 'OAuth client credentials not configured in .env' });
  }
  
  const scopes = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly'
  ];
  
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  });
  
  res.json({ url });
});

// OAuth Callback handler
app.get('/api/oauth2callback', async (req, res) => {
  const code = req.query.code;
  const oauth2Client = getOAuth2Client();
  if (!oauth2Client) {
    return res.status(500).send('OAuth configuration missing');
  }
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    
    // Fetch channel details to update DB
    oauth2Client.setCredentials(tokens);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    const response = await youtube.channels.list({
      part: 'snippet',
      mine: true
    });
    
    const db = readDB();
    if (response.data.items && response.data.items[0]) {
      db.settings.youtube_channel = response.data.items[0].snippet.title;
      db.settings.simulation_mode = false;
      writeDB(db);
    }
    
    res.send('<h1>Authorization successful!</h1><p>You can close this tab and return to the dashboard.</p><script>setTimeout(() => window.close(), 3000)</script>');
  } catch (err) {
    console.error('Error exchanging token:', err);
    res.status(500).send('Authentication failed: ' + err.message);
  }
});

// Disconnect YouTube
app.post('/api/disconnect', (req, res) => {
  if (fs.existsSync(TOKEN_PATH)) {
    fs.unlinkSync(TOKEN_PATH);
  }
  const db = readDB();
  db.settings.youtube_channel = "Synthzhu (Simulated)";
  db.settings.simulation_mode = true;
  writeDB(db);
  res.json({ success: true });
});

// YouTube Trends Scraper
app.get('/api/scrape', async (req, res) => {
  const query = req.query.query || 'Synth LoFi sleep';
  console.log(`Scraping YouTube for: ${query}`);
  
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    
    const html = response.data;
    // Extract ytInitialData json
    const jsonMatch = html.match(/var ytInitialData = ({.*?});<\/script>/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Could not find ytInitialData in YouTube response' });
    }
    
    const ytData = JSON.parse(jsonMatch[1]);
    const videos = [];
    
    // Parse the complex YouTube API response for video renderer items
    const contents = ytData.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
    if (contents) {
      for (const content of contents) {
        const itemSection = content.itemSectionRenderer;
        if (itemSection && itemSection.contents) {
          for (const item of itemSection.contents) {
            const videoRenderer = item.videoRenderer;
            if (videoRenderer) {
              const videoId = videoRenderer.videoId;
              const title = videoRenderer.title?.runs?.[0]?.text;
              const viewsText = videoRenderer.viewCountText?.simpleText || videoRenderer.viewCountText?.runs?.[0]?.text || "0 views";
              const publishTime = videoRenderer.publishedTimeText?.simpleText || "Unknown time";
              const lengthText = videoRenderer.lengthText?.simpleText || "0:00";
              const channelName = videoRenderer.ownerText?.runs?.[0]?.text || "Unknown Channel";
              const descSnippet = videoRenderer.detailedMetadataSnippets?.[0]?.snippetText?.runs?.map(r => r.text).join('') || "";
              
              if (videoId && title) {
                videos.push({
                  videoId,
                  title,
                  views: viewsText,
                  publishTime,
                  duration: lengthText,
                  channel: channelName,
                  description: descSnippet
                });
              }
            }
          }
        }
      }
    }
    
    res.json({ query, results: videos.slice(0, 15) });
  } catch (err) {
    console.error('Scraping error:', err);
    res.status(500).json({ error: 'Failed to scrape YouTube search results: ' + err.message });
  }
});

// Generate procedural Lo-Fi track
app.post('/api/generate-audio', (req, res) => {
  const { duration = 120, bpm = 100, mood = 'cozy', gains } = req.body;
  const trackId = `track-${Date.now()}`;
  const filename = `${trackId}.wav`;
  const outputPath = path.join(uploadDir, filename);
  
  try {
    generateLofiTrack(outputPath, parseInt(duration), parseInt(bpm), mood, gains);
    res.json({
      success: true,
      trackId,
      filePath: `/uploads/${filename}`,
      durationSeconds: duration
    });
  } catch (err) {
    console.error('Audio generation error:', err);
    res.status(500).json({ error: 'Audio synthesis failed: ' + err.message });
  }
});

// Helper to generate a random browser User-Agent
function getRandomUserAgent() {
  const agents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  ];
  return agents[Math.floor(Math.random() * agents.length)];
}

// Helper to extract keywords for fallback search (Lisa Frank illustration theme - NO photos)
function extractKeywordsForSearch(promptText) {
  const clean = (promptText || "").toLowerCase().replace(/[^a-z0-9\s]/g, "");
  const words = clean.split(/\s+/);
  const common = new Set(["a", "an", "the", "in", "on", "at", "under", "with", "wearing", "playing", "sitting", "sleeping", "and", "of", "to", "for", "is", "are", "cute", "adorable", "futuristic", "style", "art", "rendered", "digital", "illustration"]);
  const filtered = words.filter(w => w.length > 2 && !common.has(w));
  if (filtered.length === 0) return "rainbow,illustration,vector,neon";
  return filtered.slice(0, 3).join(",") + ",illustration,vector,neon,rainbow";
}

// Generate Image (Hybrid AI generator + Prompt-Aligned Fallback Search)
app.post('/api/generate-image', async (req, res) => {
  const { prompt } = req.body;
  const imageId = `img-${Date.now()}`;
  const filename = `${imageId}.jpg`; // Native JPG format for perfect FFmpeg video compilation
  const outputPath = path.join(thumbDir, filename);
  
  // Add to prompt history
  const db = readDB();
  if (!db.prompt_history) db.prompt_history = [];
  if (prompt && !db.prompt_history.includes(prompt)) {
    db.prompt_history.push(prompt);
    if (db.prompt_history.length > 20) db.prompt_history.shift();
    writeDB(db);
  }
  // Clean user prompt and limit it to 80 characters to ensure the style suffix is never truncated
  let cleanUserPrompt = (prompt || "A cute Shih Tzu puppy")
    .replace(/[^a-zA-Z0-9\s,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (cleanUserPrompt.length > 80) {
    cleanUserPrompt = cleanUserPrompt.substring(0, 80);
  }
  
  // Unconditionally append high-fidelity Lisa Frank style descriptors (specifically requesting illustrations & suppressing photorealism)
  const cleanPrompt = `${cleanUserPrompt}, Lisa Frank style neon animal art vector illustration, vibrant pastel rainbow gradients, highly saturated psychedelic leopard print backgrounds, cute 90s sticker book graphics, big glossy puppy eyes, sparkly glitter stars, bold flat line art, 2D vector, NO realism, NO photorealistic details, 16:9`;
  
  try {
    console.log(`[AI Generation] Requesting Pollinations AI image for prompt: "${cleanPrompt}"`);
    const seed = Math.floor(Math.random() * 10000000);
    const imageUrl = `https://image.pollinations.ai/p/${encodeURIComponent(cleanPrompt)}?width=1024&height=576&nologo=true&seed=${seed}`;
    
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 45000, // 45 seconds timeout for GPU nodes
      headers: {
        'User-Agent': getRandomUserAgent()
      }
    });
    
    const contentType = response.headers['content-type'] || '';
    if (!contentType.includes('image')) {
      throw new Error(`Invalid response content-type: ${contentType}. Request was likely rate-limited or blocked.`);
    }
    
    fs.writeFileSync(outputPath, response.data);
    console.log(`[AI Generation] Success! Saved AI image to ${outputPath}`);
    
    res.json({
      success: true,
      imageId,
      filePath: `/thumbnails/${filename}`
    });
  } catch (err) {
    console.error(`[AI Generation] Failed (${err.message}). Switching to prompt-aligned stock search...`);
    
    try {
      const searchKeywords = extractKeywordsForSearch(prompt);
      console.log(`[Fallback Search] Querying Unsplash featured image for keywords: "${searchKeywords}"`);
      
      const searchUrl = `https://images.unsplash.com/featured/1024x576/?${encodeURIComponent(searchKeywords)}`;
      const response = await axios.get(searchUrl, {
        responseType: 'arraybuffer',
        timeout: 20000,
        headers: {
          'User-Agent': getRandomUserAgent()
        }
      });
      
      const contentType = response.headers['content-type'] || '';
      if (!contentType.includes('image')) {
        throw new Error(`Invalid search response content-type: ${contentType}`);
      }
      
      fs.writeFileSync(outputPath, response.data);
      console.log(`[Fallback Search] Success! Saved aligned image to ${outputPath}`);
      
      res.json({
        success: true,
        imageId,
        filePath: `/thumbnails/${filename}`
      });
    } catch (searchErr) {
      console.error('[Fallback Search] Specific search query failed. Requesting broad Lisa Frank style fallback...', searchErr.message);
      try {
        const broadUrl = `https://images.unsplash.com/featured/1024x576/?neon-illustration`;
        const response = await axios.get(broadUrl, {
          responseType: 'arraybuffer',
          timeout: 15000,
          headers: {
            'User-Agent': getRandomUserAgent()
          }
        });
        
        const contentType = response.headers['content-type'] || '';
        if (!contentType.includes('image')) {
          throw new Error(`Invalid broad search content-type: ${contentType}`);
        }
        
        fs.writeFileSync(outputPath, response.data);
        console.log(`[Fallback Search] Success! Saved broad Lisa Frank style image to ${outputPath}`);
        
        res.json({
          success: true,
          imageId,
          filePath: `/thumbnails/${filename}`
        });
      } catch (finalErr) {
        console.error('[Fallback Search] Final broad fallback failed:', finalErr.message);
        res.status(500).json({ error: 'All image generation and search fallback strategies failed: ' + finalErr.message });
      }
    }
  }
});

// Evolve image prompt using crossover history
app.get('/api/evolve-prompt', async (req, res) => {
  const db = readDB();
  const history = db.prompt_history || [];
  
  const adjectives = [
    "rainbow-colored", "neon-rainbow", "vibrant pastel", "sparkly", 
    "glittery", "psychedelic", "dreamy", "rainbow-gradiented",
    "ultra-colorful", "glamorous", "whimsical", "magical"
  ];
  
  const subjects = [
    "Shih Tzu puppy with big glossy eyes and a pink flower bow",
    "fluffy Shih Tzu puppy wearing a sparkly diamond collar",
    "happy Shih Tzu puppy sitting on a fluffy cotton candy cloud",
    "cute Shih Tzu puppy surrounded by floating rainbow bubbles",
    "adorable Shih Tzu puppy wearing a sparkly flower crown",
    "Shih Tzu puppy playing with cute sparkly butterfly sticker shapes",
    "Shih Tzu puppy sliding down a huge neon rainbow arch"
  ];
  
  const actions = [
    "splashing in a pool of hot pink glitter and rainbow sparkles",
    "chasing glowing magical stickers and stars in the sky",
    "dancing in a field of neon yellow and sky blue sunflowers",
    "floating gently in a sky filled with pastel neon hearts",
    "surrounded by a colorful cascade of shiny leopard prints and stars",
    "smiling amidst floating pink candy hearts and pastel ribbon swirls",
    "playing a shiny pink toy keytar synthesizer that shoots rainbows"
  ];
  
  const environments = [
    "in a magical rainbow fantasy dreamworld",
    "against a vibrant pastel sky filled with glittery neon stars",
    "on a dreamy turquoise sand beach under a pastel lavender horizon",
    "inside a whimsical sticker-book forest of giant colorful mushrooms",
    "against a bright pink backdrop covered in rainbow heart wallpaper",
    "surrounded by a gorgeous 90s aesthetic rainbow frame border"
  ];
  
  const overlays = [
    "with sparkling holographic glitter overlays and shiny stars",
    "with cute floating pastel puppy pawprints and tiny red hearts",
    "with colorful glowing rainbow rings and shimmering light beams",
    "with a bright neon-blue border and sparkly star decals"
  ];
  
  const aesthetics = [
    "in the vibrant art style of Lisa Frank, highly saturated neon rainbow colors, cute 90s sticker aesthetic, 16:9",
    "psychedelic neon rainbow digital illustration, Lisa Frank inspired, sparkly cartoon details, 16:9",
    "whimsical 90s sticker-book illustration style, rainbow gradients, ultra saturated, 16:9"
  ];
  
  let basePrompt = "";
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (apiKey && history.length >= 2) {
    try {
      const { GoogleGenAI } = require('@google/generative-ai');
      const genAI = new GoogleGenAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const p1 = history[Math.floor(Math.random() * history.length)];
      const p2 = history[Math.floor(Math.random() * history.length)];
      
      const crossoverPrompt = `You are a prompt engineer for an AI image generator. Evolve a new prompt based on these two previous prompts:
      Prompt A: "${p1}"
      Prompt B: "${p2}"
      
      Create a brand new "crossover" prompt that merges elements of stance, background, items, and style from both.
      The prompt MUST start with "A cute Shih Tzu puppy..." and describe a cute stance/action with highly vibrant, sparkly, and colorful 90s Lisa Frank rainbow aesthetic, ending with "16:9". Keep it under 280 characters. Output ONLY the raw prompt text, no JSON or quotes.`;
      
      const result = await model.generateContent(crossoverPrompt);
      basePrompt = result.response.text().trim();
    } catch (err) {
      console.warn('Gemini crossover failed, falling back:', err.message);
    }
  }
  
  if (!basePrompt) {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const sub = subjects[Math.floor(Math.random() * subjects.length)];
    const act = actions[Math.floor(Math.random() * actions.length)];
    const env = environments[Math.floor(Math.random() * environments.length)];
    const ovr = overlays[Math.floor(Math.random() * overlays.length)];
    const aes = aesthetics[Math.floor(Math.random() * aesthetics.length)];
    basePrompt = `A cute ${adj} ${sub} ${act} ${env} ${ovr}, ${aes}`;
  }
  
  res.json({ prompt: basePrompt });
});

// Compile video using FFmpeg
app.post('/api/compile-video', (req, res) => {
  const { audioPath, imagePath, title } = req.body;
  
  if (!audioPath || !imagePath) {
    return res.status(400).json({ error: 'Audio path and Image path are required' });
  }
  
  const fullAudioPath = path.join(__dirname, 'public', audioPath);
  const fullImagePath = path.join(__dirname, 'public', imagePath);
  
  const videoId = `video-${Date.now()}`;
  const videoName = `${videoId}.mp4`;
  const fullVideoPath = path.join(videoDir, videoName);
  
  // Ensure inputs exist
  if (!fs.existsSync(fullAudioPath) || !fs.existsSync(fullImagePath)) {
    return res.status(404).json({ error: 'Specified audio or image file not found on disk' });
  }
  
  console.log(`Starting FFmpeg rendering: ${fullVideoPath}`);
  
  // FFmpeg command to loop a single static image over an audio file.
  // Using -r 1 (1 fps) makes it encode extremely fast since there is only 1 frame per second.
  const cmd = `"${ffmpeg}" -loop 1 -r 1 -i "${fullImagePath}" -i "${fullAudioPath}" -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -shortest "${fullVideoPath}"`;
  
  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      console.error('FFmpeg compilation error:', err);
      return res.status(500).json({ error: 'FFmpeg rendering failed: ' + err.message });
    }
    
    console.log('FFmpeg render complete!');
    
    // Save to DB
    const db = readDB();
    const videoEntry = {
      id: videoId,
      title: title || "Cozy Lofi Chill Session",
      description: "Chill lo-fi retro synths for sleep, study, and driving.",
      tags: ["lofi", "synth", "sleep", "chill", "retro"],
      status: "Draft",
      youtubeId: "",
      filePath: `/videos/${videoName}`,
      thumbnailPath: imagePath,
      views: 0,
      dateAdded: new Date().toISOString(),
      duration: "02:00"
    };
    
    db.videos.unshift(videoEntry);
    writeDB(db);
    
    res.json({
      success: true,
      videoId,
      filePath: `/videos/${videoName}`
    });
  });
});

// Generate metadata using Gemini or rules
app.post('/api/generate-metadata', async (req, res) => {
  const { topic } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;
  
  const promptText = `Generate a YouTube video metadata payload for a LoFi/Synth chill ambient music video based on the theme: "${topic}".
  Return output in JSON format with:
  {
    "title": "Optimized YouTube Title (max 100 chars, clickbaity but chill)",
    "description": "Engaging description with tracklist (e.g. 00:00 - Neon Dreams), about the mix, and relevant sleep/relax hashtags (max 1000 chars)",
    "tags": ["lofi", "synthwave", "sleep music", "... 7 tags total"]
  }`;
  
  if (apiKey) {
    try {
      const { GoogleGenAI } = require('@google/generative-ai');
      const genAI = new GoogleGenAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(promptText);
      const text = result.response.text();
      // Parse JSON from text response
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}') + 1;
      const jsonString = text.substring(jsonStart, jsonEnd);
      return res.json(JSON.parse(jsonString));
    } catch (err) {
      console.warn('Gemini metadata generation failed, falling back to rule-based template:', err.message);
    }
  }
  
  // Rule-based fallback
  const cleanTopic = topic || "Night Drive";
  res.json({
    title: `${cleanTopic} - Synth LoFi Beats to Sleep/Chill (10 Min Loop)`,
    description: `A warm, melodic retro synth compilation for late-night vibes and deep sleep. Relax with Synthzhu.\n\nTracklist:\n00:00 - ${cleanTopic} Intro\n03:15 - Neon Pawprints\n06:40 - Late Night Bark\n\nEnjoy the chill tunes!\n\n#synthwave #lofi #sleepmusic #synthzhu`,
    tags: ["lofi", "synthwave", "sleep music", "chill beats", "retro synth", "synthzhu", "relaxation"]
  });
});

// Fetch videos list
app.get('/api/videos', (req, res) => {
  const db = readDB();
  res.json(db.videos);
});

// Upload Video (Live or Simulated)
app.post('/api/upload', async (req, res) => {
  const { videoId, title, description, tags, privacyStatus = 'private' } = req.body;
  const db = readDB();
  const videoIndex = db.videos.findIndex(v => v.id === videoId);
  if (videoIndex === -1) {
    return res.status(404).json({ error: 'Video not found' });
  }
  
  const video = db.videos[videoIndex];
  const isSimulation = process.env.SIMULATION_MODE === 'true' || db.settings.simulation_mode;
  
  if (isSimulation) {
    console.log(`[SIMULATION] Uploading video "${title}" to YouTube...`);
    // Mock upload progress
    setTimeout(() => {
      const updatedDB = readDB();
      const vi = updatedDB.videos.findIndex(v => v.id === videoId);
      if (vi !== -1) {
        updatedDB.videos[vi].status = "Public";
        updatedDB.videos[vi].youtubeId = "dQw4w9WgXcQ"; // Rickroll link for mock
        writeDB(updatedDB);
      }
    }, 5000);
    
    return res.json({
      success: true,
      simulation: true,
      youtubeId: "dQw4w9WgXcQ",
      message: 'Video upload initiated in Simulation Mode.'
    });
  }
  
  // Real YouTube Upload
  const auth = getAuthenticatedClient();
  if (!auth) {
    return res.status(401).json({ error: 'YouTube account not authenticated. Configure credentials and connect in settings.' });
  }
  
  const fullVideoPath = path.join(__dirname, 'public', video.filePath);
  if (!fs.existsSync(fullVideoPath)) {
    return res.status(404).json({ error: 'Video file missing on server disk' });
  }
  
  try {
    const youtube = google.youtube({ version: 'v3', auth });
    
    console.log(`Starting real YouTube upload for file: ${fullVideoPath}`);
    
    const response = await youtube.videos.insert({
      part: 'id,snippet,status',
      notifySubscribers: false,
      requestBody: {
        snippet: {
          title: title || video.title,
          description: description || video.description,
          tags: tags || video.tags,
          categoryId: '10' // Music category
        },
        status: {
          privacyStatus: privacyStatus
        }
      },
      media: {
        body: fs.createReadStream(fullVideoPath)
      }
    });
    
    const uploadedId = response.data.id;
    console.log(`Real YouTube upload complete. Video ID: ${uploadedId}`);
    
    db.videos[videoIndex].status = privacyStatus.charAt(0).toUpperCase() + privacyStatus.slice(1);
    db.videos[videoIndex].youtubeId = uploadedId;
    writeDB(db);
    
    res.json({
      success: true,
      simulation: false,
      youtubeId: uploadedId,
      message: 'Video successfully uploaded to YouTube!'
    });
  } catch (err) {
    console.error('YouTube upload API error:', err);
    res.status(500).json({ error: 'YouTube upload failed: ' + err.message });
  }
});

app.listen(PORT, () => {
  console.log(`YouTube Synth/LoFi Uploader running on http://localhost:${PORT}`);
});
