const { EmbedBuilder } = require('discord.js');
const db = require('../../../database/db');
const config = require('../../../config');
const emojis = require('../../../config/emojis');
const { cooldownLeft, fmt } = require('../../../utils/economyCore');
const WEEK = 7 * 24 * 60 * 60 * 1000;

module.exports = {
  name: 'weekly',
  description: 'Claim your weekly reward (bigger than daily).',
  usage: '!weekly',
  cooldown: 3000,
  async execute(message) {
    const eco = db.economy(message.guild.id, message.author.id);
    const cd = cooldownLeft(eco.lastWeekly, WEEK);
    if (!cd.ready) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.warnColor)
          .setDescription(`${emojis.hourglass} Already claimed this week. Try again in **${cd.text}**.`)],
      });
    }

    const reward = 1500;
    eco.balance += reward;
    eco.lastWeekly = Date.now();
    eco.weeklyStreak = (eco.weeklyStreak || 0) + 1;
    db.setEconomy(message.guild.id, message.author.id, eco);

    const embed = new EmbedBuilder()
      .setColor(config.successColor)
      .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
      .setTitle(`${emojis.money} Weekly Reward`)
      .setDescription(`You claimed **${fmt(reward)}** ${emojis.coin}!`)
      .addFields(
        { name: `${emojis.fire} Weekly Streak`, value: `**${eco.weeklyStreak}**`, inline: true },
        { name: `${emojis.money} New Balance`, value: `${fmt(eco.balance)} ${emojis.coin}`, inline: true },
      )
      .setFooter({ text: 'Come back in 7 days for your next weekly reward.' })
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
  },
};
