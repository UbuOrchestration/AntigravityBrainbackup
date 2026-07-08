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
  const { duration = 120, bpm = 75, mood = 'cozy', gains } = req.body;
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

// Generate Image (Real AI Image Generation)
app.post('/api/generate-image', async (req, res) => {
  const { prompt } = req.body;
  const imageId = `img-${Date.now()}`;
  const filename = `${imageId}.jpg`;
  const outputPath = path.join(thumbDir, filename);
  
  // Add to prompt history
  const db = readDB();
  if (!db.prompt_history) db.prompt_history = [];
  if (prompt && !db.prompt_history.includes(prompt)) {
    db.prompt_history.push(prompt);
    if (db.prompt_history.length > 20) db.prompt_history.shift();
    writeDB(db);
  }
  
  try {
    console.log(`Generating real image via Pollinations AI for prompt: "${prompt}"`);
    const imageUrl = `https://image.pollinations.ai/p/${encodeURIComponent(prompt)}?width=1280&height=720&nologo=true`;
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000 });
    fs.writeFileSync(outputPath, response.data);
    console.log(`Successfully generated and saved real AI image to ${outputPath}`);
    
    res.json({
      success: true,
      imageId,
      filePath: `/thumbnails/${filename}`
    });
  } catch (err) {
    console.error('Real image generation failed, falling back to SVG mockup:', err.message);
    
    const gradientColors = [
      ['#ff007f', '#7f00ff'],
      ['#007fff', '#00ffcc'],
      ['#4b0082', '#ff007f'],
      ['#ffaa00', '#ff0055']
    ];
    const colorPair = gradientColors[Math.floor(Math.random() * gradientColors.length)];
    
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${colorPair[0]}" />
          <stop offset="50%" stop-color="#120c1f" />
          <stop offset="100%" stop-color="${colorPair[1]}" />
        </linearGradient>
      </defs>
      <rect width="1280" height="720" fill="url(#g)" />
      <path d="M 0,360 L 1280,360 M 0,400 L 1280,400 M 0,460 L 1280,460 M 0,540 L 1280,540 M 0,660 L 1280,660" stroke="#ffffff" stroke-width="0.5" opacity="0.1" />
      <path d="M 640,360 L 0,720 M 640,360 L 200,720 M 640,360 L 400,720 M 640,360 L 640,720 M 640,360 L 880,720 M 640,360 L 1080,720 M 640,360 L 1280,720" stroke="#ffffff" stroke-width="0.5" opacity="0.1" />
      <circle cx="640" cy="300" r="120" fill="#ff007f" opacity="0.8" />
      <text x="640" y="520" font-family="sans-serif" font-weight="bold" font-size="42" fill="#ffffff" text-anchor="middle" letter-spacing="4">SYNTHZHU</text>
      <text x="640" y="570" font-family="sans-serif" font-size="20" fill="#00ffcc" text-anchor="middle" opacity="0.8">${prompt.substring(0, 70)}...</text>
    </svg>`;
    
    try {
      fs.writeFileSync(outputPath, svg);
      res.json({
        success: true,
        imageId,
        filePath: `/thumbnails/${filename}`
      });
    } catch (writeErr) {
      res.status(500).json({ error: 'Image creation failed: ' + writeErr.message });
    }
  }
});

// Evolve image prompt using crossover history
app.get('/api/evolve-prompt', async (req, res) => {
  const db = readDB();
  const history = db.prompt_history || [];
  
  const stances = [
    "wearing a futuristic glowing cyber-visor and sleeping on a holographic synthesizer pad",
    "playing a glowing neon keytar with cybernetic implants",
    "DJing in a futuristic spaceship cockpit with floating holographic soundwave curves",
    "cruising down a neon-lit futuristic megacity grid on a cybernetic hoverboard",
    "sipping a glowing neon liquid under a digital neon sign",
    "floating in a futuristic cybernetic spacesuit amongst glowing nebula rings",
    "sitting inside a high-tech glowing cockpit editing synthwave frequencies",
    "howling a cute melodic synth tune into a glowing neon laser microphone"
  ];
  
  const backgrounds = [
    "surrounded by glowing futuristic holographic interfaces and floating synth waves",
    "with a massive glowing synth sun and cybernetic grid skyscrapers in a futuristic city",
    "on a high-tech orbital space station looking over a glowing neon earth grid",
    "inside a retro-futuristic arcade console room filled with neon lasers",
    "cruising a cyber highway under towering neon glowing palm trees"
  ];
  
  const styles = [
    "vibrant futuristic cyberpunk digital art, glowing neon dog aesthetic, 16:9",
    "futuristic cybernetic 80s synthwave style, neon holograms, highly detailed, 16:9",
    "neon dog futuristic style, retro-futuristic cyberpunk anime art, 16:9",
    "high-tech neon glowing vector art, cyberpunk shih tzu character design, 16:9"
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
      The prompt MUST start with "A cute neon Shih Tzu..." and describe a cute stance/action with musical/chill/retro vibe, ending with a style and "16:9". Keep it under 280 characters. Output ONLY the raw prompt text, no JSON or quotes.`;
      
      const result = await model.generateContent(crossoverPrompt);
      basePrompt = result.response.text().trim();
    } catch (err) {
      console.warn('Gemini crossover failed, falling back:', err.message);
    }
  }
  
  if (!basePrompt) {
    const stance = stances[Math.floor(Math.random() * stances.length)];
    const bg = backgrounds[Math.floor(Math.random() * backgrounds.length)];
    const style = styles[Math.floor(Math.random() * styles.length)];
    basePrompt = `A cute neon Shih Tzu ${stance} ${bg}, ${style}`;
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
