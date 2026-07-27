const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const { fmt } = require('../../utils/economyCore');

module.exports = {
  name: 'crime',
  description: 'High risk, high reward — commit a (fake) crime for coins, or get caught and pay a fine.',
  usage: '!crime',
  cooldown: 60000,
  async execute(message) {
    const acc = db.economy(message.guild.id, message.author.id);
    const success = Math.random() < 0.55;

    if (success) {
      const reward = Math.floor(Math.random() * 200) + 50;
      acc.balance += reward;
      db.setEconomy(message.guild.id, message.author.id, acc);
      return message.channel.send({
        embeds: [new EmbedBuilder()
          .setColor(config.successColor)
          .setDescription(`${emojis.detective} You pulled it off and made off with **${fmt(reward)}** ${emojis.coin}!`)
          .setFooter({ text: `New balance: ${fmt(acc.balance)} coins` })],
      });
    }

    const fine = Math.min(acc.balance, Math.floor(Math.random() * 100) + 25);
    acc.balance -= fine;
    db.setEconomy(message.guild.id, message.author.id, acc);
    message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor(config.errorColor)
        .setDescription(`${emojis.police} You got caught! Fined **${fmt(fine)}** ${emojis.coin}.`)
        .setFooter({ text: `New balance: ${fmt(acc.balance)} coins` })],
    });
  },
};
