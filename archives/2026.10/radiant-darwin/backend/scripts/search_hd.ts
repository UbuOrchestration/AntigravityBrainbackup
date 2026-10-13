import axios from 'axios';

async function searchHomeDepot() {
    try {
        const query = encodeURIComponent('site:homedepot.com "Camco" "Leveling Blocks" "10"');
        const res = await axios.get(`https://html.duckduckgo.com/html/?q=${query}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        const matches = res.data.match(/https%3A%2F%2Fwww\.homedepot\.com%2Fp%2F[^\&]+/g) || [];
        console.log("Decoded URLs:", matches.map((m: string) => decodeURIComponent(m)));
    } catch (e: any) {
        console.error(e.message);
    }
}

searchHomeDepot();
