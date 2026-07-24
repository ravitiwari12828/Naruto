/**
 * Naruto One Bot Root Entry Point
 * Directs execution to src/index.js with memory optimization
 */
const v8 = require('v8');
try {
  v8.setFlagsFromString('--max_old_space_size=192');
} catch (e) {}

require('./src/index.js');
