import fs from 'fs';
const data = JSON.parse(fs.readFileSync('./verified_catalog.json', 'utf8'));
console.log(data.slice(0, 3));
