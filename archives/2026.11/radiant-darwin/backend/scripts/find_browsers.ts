import fs from 'fs';

const paths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
    'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe',
    'C:\\Users\\Ubu\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Users\\Ubu\\AppData\\Local\\Microsoft\\Edge\\Application\\msedge.exe'
];

for (const p of paths) {
    if (fs.existsSync(p)) {
        console.log(`FOUND: ${p}`);
    }
}
