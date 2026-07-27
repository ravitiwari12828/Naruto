const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const items = require('../../config/items');
const { removeItem, bumpQuest, fmt } = require('../../utils/economyCore');

module.exports = {
  name: 'sell',
  description: 'Sell items or gathered resources from your inventory for coins.',
  usage: '.sell <item id> [amount|all]',
  cooldown: 3000,
  async execute(message, args) {
    const rawId = (args[0] || '').toLowerCase();
    const item = items.findItem(rawId);

    if (!item) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} Item not found. Check \`.inventory\` to see valid item IDs.`)] });
    }

    const eco = db.economy(message.guild.id, message.author.id);
    const have = eco.inventory?.[item.id] || 0;

    if (!have || have <= 0) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} You don't have any **${item.name}** (\`${item.id}\`) in your inventory.`)] });
    }

    const amount = (args[1] || '').toLowerCase() === 'all' ? have : Math.min(have, Math.max(1, parseInt(args[1], 10) || 1));
    const unitPrice = item.sell || Math.floor((item.price || 100) * 0.75) || 50;
    const earned = unitPrice * amount;

    removeItem(eco.inventory, item.id, amount);
    eco.balance += earned;
    bumpQuest(eco, 'sell5', amount);
    bumpQuest(eco, 'earn500', earned);
    db.setEconomy(message.guild.id, message.author.id, eco);

    return message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor(config.successColor)
        .setTitle(`${emojis.money} Item Sold!`)
        .setDescription(`You sold **${amount}x ${item.name}** ${item.emoji} for **+${fmt(earned)}** ${emojis.coin}!\n-# Unit sell price: ${fmt(unitPrice)} ${emojis.coin}`)
        .setFooter({ text: `New Wallet Balance: ${fmt(eco.balance)} ${emojis.coin}` })
        .setTimestamp()],
    });
  },
};
