const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const { cooldownLeft, fmt } = require('../../utils/economyCore');
const MONTH = 30 * 24 * 60 * 60 * 1000;

module.exports = {
  name: 'monthly',
  description: 'Claim your monthly reward (the biggest recurring payout).',
  usage: '!monthly',
  cooldown: 3000,
  async execute(message) {
    const eco = db.economy(message.guild.id, message.author.id);
    const cd = cooldownLeft(eco.lastMonthly, MONTH);
    if (!cd.ready) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.warnColor)
          .setDescription(`${emojis.hourglass} Already claimed this month. Try again in **${cd.text}**.`)],
      });
    }

    const reward = 6000;
    const gems = 5;
    eco.balance += reward;
    eco.gems = (eco.gems || 0) + gems;
    eco.lastMonthly = Date.now();
    db.setEconomy(message.guild.id, message.author.id, eco);

    const embed = new EmbedBuilder()
      .setColor(config.successColor)
      .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
      .setTitle(`${emojis.gem} Monthly Reward`)
      .setDescription(`You claimed **${fmt(reward)}** ${emojis.coin} and **${gems}** ${emojis.gem} gems!`)
      .addFields(
        { name: `${emojis.money} New Balance`, value: `${fmt(eco.balance)} ${emojis.coin}`, inline: true },
        { name: `${emojis.gem} Total Gems`, value: `${fmt(eco.gems)}`, inline: true },
      )
      .setFooter({ text: 'This is your biggest recurring reward — come back in 30 days.' })
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
  },
};
