const { EmbedBuilder } = require('discord.js');
const db = require('../../../database/db');
const config = require('../../../config');
const emojis = require('../../../config/emojis');
const items = require('../../../config/items');
const { fmt } = require('../../../utils/economyCore');

module.exports = {
  name: 'inventory',
  description: "View your (or another member's) inventory of tools, resources and consumables.",
  usage: '!inventory [@user]',
  cooldown: 3000,
  async execute(message) {
    const target = message.mentions.users.first() || message.author;
    const eco = db.economy(message.guild.id, target.id);
    const entries = Object.entries(eco.inventory || {});
    if (!entries.length) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(config.embedColor).setDescription(`${emojis.info} ${target.id === message.author.id ? 'You have' : `${target.username} has`} no items yet. Try \`!hunt\`, \`!fish\`, \`!mine\`, \`!chop\`, or \`!dig\`.`)],
      });
    }

    const all = items.allItems();
    const lines = entries
      .map(([id, qty]) => ({ id, qty, item: all[id] }))
      .filter((e) => e.item)
      .sort((a, b) => (b.item.sell || b.item.price || 0) - (a.item.sell || a.item.price || 0))
      .map((e) => `${e.item.emoji} **${e.item.name}** × ${e.qty}${e.item.sell ? ` — sell for ${fmt(e.item.sell)} ${emojis.coin} each` : ''}`);

    const embed = new EmbedBuilder()
      .setColor(config.embedColor)
      .setTitle(`🎒 ${target.username}'s Inventory`)
      .setThumbnail(target.displayAvatarURL())
      .setDescription(lines.join('\n').slice(0, 4000))
      .addFields(
        { name: `${emojis.money} Wallet`, value: `${fmt(eco.balance)} ${emojis.coin}`, inline: true },
        { name: `${emojis.bank} Bank`, value: `${fmt(eco.bank)} ${emojis.coin}`, inline: true },
        { name: `${emojis.gem} Gems`, value: `${fmt(eco.gems)} ${emojis.gem}`, inline: true },
      )
      .setFooter({ text: `${entries.length} unique item${entries.length === 1 ? '' : 's'}` })
      .setTimestamp();
    await message.channel.send({ embeds: [embed] });
  },
};
