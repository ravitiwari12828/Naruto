const emojis = require('../utils/emojis');

// Global No-Prefix Store (Permanently Disabled by User Request)
const noPrefixStore = new Map();

function parseDurationMs() {
  return null;
}

function formatExpiryText() {
  return 'Disabled';
}

function isNoPrefixUser() {
  return false;
}

module.exports = {
  name: 'noprefix',
  description: 'No-Prefix feature has been permanently removed. All commands require prefix.',
  aliases: ['npuser', 'noprefixadd', 'noprefixremove'],
  noPrefixStore,
  isNoPrefixUser,
  parseDurationMs,
  formatExpiryText,

  async execute(message) {
    return message.reply(`${emojis.INFO || 'ℹ️'} **No-Prefix Feature Disabled**: No-prefix functionality has been permanently removed from Naruto Bot. All commands strictly require the \`.\` prefix.`);
  }
};
