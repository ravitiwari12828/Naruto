const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const { fmt } = require('../../utils/economyCore');

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

module.exports = {
  name: 'roulette',
  description: 'Spin the Roulette wheel! Bet on red, black, green, or numbers 0-36.',
  usage: '.roulette <bet> <red|black|green|0-36>',
  cooldown: 3000,
  async execute(message, args) {
    const bet = parseInt(args[0], 10);
    const space = (args[1] || '').toLowerCase();

    const eco = db.economy(message.guild.id, message.author.id);
    if (!bet || bet <= 0 || !space) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} Usage: \`.roulette <bet> <red|black|green|0-36>\`\nExample: \`.roulette 100 red\``)] });
    }
    if (bet > eco.balance) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} Insufficient wallet balance. Wallet: **${fmt(eco.balance)}** ${emojis.coin}.`)] });
    }

    const landedNumber = Math.floor(Math.random() * 37);
    let landedColor;
    if (landedNumber === 0) landedColor = 'green';
    else if (RED_NUMBERS.includes(landedNumber)) landedColor = 'red';
    else landedColor = 'black';

    let won = false;
    let multiplier = 0;

    if (space === 'red' && landedColor === 'red') { won = true; multiplier = 2; }
    else if (space === 'black' && landedColor === 'black') { won = true; multiplier = 2; }
    else if (space === 'green' && landedColor === 'green') { won = true; multiplier = 14; }
    else if (!isNaN(parseInt(space, 10)) && parseInt(space, 10) === landedNumber) { won = true; multiplier = 36; }

    eco.balance -= bet;
    const payout = won ? Math.floor(bet * multiplier) : 0;
    eco.balance += payout;
    db.setEconomy(message.guild.id, message.author.id, eco);

    const colorEmoji = landedColor === 'red' ? '🔴' : landedColor === 'black' ? '⚫' : '🟢';

    const embed = new EmbedBuilder()
      .setColor(won ? config.successColor : config.errorColor)
      .setTitle(`🎰 Roulette Spin Result`)
      .setDescription(`Wheel landed on: ${colorEmoji} **${landedNumber} (${landedColor.toUpperCase()})**\n\n` +
                      `Your Bet: **${space.toUpperCase()}** (${fmt(bet)} ${emojis.coin})\n` +
                      `${won ? `${emojis.success} **YOU WON!** Payout: **+${fmt(payout)}** ${emojis.coin} (${multiplier}x)` : `${emojis.error} **YOU LOST!** Lost -${fmt(bet)} ${emojis.coin}.`}`)
      .setFooter({ text: `New Wallet Balance: ${fmt(eco.balance)} ${emojis.coin}` })
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  },
};
