import { spawn } from 'child_process';
import fs from 'fs';

function launchDirect() {
    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    
    const browserExe = fs.existsSync(chromePath) ? chromePath : edgePath;
    console.log(`Using browser executable: ${browserExe}`);

    const url = 'https://www.ebay.com/itm/800315497988';
    
    const child = spawn(browserExe, [url], {
        detached: true,
        stdio: 'ignore'
    });
    child.unref();

    console.log("Spawned browser directly!");
}

launchDirect();
