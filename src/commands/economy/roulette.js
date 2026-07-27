const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const { fmt } = require('../../utils/economyCore');

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

function colorOf(n) {
  if (n === 0) return 'green';
  return RED_NUMBERS.has(n) ? 'red' : 'black';
}

module.exports = {
  name: 'roulette',
  description: 'Bet on red, black, green, or an exact number (0-36).',
  usage: '!roulette <bet> <red|black|green|0-36>',
  cooldown: 3000,
  async execute(message, args) {
    const bet = parseInt(args[0], 10);
    const choice = args[1]?.toLowerCase();
    const eco = db.economy(message.guild.id, message.author.id);

    if (!bet || bet <= 0) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} Usage: \`!roulette <bet> <red|black|green|0-36>\``)] });
    }
    if (bet > eco.balance) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} You don't have that many coins.`)] });
    }
    const isNumberBet = /^\d+$/.test(choice) && Number(choice) >= 0 && Number(choice) <= 36;
    if (!['red', 'black', 'green'].includes(choice) && !isNumberBet) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} Bet on \`red\`, \`black\`, \`green\`, or an exact number 0-36.`)] });
    }

    const result = Math.floor(Math.random() * 37);
    const resultColor = colorOf(result);
    const colorEmoji = { red: '🔴', black: '⚫', green: '🟢' };

    let winnings = 0;
    if (isNumberBet && Number(choice) === result) winnings = bet * 35;
    else if (!isNumberBet && choice === resultColor) winnings = bet * (resultColor === 'green' ? 14 : 2);

    const delta = winnings > 0 ? winnings - bet : -bet;
    eco.balance += delta;
    db.setEconomy(message.guild.id, message.author.id, eco);

    const embed = new EmbedBuilder()
      .setColor(winnings > 0 ? config.successColor : config.errorColor)
      .setTitle(`${emojis.wheel} Roulette`)
      .setDescription(`The ball landed on **${result}** ${colorEmoji[resultColor]}\n\nYou bet **${fmt(bet)}** coins on **${choice}**.`)
      .addFields({ name: winnings > 0 ? `${emojis.success} You won` : `${emojis.error} You lost`, value: `${fmt(Math.abs(delta))} coins` })
      .setFooter({ text: `New balance: ${fmt(eco.balance)} coins` })
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  },
};
