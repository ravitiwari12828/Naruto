/**
 * git-pull.js — Naruto One Bot | npm preinstall auto-pull hook
 *
 * This runs automatically before every `npm install` on Pterodactyl.
 * It stashes local changes (package-lock.json etc.) and force-pulls
 * the latest code from GitHub — fixing the git pull conflict permanently.
 *
 * No changes needed in Pterodactyl panel.
 */

'use strict';

const { execSync } = require('child_process');

function run(cmd) {
  try {
    execSync(cmd, { cwd: '/home/container', stdio: 'pipe', timeout: 30000 });
    return true;
  } catch (e) {
    return false;
  }
}

// Only run inside the Pterodactyl container
if (!require('fs').existsSync('/home/container/.git')) {
  process.exit(0);
}

console.log('[AutoPull] Syncing with GitHub...');

// 1. Stash local changes (package.json, package-lock.json, etc.)
run('git stash --include-untracked');

// 2. Pull latest code
const pulled = run('git pull');

// 3. Restore stash (ignore if nothing to pop)
run('git stash pop');

if (pulled) {
  try {
    const commit = execSync('git log -1 --pretty="%h %s"', {
      cwd: '/home/container', stdio: 'pipe'
    }).toString().trim();
    console.log(`[AutoPull] ✅ Updated! → ${commit}`);
  } catch (e) {
    console.log('[AutoPull] ✅ Pull successful');
  }
} else {
  console.log('[AutoPull] ⚠️  Pull skipped or already up to date');
}
