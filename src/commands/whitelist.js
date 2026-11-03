const antinuke = require('./antinuke');
const emojis = require('../utils/emojis');

module.exports = {
  name: 'whitelist',
  description: 'AntiNuke Whitelist Dashboard & Granular Permissions Suite (Olympus Layout)',
  aliases: ['whitelisted', 'wl'],

  async execute(message, args) {
    if (message.guild && message.guild.ownerId !== message.author.id) {
      return message.reply(`${emojis.WARNING} **Access Denied**: Only the **Server Owner** (<@${message.guild.ownerId}>) has the authority to view, add, or configure the Whitelist!`);
    }
    return antinuke.execute(message, ['whitelist', ...args]);
  }
};
