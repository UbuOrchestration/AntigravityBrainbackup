const { runAudit } = require('./data_quality_engine.js');
const res = runAudit();
console.log('Health Score:', res.healthScore);
console.log('Metrics:', res.metrics);
