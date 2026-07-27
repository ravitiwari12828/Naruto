const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const { fmt } = require('../../utils/economyCore');

const MEDALS = ['🥇', '🥈', '🥉'];

module.exports = {
  name: 'leaderboard',
  description: 'Shows the richest members in this server.',
  usage: '!leaderboard',
  async execute(message) {
    const keys = db.allKeysStartingWith(`economy_${message.guild.id}_`);
    const rows = keys.map(k => {
      const userId = k.split('_')[2];
      const eco = db.get(k);
      return { userId, total: eco.balance + eco.bank };
    }).sort((a, b) => b.total - a.total).slice(0, 10);

    if (!rows.length) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.embedColor).setDescription(`${emojis.info} No economy data yet.`)] });
    }

    const desc = rows.map((r, i) => `${MEDALS[i] || `**${i + 1}.**`} <@${r.userId}> — **${fmt(r.total)}** ${emojis.coin}`).join('\n');
    message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor(config.embedColor)
        .setTitle(`${emojis.money} Richest Members`)
        .setDescription(desc)
        .setThumbnail(message.guild.iconURL())
        .setFooter({ text: `Top ${rows.length} in ${message.guild.name}` })
        .setTimestamp()],
    });
  },
};
