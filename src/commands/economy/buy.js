const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const items = require('../../config/items');
const { addItem, fmt } = require('../../utils/economyCore');

module.exports = {
  name: 'buy',
  description: 'Buy a tool or consumable from the shop.',
  usage: '.buy <item id> [amount]',
  cooldown: 3000,
  async execute(message, args) {
    const itemId = (args[0] || '').toLowerCase();
    const amount = Math.max(1, parseInt(args[1], 10) || 1);
    const shopItem = items.findItem(itemId) || items.TOOLS[itemId] || items.CONSUMABLES[itemId] || items.RESOURCES[itemId];

    if (!shopItem) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} That item is not available for purchase. Type \`.shop\` to view valid item IDs.`)],
      });
    }

    const eco = db.economy(message.guild.id, message.author.id);
    const totalCost = shopItem.price * amount;

    if (totalCost > eco.balance) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} Insufficient wallet balance! You need **${fmt(totalCost)}** ${emojis.coin} to buy **${amount}x ${shopItem.name}**. Wallet: **${fmt(eco.balance)}** ${emojis.coin}.`)],
      });
    }

    eco.balance -= totalCost;
    addItem(eco.inventory, shopItem.id, amount);
    db.setEconomy(message.guild.id, message.author.id, eco);

    return message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor(config.successColor)
        .setTitle(`${emojis.money} Item Purchased!`)
        .setDescription(`You bought **${amount}x ${shopItem.name}** ${shopItem.emoji} for **${fmt(totalCost)}** ${emojis.coin}.\n-# Check your inventory with \`.inventory\`.`)
        .setFooter({ text: `New Wallet Balance: ${fmt(eco.balance)} ${emojis.coin}` })
        .setTimestamp()],
    });
  },
};
