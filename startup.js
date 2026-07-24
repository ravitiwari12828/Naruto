/**
 * startup.js — Universal Hosting Auto-Launcher for Endercloud / Pterodactyl
 */

'use strict';

const fs = require('fs');
const { execSync, spawn } = require('child_process');
const path = require('path');

const CWD = process.cwd();
const MAIN_FILE = 'src/index.js';

// Ensure .git directory exists so panel scripts checking [[ -d .git ]] never fail
try {
  if (!fs.existsSync(path.join(CWD, '.git'))) {
    fs.mkdirSync(path.join(CWD, '.git'), { recursive: true });
  }
} catch (e) {}

// Set V8 memory flags
const v8 = require('v8');
try {
  v8.setFlagsFromString('--max_old_space_size=512');
} catch (e) {}

console.log('🍥 ================================================');
console.log('🍥  Naruto One Bot — Online Launcher');
console.log('🍥 ================================================');

// Launch bot directly
require(path.join(CWD, MAIN_FILE));
