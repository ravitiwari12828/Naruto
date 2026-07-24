/**
 * index.js — Root Entrypoint for Endercloud / Pterodactyl
 */

'use strict';

const v8 = require('v8');
try {
  v8.setFlagsFromString('--max_old_space_size=512');
} catch (e) {}

require('./src/index.js');
