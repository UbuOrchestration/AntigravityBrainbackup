import axios from 'axios';

async function testLinks() {
    const liveUrl = 'https://www.ebay.com/itm/800315496666';
    const sandboxUrl = 'https://www.sandbox.ebay.com/itm/800315496666';

    try {
        const resLive = await axios.get(liveUrl, { timeout: 10000, validateStatus: () => true });
        console.log(`Live eBay status: ${resLive.status}`);
        if (resLive.data) {
            const titleMatch = resLive.data.match(/<title>(.*?)<\/title>/i);
            console.log(`Live title: ${titleMatch ? titleMatch[1] : 'none'}`);
        }
    } catch (e: any) {
        console.error(`Live error: ${e.message}`);
    }

    try {
        const resSandbox = await axios.get(sandboxUrl, { timeout: 10000, validateStatus: () => true });
        console.log(`Sandbox eBay status: ${resSandbox.status}`);
        if (resSandbox.data) {
            const titleMatch = resSandbox.data.match(/<title>(.*?)<\/title>/i);
            console.log(`Sandbox title: ${titleMatch ? titleMatch[1] : 'none'}`);
        }
    } catch (e: any) {
        console.error(`Sandbox error: ${e.message}`);
    }
}

testLinks().catch(console.error);
