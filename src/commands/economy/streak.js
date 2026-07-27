const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');

module.exports = {
  name: 'streak',
  description: 'View your daily/weekly claim streaks.',
  usage: '.streak',
  cooldown: 3000,
  async execute(message) {
    const eco = db.economy(message.guild.id, message.author.id);
    const embed = new EmbedBuilder()
      .setColor(config.embedColor)
      .setTitle(`${emojis.fire} ${message.author.username}'s Streaks`)
      .setThumbnail(message.author.displayAvatarURL())
      .addFields(
        { name: 'Daily Streak', value: `${eco.dailyStreak || 0} days`, inline: true },
        { name: 'Weekly Streak', value: `${eco.weeklyStreak || 0} weeks`, inline: true },
      );
    await message.channel.send({ embeds: [embed] });
  },
};
