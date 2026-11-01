import http from 'http';

function checkPort(port: number) {
    return new Promise((resolve) => {
        const req = http.get(`http://localhost:${port}`, (res) => {
            resolve(`Port ${port} is active (status ${res.statusCode})`);
        });
        req.on('error', () => {
            resolve(`Port ${port} is NOT active`);
        });
        req.setTimeout(2000, () => {
            req.destroy();
            resolve(`Port ${port} timed out`);
        });
    });
}

async function run() {
    console.log(await checkPort(5000));
    console.log(await checkPort(5173));
}

run();
