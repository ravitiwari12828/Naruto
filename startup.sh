#!/bin/bash
# ============================================================
# Naruto One Bot — Pterodactyl Auto-Pull Startup Script
# Set MAIN_FILE=startup.sh in your Pterodactyl panel
# Requires env vars: GIT_ADDRESS, USERNAME, ACCESS_TOKEN, BRANCH
# ============================================================

echo ""
echo "🍥 =============================================="
echo "🍥  Naruto One Bot — Auto-Update & Launch"
echo "🍥 =============================================="
echo ""

# ─────────────────────────────────────────────
# 1. FORCE-PULL LATEST CODE FROM GITHUB
# ─────────────────────────────────────────────
if [[ -d .git ]] && [ -n "${GIT_ADDRESS}" ] && [ -n "${USERNAME}" ] && [ -n "${ACCESS_TOKEN}" ]; then
    echo "📦 Pulling latest code from GitHub..."

    # Set authenticated remote URL
    git remote set-url origin "https://${USERNAME}:${ACCESS_TOKEN}@$(echo -e ${GIT_ADDRESS} | cut -d/ -f3-)"

    BRANCH="${BRANCH:-main}"

    # Fetch all remote changes
    git fetch --all --quiet

    # Force reset to remote — discards any local modifications (package.json, package-lock.json, etc.)
    git reset --hard "origin/${BRANCH}" --quiet

    echo "✅ Code updated to latest commit on branch: ${BRANCH}"
    echo "   $(git log -1 --pretty='%h — %s (%cr)')"
else
    echo "⚠️  Skipping git pull (GIT_ADDRESS, USERNAME or ACCESS_TOKEN not set)"
fi

echo ""

# ─────────────────────────────────────────────
# 2. INSTALL / UPDATE NPM DEPENDENCIES
# ─────────────────────────────────────────────
if [ -f /home/container/package.json ]; then
    echo "📦 Installing npm dependencies..."
    /usr/local/bin/npm install --prefer-offline --no-audit --no-fund 2>&1 | tail -5
    echo "✅ Dependencies installed"
fi

echo ""

# ─────────────────────────────────────────────
# 3. START THE BOT
# ─────────────────────────────────────────────
MAIN="${MAIN_FILE:-index.js}"

# If startup.sh called itself as MAIN_FILE, fall back to index.js
if [[ "${MAIN}" == "startup.sh" ]]; then
    MAIN="index.js"
fi

echo "🚀 Launching bot: ${MAIN}"
echo ""

if [[ "${MAIN}" == *.js ]]; then
    exec /usr/local/bin/node "/home/container/${MAIN}" ${NODE_ARGS}
else
    exec /usr/local/bin/ts-node --esm "/home/container/${MAIN}" ${NODE_ARGS}
fi
