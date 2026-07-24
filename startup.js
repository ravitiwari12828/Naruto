/**
 * startup.js — Naruto One Bot | Pterodactyl Auto-Pull Launcher
 *
 * Set MAIN_FILE=startup.js in Pterodactyl panel.
 * Pterodactyl runs: node /home/container/startup.js
 *
 * This script:
 *   1. Stashes local changes (fixes package-lock.json conflicts)
 *   2. Force-pulls latest code from GitHub
 *   3. Runs npm install
 *   4. Spawns index.js (the actual bot)
 */

'use strict';

const { execSync, spawn } = require('child_process');
const path = require('path');

const CWD = '/home/container';
const BRANCH = process.env.BRANCH || 'main';
const GIT_ADDRESS = process.env.GIT_ADDRESS || '';
const USERNAME = process.env.USERNAME || '';
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || '';
const NODE_ARGS = (process.env.NODE_ARGS || '').split(' ').filter(Boolean);

// ─────────────────────────────────────────────
// Helper: run shell command, log output
// ─────────────────────────────────────────────
function run(cmd, silent = false) {
  try {
    const out = execSync(cmd, {
      cwd: CWD,
      stdio: silent ? 'pipe' : ['inherit', 'inherit', 'inherit'],
      timeout: 60000,
    });
    return out ? out.toString().trim() : '';
  } catch (e) {
    if (!silent) console.error(`[startup] ⚠️  Command failed: ${cmd}`);
    return null;
  }
}

// ─────────────────────────────────────────────
// Banner
// ─────────────────────────────────────────────
console.log('');
console.log('🍥 ================================================');
console.log('🍥  Naruto One Bot — Auto-Update & Launch v2');
console.log('🍥 ================================================');
console.log('');

// ─────────────────────────────────────────────
// 1. AUTO-PULL FROM GITHUB
// ─────────────────────────────────────────────
if (GIT_ADDRESS && USERNAME && ACCESS_TOKEN) {
  console.log('📦 [1/3] Pulling latest code from GitHub...');

  try {
    // Set authenticated remote URL
    const cleanAddr = GIT_ADDRESS.replace(/^https?:\/\//, '');
    run(`git remote set-url origin "https://${USERNAME}:${ACCESS_TOKEN}@${cleanAddr}"`, true);

    // Stash any local changes (package.json, package-lock.json, etc.)
    // This prevents "Your local changes would be overwritten" errors
    run('git stash --include-untracked', true);

    // Fetch + hard reset to remote — guaranteed clean pull
    run(`git fetch origin ${BRANCH} --quiet`, false);
    run(`git reset --hard origin/${BRANCH} --quiet`, false);

    // Stash pop (restore local-only files if any, ignore failure)
    run('git stash pop', true);

    const latestCommit = run('git log -1 --pretty="%h — %s (%cr)"', true);
    console.log(`✅ Updated! Latest: ${latestCommit || 'unknown'}`);
  } catch (e) {
    console.log('⚠️  Git pull failed — continuing with current code...');
    console.error(e.message);
  }
} else {
  console.log('⚠️  [1/3] Skipping git pull (USERNAME/ACCESS_TOKEN/GIT_ADDRESS not set)');
}

console.log('');

// ─────────────────────────────────────────────
// 2. INSTALL DEPENDENCIES
// ─────────────────────────────────────────────
console.log('📦 [2/3] Installing npm dependencies...');
run('npm install --prefer-offline --no-audit --no-fund 2>&1 | tail -3', false);
console.log('✅ Dependencies ready');
console.log('');

// ─────────────────────────────────────────────
// 3. LAUNCH THE BOT (index.js)
// ─────────────────────────────────────────────
console.log('🚀 [3/3] Launching Naruto bot...');
console.log('');

const botArgs = [path.join(CWD, 'index.js'), ...NODE_ARGS];
const bot = spawn('/usr/local/bin/node', botArgs, {
  stdio: 'inherit',
  cwd: CWD,
  env: process.env,
});

bot.on('error', (err) => {
  console.error('[startup] Failed to launch bot:', err.message);
  process.exit(1);
});

bot.on('exit', (code) => {
  console.log(`[startup] Bot exited with code ${code}`);
  process.exit(code ?? 0);
});
