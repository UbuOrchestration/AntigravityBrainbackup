import { startTracker } from './src/tracker.js';

console.log("Starting background tracker...");
startTracker(10); // Run every 10 minutes

// Keep alive
setInterval(() => {}, 60000);
