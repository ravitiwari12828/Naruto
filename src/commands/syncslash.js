const { isBotOwner } = require('../utils/owners');
const { registerSlashCommands } = require('../utils/slashCommands');
const emojis = require('../utils/emojis');

module.exports = {
  name: 'syncslash',
  description: 'Manually re-register Discord Slash Commands (Owner Only)',
  aliases: ['sync'],

  async execute(message, args) {
    if (!isBotOwner(message.author, message.client)) return;

    const statusMsg = await message.reply('⏳ Syncing 100 Application Slash Commands with Discord API...');
    try {
      await registerSlashCommands(message.client);
      await statusMsg.edit(`${emojis.SUCCESS || '✅'} **Slash Commands Synced!** Successfully updated 100 Discord Slash Commands globally.`);
    } catch (err) {
      await statusMsg.edit(`${emojis.ERROR || '❌'} **Sync Failed:** ${err.message}`);
    }
  }
};
