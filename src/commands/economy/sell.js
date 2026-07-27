const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const items = require('../../config/items');
const { removeItem, bumpQuest, fmt } = require('../../utils/economyCore');

module.exports = {
  name: 'sell',
  description: 'Sell a resource from your inventory for coins.',
  usage: '!sell <item id> [amount|all]',
  cooldown: 3000,
  async execute(message, args) {
    const itemId = (args[0] || '').toLowerCase();
    const resource = items.RESOURCES[itemId];
    if (!resource) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} That item can't be sold here. Check \`!inventory\` for what you own.`)] });
    }

    const eco = db.economy(message.guild.id, message.author.id);
    const have = eco.inventory[itemId] || 0;
    if (!have) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} You don't have any **${resource.name}** to sell.`)] });
    }

    const amount = args[1] === 'all' ? have : Math.min(have, Math.max(1, parseInt(args[1], 10) || 1));
    removeItem(eco, itemId, amount);
    const earned = resource.sell * amount;
    eco.balance += earned;
    bumpQuest(eco, 'sell5', amount);
    bumpQuest(eco, 'earn500', earned);
    db.setEconomy(message.guild.id, message.author.id, eco);

    await message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor(config.successColor)
        .setTitle(`${emojis.money} Sold!`)
        .setDescription(`Sold **${amount}× ${resource.emoji} ${resource.name}** for **${fmt(earned)}** ${emojis.coin}.`)
        .setFooter({ text: `New balance: ${fmt(eco.balance)} coins` })],
    });
  },
};
