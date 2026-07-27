const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const items = require('../../config/items');
const { fmt } = require('../../utils/economyCore');

module.exports = {
  name: 'inventory',
  aliases: ['inv'],
  description: 'View your inventory items, tools, and gathered resources.',
  usage: '.inventory',
  cooldown: 3000,
  async execute(message) {
    const eco = db.economy(message.guild.id, message.author.id);
    const inv = eco.inventory || {};
    const entries = Object.entries(inv).filter(([_, qty]) => qty > 0);

    if (!entries.length) {
      return message.channel.send({
        embeds: [new EmbedBuilder()
          .setColor(config.embedColor)
          .setTitle(`🎒 ${message.author.username}'s Inventory`)
          .setDescription(`Your inventory is currently empty!\n-# Use \`.shop\` to buy tools or \`.mine\`, \`.chop\`, \`.fish\` to gather resources.`)
          .setFooter({ text: `Wallet: ${fmt(eco.balance)} ${emojis.coin}` })],
      });
    }

    let totalValue = 0;
    const lines = entries.map(([id, qty]) => {
      const item = items.findItem(id) || { id, name: id, emoji: '📦', price: 100 };
      const sellPrice = item.sell || Math.floor((item.price || 100) * 0.75) || 50;
      const val = sellPrice * qty;
      totalValue += val;
      return `${item.emoji} **${item.name}** \`(ID: ${id})\` — **x${fmt(qty)}**\n-# Sell Value: ${fmt(val)} ${emojis.coin} (${fmt(sellPrice)}/ea) • Use: \`.sell ${id} ${qty}\``;
    });

    const embed = new EmbedBuilder()
      .setColor(config.embedColor)
      .setTitle(`🎒 ${message.author.username}'s Inventory`)
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .setDescription(lines.join('\n\n'))
      .setFooter({ text: `Total Items: ${entries.length} • Total Est. Sell Value: ${fmt(totalValue)} ${emojis.coin}` })
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  },
};
