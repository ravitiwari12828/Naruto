const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const { cooldownLeft, fmt } = require('../../utils/economyCore');

const COOLDOWN = 24 * 60 * 60 * 1000;
const RATE = 0.03; // 3% daily interest on banked coins

module.exports = {
  name: 'interest',
  description: 'Collect daily interest on the coins sitting in your bank.',
  usage: '!interest',
  cooldown: 3000,
  async execute(message) {
    const eco = db.economy(message.guild.id, message.author.id);
    const cd = cooldownLeft(eco.lastInterest, COOLDOWN);
    if (!cd.ready) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.warnColor).setDescription(`${emojis.hourglass} Already collected. Try again in **${cd.text}**.`)] });
    }
    if (eco.bank <= 0) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} You have nothing banked. Use \`!deposit\` first — interest only applies to banked coins.`)] });
    }

    const earned = Math.max(1, Math.floor(eco.bank * RATE));
    eco.bank += earned;
    eco.lastInterest = Date.now();
    db.setEconomy(message.guild.id, message.author.id, eco);

    await message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor(config.successColor)
        .setTitle(`${emojis.bank} Interest Collected`)
        .setDescription(`Your bank earned **${fmt(earned)}** ${emojis.coin} (${RATE * 100}% of ${fmt(eco.bank - earned)}).`)
        .setFooter({ text: `New bank balance: ${fmt(eco.bank)} coins` })],
    });
  },
};
