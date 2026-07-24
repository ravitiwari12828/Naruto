/**
 * Bot Owner Registry for Naruto One Bot
 * 
 * Primary Bot Owner: 1529362747047805029 (sy_nn)
 * Co-Bot Owner: 1420687548807905324 (Ravit)
 * Extra Bot Owner: 1514546738055348237 (gojo_katura)
 */

const PRIMARY_BOT_OWNER_ID = '1529362747047805029'; // sy_nn

const MAIN_BOT_OWNER_IDS = new Set([
  '1529362747047805029', // Primary Bot Owner (sy_nn)
  '1420687548807905324'  // Co-Bot Owner
]);

const EXTRA_BOT_OWNER_IDS = new Set([
  '1514546738055348237'  // Bot Extra Owner
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
  PRIMARY_BOT_OWNER_ID,
  MAIN_BOT_OWNER_IDS,
  EXTRA_BOT_OWNER_IDS,
  isMainBotOwner,
  isExtraBotOwner,
  isBotOwner
};
