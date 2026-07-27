const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const items = require('../../config/items');
const { fmt } = require('../../utils/economyCore');

module.exports = {
  name: 'buy',
  description: 'Buy a tool or consumable from the shop.',
  usage: '!buy <item id> [amount]',
  cooldown: 3000,
  async execute(message, args) {
    const itemId = (args[0] || '').toLowerCase();
    const amount = Math.max(1, parseInt(args[1], 10) || 1);
    const shopItem = items.TOOLS[itemId] || items.CONSUMABLES[itemId];
    if (!shopItem) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} That's not a purchasable item. Check \`!shop\` for valid IDs.`)],
      });
    }

    const eco = db.economy(message.guild.id, message.author.id);
    const cost = shopItem.price * amount;
    if (eco.balance < cost) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} You need **${fmt(cost)}** ${emojis.coin} but only have **${fmt(eco.balance)}**.`)],
      });
    }

    eco.balance -= cost;
    eco.inventory[itemId] = (eco.inventory[itemId] || 0) + amount;
    db.setEconomy(message.guild.id, message.author.id, eco);

    await message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor(config.successColor)
        .setTitle(`${emojis.success} Purchase Complete`)
        .setDescription(`Bought **${amount}× ${shopItem.emoji} ${shopItem.name}** for **${fmt(cost)}** ${emojis.coin}.`)
        .setFooter({ text: `Remaining balance: ${fmt(eco.balance)} coins` })],
    });
  },
};
