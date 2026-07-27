const { EmbedBuilder } = require('discord.js');
const db = require('../../../database/db');
const config = require('../../../config');
const emojis = require('../../../config/emojis');
const items = require('../../../config/items');
const { removeItem, addItem } = require('../../../utils/economyCore');

module.exports = {
  name: 'gift',
  description: 'Gift an item from your inventory to another member.',
  usage: '!gift @user <item id> [amount]',
  cooldown: 3000,
  async execute(message, args) {
    const target = message.mentions.users.first();
    if (!target || target.id === message.author.id || target.bot) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} Mention a valid member to gift to.`)] });
    }
    const itemId = (args.find((a) => !a.startsWith('<')) || '').toLowerCase();
    const item = items.findItem(itemId);
    if (!item) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} Unknown item. Check \`!inventory\` for the item id.`)] });
    }

    const amount = Math.max(1, parseInt(args[args.length - 1], 10) || 1);
    const sender = db.economy(message.guild.id, message.author.id);
    if (!removeItem(sender, itemId, amount)) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} You don't have **${amount}× ${item.name}** to gift.`)] });
    }

    const receiver = db.economy(message.guild.id, target.id);
    addItem(receiver, itemId, amount);
    db.setEconomy(message.guild.id, message.author.id, sender);
    db.setEconomy(message.guild.id, target.id, receiver);

    await message.channel.send({
      embeds: [new EmbedBuilder().setColor(config.successColor).setTitle(`${emojis.present} Gift Sent`)
        .setDescription(`${message.author} gifted **${amount}× ${item.emoji} ${item.name}** to ${target}!`)
        .setTimestamp()],
    });
  },
};
