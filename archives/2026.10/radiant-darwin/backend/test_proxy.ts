import axios from 'axios';

async function run() {
    const targetUrl = 'http://api.scraperapi.com/?api_key=06496472b790e359d8d3796421f40cb1&url=' + encodeURIComponent('https://httpbin.org/ip');
    const response = await axios.get(targetUrl);
    console.log(response.data);
}
run().catch(console.error);
