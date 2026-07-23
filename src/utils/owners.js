/**
 * Two-Tier Bot Owner Registry for Naruto One Bot
 * 
 * Main Bot Owner: 1420687548807905324 / Synn (1529362747047805029)
 * Bot Extra Owner: 1514546738055348237
 */

const MAIN_BOT_OWNER_IDS = new Set([
  '1420687548807905324', // Main Bot Owner ID
  '1529362747047805029'  // Synn Owner ID
]);

const EXTRA_BOT_OWNER_IDS = new Set([
  '1514546738055348237'  // Bot Extra Owner ID
]);

/**
 * Checks if user is the Main (Primary/Root) Bot Owner
 */
function isMainBotOwner(user, client = null) {
  if (!user) return false;
  const id = typeof user === 'string' ? user : user.id;
  if (MAIN_BOT_OWNER_IDS.has(id)) return true;
  if (user.tag === 'sy_nn' || user.username === 'sy_nn') return true;

  const appOwnerId = client?.application?.owner?.id;
  if (appOwnerId && id === appOwnerId) return true;

  return false;
}

/**
 * Checks if user is a Bot Extra Owner
 */
function isExtraBotOwner(user) {
  if (!user) return false;
  const id = typeof user === 'string' ? user : user.id;
  return EXTRA_BOT_OWNER_IDS.has(id);
}

/**
 * Checks if user is either Main Bot Owner or Bot Extra Owner (Has Full Owner Privileges)
 */
function isBotOwner(user, client = null) {
  return isMainBotOwner(user, client) || isExtraBotOwner(user);
}

module.exports = {
  MAIN_BOT_OWNER_IDS,
  EXTRA_BOT_OWNER_IDS,
  isMainBotOwner,
  isExtraBotOwner,
  isBotOwner
};
