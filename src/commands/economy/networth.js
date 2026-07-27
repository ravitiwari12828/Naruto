const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const { fmt } = require('../../utils/economyCore');

module.exports = {
  name: 'networth',
  description: 'Shows your total wealth (wallet + bank).',
  usage: '!networth [@user]',
  cooldown: 3000,
  async execute(message) {
    const target = message.mentions.users.first() || message.author;
    const acc = db.economy(message.guild.id, target.id);
    message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor(config.embedColor)
        .setTitle(`${emojis.chart} ${target.username}'s Net Worth`)
        .setThumbnail(target.displayAvatarURL())
        .addFields(
          { name: `${emojis.money} Wallet`, value: `${fmt(acc.balance)}`, inline: true },
          { name: `${emojis.bank} Bank`, value: `${fmt(acc.bank)}`, inline: true },
          { name: `${emojis.gem} Total`, value: `**${fmt(acc.balance + acc.bank)}**`, inline: true },
        )
        .setTimestamp()],
    });
  },
};
