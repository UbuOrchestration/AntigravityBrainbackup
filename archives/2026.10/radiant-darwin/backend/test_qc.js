const { runRepricerIteration } = require('./dist/tracker.js');

async function main() {
  console.log('Running single tracker cycle to test QC agent...');
  await runRepricerIteration();
  console.log('Cycle complete.');
}
main();
