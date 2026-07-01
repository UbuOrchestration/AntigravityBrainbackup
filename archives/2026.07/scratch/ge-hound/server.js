const express = require('express');
const https = require('https');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Simple in-memory cache
const cache = {
  mapping: { data: null, expiresAt: 0 },
  latest: { data: null, expiresAt: 0 },
  timeseries: {} // keyed by "id:timestep" -> { data, expiresAt }
};

const USER_AGENT = 'GE-Hound - Flipped Margin Checker - @UbuGemini';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': USER_AGENT
      }
    };
    https.get(url, options, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`API responded with status code ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Proxied mapping endpoint (cached for 24h)
app.get('/api/mapping', async (req, res) => {
  const now = Date.now();
  if (cache.mapping.data && cache.mapping.expiresAt > now) {
    return res.json(cache.mapping.data);
  }
  try {
    const data = await fetchJson('https://prices.runescape.wiki/api/v1/osrs/mapping');
    cache.mapping.data = data;
    cache.mapping.expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours
    res.json(data);
  } catch (error) {
    console.error('Error fetching mapping:', error.message);
    if (cache.mapping.data) {
      return res.json(cache.mapping.data); // Fallback to stale cache
    }
    res.status(500).json({ error: 'Failed to fetch items mapping' });
  }
});

// Proxied latest price endpoint (cached for 60s, bypassable with force=true)
app.get('/api/latest', async (req, res) => {
  const now = Date.now();
  const force = req.query.force === 'true';
  if (!force && cache.latest.data && cache.latest.expiresAt > now) {
    return res.json(cache.latest.data);
  }
  try {
    const data = await fetchJson('https://prices.runescape.wiki/api/v1/osrs/latest');
    cache.latest.data = data;
    cache.latest.expiresAt = now + 60 * 1000; // 60 seconds
    res.json(data);
  } catch (error) {
    console.error('Error fetching latest prices:', error.message);
    if (cache.latest.data) {
      return res.json(cache.latest.data); // Fallback to stale cache
    }
    res.status(500).json({ error: 'Failed to fetch latest prices' });
  }
});

// Proxied timeseries endpoint (cached for 10m)
app.get('/api/timeseries', async (req, res) => {
  const { id, timestep } = req.query;
  if (!id || !timestep) {
    return res.status(400).json({ error: 'Parameters id and timestep are required' });
  }
  const cacheKey = `${id}:${timestep}`;
  const now = Date.now();
  if (cache.timeseries[cacheKey] && cache.timeseries[cacheKey].expiresAt > now) {
    return res.json(cache.timeseries[cacheKey].data);
  }
  try {
    const data = await fetchJson(`https://prices.runescape.wiki/api/v1/osrs/timeseries?id=${id}&timestep=${timestep}`);
    cache.timeseries[cacheKey] = {
      data,
      expiresAt: now + 10 * 60 * 1000 // 10 minutes
    };
    res.json(data);
  } catch (error) {
    console.error(`Error fetching timeseries for ${cacheKey}:`, error.message);
    if (cache.timeseries[cacheKey]) {
      return res.json(cache.timeseries[cacheKey].data); // Fallback
    }
    res.status(500).json({ error: 'Failed to fetch timeseries data' });
  }
});

app.listen(PORT, () => {
  console.log(`GE-Hound backend server running at http://localhost:${PORT}`);
});
