import https from 'https';

function checkUrl(url: string) {
    return new Promise((resolve) => {
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        };
        https.get(url, options, (res) => {
            console.log(`Status: ${res.statusCode} | Location: ${res.headers.location}`);
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const titleMatch = data.match(/<title>([^<]+)<\/title>/i);
                console.log(`Page title: ${titleMatch ? titleMatch[1] : 'No title'}`);
                resolve(data);
            });
        }).on('error', (e) => {
            console.error('Error:', e.message);
            resolve(null);
        });
    });
}

checkUrl('https://www.amazon.com/dp/B004809YOC');
