const axios = require('axios');

async function searchImage(query) {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + " product image")}`;
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    
    // DuckDuckGo HTML has images with class 'z-core' or similar, but the image search might not be in HTML version.
    // Let's just regex for any image that looks like a product.
    const matches = [...res.data.matchAll(/<img[^>]+src="([^">]+)"/gi)];
    for (const match of matches) {
      const src = match[1];
      if (src.startsWith('//') || src.startsWith('http')) {
        let fullUrl = src.startsWith('//') ? 'https:' + src : src;
        // Duckduckgo proxies images, e.g. external.duckduckgo.com/iu/?u=...
        if (fullUrl.includes('external.duckduckgo.com/iu/?u=')) {
          const actualUrl = decodeURIComponent(fullUrl.split('u=')[1].split('&')[0]);
          return actualUrl;
        }
      }
    }
  } catch (err) {
    console.error('Error searching:', err.message);
  }
  return null;
}

async function main() {
  const products = [
    'Camco 44505 RV Leveling Blocks',
    'Camco TastePURE RV Water Filter',
    'Valterra Revolution 20ft Sewer Hose Kit',
    'Lippert Water Pressure Regulator Brass Lead-Free',
    'Progressive Industries 30-Amp Smart Surge Protector'
  ];

  for (const p of products) {
    const url = await searchImage(p);
    console.log(`Product: ${p} -> ${url}`);
  }
}
main();
