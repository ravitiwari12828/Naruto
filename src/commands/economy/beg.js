const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const { fmt } = require('../../utils/economyCore');

module.exports = {
  name: 'beg',
  description: 'Beg for a small handful of coins (short cooldown, low reward).',
  usage: '.beg',
  cooldown: 30000,
  async execute(message) {
    const acc = db.economy(message.guild.id, message.author.id);
    const outcomes = [
      { amount: 0, text: 'A stranger looks at you and walks away. Nothing this time.' },
      { amount: 15, text: 'A kind stranger tosses you a few coins.' },
      { amount: 40, text: 'Someone felt generous today!' },
      { amount: 5, text: 'You found some loose change on the ground.' },
    ];
    const pick = outcomes[Math.floor(Math.random() * outcomes.length)];
    acc.balance += pick.amount;
    db.setEconomy(message.guild.id, message.author.id, acc);

    const embed = new EmbedBuilder()
      .setColor(pick.amount > 0 ? config.successColor : config.embedColor)
      .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
      .setDescription(`${emojis.money} ${pick.text}${pick.amount ? `\n**+${fmt(pick.amount)}** ${emojis.coin}` : ''}`);

    message.channel.send({ embeds: [embed] });
  },
};
