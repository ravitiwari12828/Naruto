const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const { fmt } = require('../../utils/economyCore');

const MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

module.exports = {
  name: 'leaderboard',
  aliases: ['baltop', 'lb', 'toprich'],
  description: 'Shows the richest members in this server.',
  usage: '.leaderboard',
  async execute(message) {
    const guildId = message.guild.id;
    const store = db.data.economyStore || {};
    const guildRows = [];

    for (const [key, eco] of Object.entries(store)) {
      if (key.startsWith(`${guildId}:`)) {
        const userId = key.split(':')[1];
        const member = message.guild.members.cache.get(userId) || await message.guild.members.fetch(userId).catch(() => null);
        if (member) {
          const total = (eco.balance || 0) + (eco.bank || 0);
          guildRows.push({ userId, username: member.user.username, total, balance: eco.balance || 0, bank: eco.bank || 0 });
        }
      }
    }

    if (!guildRows.length) {
      for (const [key, u] of Object.entries(db.data.users || {})) {
        if (key.startsWith(`${guildId}:`) && u.balance > 0) {
          const userId = key.split(':')[1];
          const member = message.guild.members.cache.get(userId);
          if (member) {
            guildRows.push({ userId, username: member.user.username, total: u.balance, balance: u.balance, bank: 0 });
          }
        }
      }
    }

    guildRows.sort((a, b) => b.total - a.total);
    const top10 = guildRows.slice(0, 10);

    if (!top10.length) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.embedColor).setDescription(`${emojis.INFO || '<a:infox_animated:1537177409428787251>'} No economy data found for this server yet.`)] });
    }

    const desc = top10.map((r, i) => `${MEDALS[i] || `**${i + 1}.**`} <@${r.userId}> — **${fmt(r.total)}** ${emojis.coin}\n-# Wallet: ${fmt(r.balance)} • Bank: ${fmt(r.bank)}`).join('\n\n');

    const embed = new EmbedBuilder()
      .setColor(config.embedColor)
      .setTitle(`${emojis.money || '🪙'} Richest Shinobi Leaderboard — ${message.guild.name}`)
      .setDescription(desc)
      .setThumbnail(message.guild.iconURL({ dynamic: true }) || message.client.user.displayAvatarURL())
      .setFooter({ text: `Showing top ${top10.length} members • Use .balance to view your wallet` })
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  },
};
