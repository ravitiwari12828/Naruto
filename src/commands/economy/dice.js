const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const { fmt } = require('../../utils/economyCore');

const DICE_EMOJIS = { 1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅' };

module.exports = {
  name: 'dice',
  description: 'Roll a pair of dice against the bot to win coins.',
  usage: '.dice <bet>',
  cooldown: 3000,
  async execute(message, args) {
    const bet = parseInt(args[0], 10);
    const eco = db.economy(message.guild.id, message.author.id);

    if (!bet || bet <= 0) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} Provide a valid bet, e.g. \`.dice 100\`.`)] });
    }
    if (bet > eco.balance) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} Insufficient wallet balance. Wallet: **${fmt(eco.balance)}** ${emojis.coin}.`)] });
    }

    const p1 = Math.floor(Math.random() * 6) + 1;
    const p2 = Math.floor(Math.random() * 6) + 1;
    const b1 = Math.floor(Math.random() * 6) + 1;
    const b2 = Math.floor(Math.random() * 6) + 1;

    const playerTotal = p1 + p2;
    const botTotal = b1 + b2;

    let resultText;
    let delta = 0;

    if (playerTotal > botTotal) {
      delta = bet;
      resultText = `${emojis.success} **You Won!** Won **+${fmt(bet)}** ${emojis.coin}!`;
    } else if (playerTotal < botTotal) {
      delta = -bet;
      resultText = `${emojis.error} **Bot Won!** Lost -${fmt(bet)} ${emojis.coin}.`;
    } else {
      delta = 0;
      resultText = `${emojis.info} **Tie!** Bet returned.`;
    }

    eco.balance += delta;
    db.setEconomy(message.guild.id, message.author.id, eco);

    const embed = new EmbedBuilder()
      .setColor(delta > 0 ? config.successColor : delta < 0 ? config.errorColor : config.warnColor)
      .setTitle(`🎲 Dice Duel`)
      .addFields(
        { name: `👤 Your Roll (${playerTotal})`, value: `${DICE_EMOJIS[p1]} + ${DICE_EMOJIS[p2]} = **${playerTotal}**`, inline: true },
        { name: `🤖 Bot's Roll (${botTotal})`, value: `${DICE_EMOJIS[b1]} + ${DICE_EMOJIS[b2]} = **${botTotal}**`, inline: true }
      )
      .setDescription(resultText)
      .setFooter({ text: `New Wallet Balance: ${fmt(eco.balance)} ${emojis.coin}` })
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  },
};
