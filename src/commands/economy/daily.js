const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const { cooldownLeft, fmt } = require('../../utils/economyCore');

const DAY = 24 * 60 * 60 * 1000;
const GRACE = 48 * 60 * 60 * 1000; // claim again within 48h of the last claim to keep the streak alive
const STREAK_CAP_DAYS = 50; // 50 * 15 = 750, matches the bonus cap below

module.exports = {
  name: 'daily',
  description: 'Claim your daily reward — keep your streak alive for bigger payouts.',
  usage: '.daily',
  cooldown: 3000,
  async execute(message) {
    const eco = db.economy(message.guild.id, message.author.id);
    const cd = cooldownLeft(eco.lastDaily, DAY);
    if (!cd.ready) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.warnColor)
          .setDescription(`${emojis.hourglass} You already claimed your daily. Come back in **${cd.text}**.`)],
      });
    }

    const now = Date.now();
    const withinGrace = now - eco.lastDaily < GRACE;
    eco.dailyStreak = withinGrace ? (eco.dailyStreak || 0) + 1 : 1;

    const base = 250;
    const streakBonus = Math.min(eco.dailyStreak * 15, 750);
    const reward = base + streakBonus;

    eco.balance += reward;
    eco.lastDaily = now;
    db.setEconomy(message.guild.id, message.author.id, eco);

    const progress = Math.min(1, eco.dailyStreak / STREAK_CAP_DAYS);
    const filled = Math.round(progress * 10);
    const bar = `${'█'.repeat(filled)}${'░'.repeat(10 - filled)}`;
    const atCap = streakBonus >= 750;

    const embed = new EmbedBuilder()
      .setColor(config.successColor)
      .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
      .setTitle(`${emojis.money} Daily Reward Claimed`)
      .setDescription(`You claimed **${fmt(reward)}** ${emojis.coin}\n-# ${fmt(base)} base + ${fmt(streakBonus)} streak bonus`)
      .addFields(
        { name: `${emojis.fire} Streak`, value: `**${eco.dailyStreak}** day${eco.dailyStreak === 1 ? '' : 's'}`, inline: true },
        { name: `${emojis.wallet || emojis.money} New Balance`, value: `${fmt(eco.balance)} ${emojis.coin}`, inline: true },
        { name: '\u200b', value: `-# Bonus progress ${atCap ? '(maxed out!)' : ''}\n${bar} ${eco.dailyStreak}/${STREAK_CAP_DAYS}` },
      )
      .setFooter({ text: "Come back within 48h to keep your streak — don't break it!" })
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
  },
};
