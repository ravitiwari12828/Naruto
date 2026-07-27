const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const items = require('../../config/items');
const { fmt } = require('../../utils/economyCore');

module.exports = {
  name: 'stocks',
  aliases: ['stock', 'share', 'shares'],
  description: 'View the Leaf Village Stock Market and trade company shares.',
  usage: '.stocks [buy|sell <ticker> <amount>]',
  cooldown: 3000,
  async execute(message, args) {
    const sub = (args[0] || '').toLowerCase();
    const ticker = (args[1] || '').toUpperCase();
    const amount = parseInt(args[2], 10) || 1;

    const eco = db.economy(message.guild.id, message.author.id);
    eco.stocks = eco.stocks || {};

    if (sub === 'buy') {
      const stock = items.STOCKS[ticker];
      if (!stock) {
        return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} Invalid ticker symbol. Valid tickers: **${Object.keys(items.STOCKS).join(', ')}**`)] });
      }

      const totalCost = stock.price * amount;
      if (eco.balance < totalCost) {
        return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} You need **${fmt(totalCost)}** ${emojis.coin} to buy **${amount}x ${ticker}**. Wallet: **${fmt(eco.balance)}** ${emojis.coin}.`)] });
      }

      eco.balance -= totalCost;
      eco.stocks[ticker] = (eco.stocks[ticker] || 0) + amount;
      db.setEconomy(message.guild.id, message.author.id, eco);

      return message.channel.send({
        embeds: [new EmbedBuilder()
          .setColor(config.successColor)
          .setTitle(`📈 Stock Purchase Successful!`)
          .setDescription(`Purchased **${amount}x ${ticker}** (${stock.name}) for **${fmt(totalCost)}** ${emojis.coin}.\n-# You now own **${eco.stocks[ticker]}** shares of ${ticker}.`)
          .setFooter({ text: `New Wallet Balance: ${fmt(eco.balance)} ${emojis.coin}` })],
      });
    }

    if (sub === 'sell') {
      const stock = items.STOCKS[ticker];
      if (!stock) {
        return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} Invalid ticker symbol. Valid tickers: **${Object.keys(items.STOCKS).join(', ')}**`)] });
      }

      const owned = eco.stocks[ticker] || 0;
      if (owned < amount) {
        return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} You only own **${owned}** shares of **${ticker}**.`)] });
      }

      const totalReturn = stock.price * amount;
      eco.stocks[ticker] -= amount;
      if (eco.stocks[ticker] <= 0) delete eco.stocks[ticker];
      eco.balance += totalReturn;
      db.setEconomy(message.guild.id, message.author.id, eco);

      return message.channel.send({
        embeds: [new EmbedBuilder()
          .setColor(config.successColor)
          .setTitle(`📉 Stock Sale Successful!`)
          .setDescription(`Sold **${amount}x ${ticker}** (${stock.name}) for **+${fmt(totalReturn)}** ${emojis.coin}.\n-# Remaining shares: **${eco.stocks[ticker] || 0}**`)
          .setFooter({ text: `New Wallet Balance: ${fmt(eco.balance)} ${emojis.coin}` })],
      });
    }

    const lines = Object.entries(items.STOCKS).map(([sym, st]) => {
      const owned = eco.stocks[sym] || 0;
      return `📈 **${sym}** — ${st.name}\n-# Price: **${fmt(st.price)}** ${emojis.coin} (${st.trend}) • Owned: **${owned}** • Buy: \`.stocks buy ${sym} 1\``;
    });

    const embed = new EmbedBuilder()
      .setColor(config.embedColor)
      .setTitle(`📈 Leaf Village Stock Market`)
      .setThumbnail(message.guild.iconURL({ dynamic: true }) || message.client.user.displayAvatarURL())
      .setDescription(lines.join('\n\n'))
      .setFooter({ text: 'Use .stocks buy <ticker> <amount> or .stocks sell <ticker> <amount>' })
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  },
};
