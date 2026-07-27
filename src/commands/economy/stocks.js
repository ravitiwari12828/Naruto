const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const items = require('../../config/items');
const { fmt } = require('../../utils/economyCore');

// Simple simulated market: each ticker's price random-walks a little every
// time it's looked up. Fully self-contained fiction — not real financial data.
function tick(guildId) {
  const state = db.get(`stockmarket_${guildId}`, {});
  for (const [ticker, info] of Object.entries(items.STOCKS)) {
    if (!state[ticker]) state[ticker] = info.price;
    const change = (Math.random() - 0.48) * (state[ticker] * 0.08);
    state[ticker] = Math.max(5, Math.round(state[ticker] + change));
  }
  db.set(`stockmarket_${guildId}`, state);
  return state;
}

module.exports = {
  name: 'stocks',
  description: 'View simulated stock prices, or buy/sell shares: !stocks buy TICKER amount',
  usage: '!stocks [buy|sell TICKER amount]',
  cooldown: 3000,
  async execute(message, args) {
    const prices = tick(message.guild.id);
    const sub = (args[0] || '').toLowerCase();

    if (sub === 'buy' || sub === 'sell') {
      const ticker = (args[1] || '').toUpperCase();
      const amount = Math.max(1, parseInt(args[2], 10) || 1);
      if (!items.STOCKS[ticker]) {
        return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} Unknown ticker. Valid: ${Object.keys(items.STOCKS).join(', ')}`)] });
      }

      const eco = db.economy(message.guild.id, message.author.id);
      const price = prices[ticker];
      const cost = price * amount;

      if (sub === 'buy') {
        if (eco.balance < cost) {
          return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} You need **${fmt(cost)}** ${emojis.coin} to buy ${amount} shares of ${ticker}.`)] });
        }
        eco.balance -= cost;
        eco.stocks[ticker] = (eco.stocks[ticker] || 0) + amount;
      } else {
        if ((eco.stocks[ticker] || 0) < amount) {
          return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} You don't own **${amount}** shares of ${ticker}.`)] });
        }
        eco.stocks[ticker] -= amount;
        eco.balance += cost;
      }
      db.setEconomy(message.guild.id, message.author.id, eco);

      return message.channel.send({
        embeds: [new EmbedBuilder()
          .setColor(config.successColor)
          .setTitle(`${emojis.arrowUp} ${sub === 'buy' ? 'Bought' : 'Sold'} Shares`)
          .setDescription(`${sub === 'buy' ? 'Bought' : 'Sold'} **${amount}× ${ticker}** at **${fmt(price)}** ${emojis.coin} each — total **${fmt(cost)}** ${emojis.coin}.`)
          .setFooter({ text: `New balance: ${fmt(eco.balance)} coins` })],
      });
    }

    const eco = db.economy(message.guild.id, message.author.id);
    const lines = Object.entries(items.STOCKS).map(([ticker, info]) => {
      const owned = eco.stocks[ticker] || 0;
      return `**${ticker}** (${info.name}) — ${fmt(prices[ticker])} ${emojis.coin}${owned ? ` — you own ${owned}` : ''}`;
    });
    await message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor(config.embedColor)
        .setTitle('📈 Stock Market')
        .setDescription(lines.join('\n'))
        .setFooter({ text: '!stocks buy/sell <TICKER> <amount>' })
        .setTimestamp()],
    });
  },
};
