const { EmbedBuilder } = require('discord.js');
const db = require('../../../database/db');
const config = require('../../../config');
const emojis = require('../../../config/emojis');
const { fmt } = require('../../../utils/economyCore');

module.exports = {
  name: 'balance',
  description: "Shows a member's wallet and bank balance.",
  usage: '!balance [@user]',
  async execute(message) {
    const target = message.mentions.users?.first() || message.author;
    const eco = db.economy(message.guild.id, target.id);
    const net = eco.balance + eco.bank;
    const bankPct = eco.bankLimit > 0 ? Math.min(1, eco.bank / eco.bankLimit) : 0;
    const filled = Math.round(bankPct * 10);
    const bar = `${'█'.repeat(filled)}${'░'.repeat(10 - filled)}`;

    const embed = new EmbedBuilder()
      .setColor(config.embedColor)
      .setAuthor({ name: `${target.username}'s Balance`, iconURL: target.displayAvatarURL() })
      .setThumbnail(target.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: `${emojis.money} Wallet`, value: `**${fmt(eco.balance)}** ${emojis.coin}`, inline: true },
        { name: `${emojis.bank} Bank`, value: `**${fmt(eco.bank)}** ${emojis.coin}`, inline: true },
        { name: `${emojis.gem} Gems`, value: `**${fmt(eco.gems)}**`, inline: true },
        { name: '\u200b', value: `-# Bank capacity\n${bar} ${fmt(eco.bank)}/${fmt(eco.bankLimit)}` },
        { name: `${emojis.chart} Net Worth`, value: `**${fmt(net)}** ${emojis.coin}`, inline: true },
      )
      .setFooter({ text: 'Use !deposit or !withdraw to move coins between wallet and bank.' })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  },
};
