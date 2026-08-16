const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const { fmt } = require('../../utils/economyCore');
const { renderRouletteCard } = require('../../utils/casinoCard');

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

module.exports = {
  name: 'roulette',
  description: 'Spin the Konoha Shinobi Roulette wheel!',
  usage: '.roulette <bet> <red|black|green|number>',
  cooldown: 4000,
  async execute(message, args) {
    const bet = parseInt(args[0], 10);
    const choice = (args[1] || '').toUpperCase();
    const eco = db.economy(message.guild.id, message.author.id);

    if (!bet || bet <= 0 || !choice) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`<a:wrong_animated:1537179702928875631> Usage: \`.roulette <bet> <red|black|green|0-36>\`.`)] });
    }
    if (bet > eco.balance) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`<a:wrong_animated:1537179702928875631> Insufficient wallet balance. Wallet: **${fmt(eco.balance)}** <a:dollar_animated:1537177379666006016>.`)] });
    }

    eco.balance -= bet;
    db.setEconomy(message.guild.id, message.author.id, eco);

    const winningNumber = Math.floor(Math.random() * 37);
    let winningColor = winningNumber === 0 ? 'GREEN' : RED_NUMBERS.includes(winningNumber) ? 'RED' : 'BLACK';

    let isWin = false;
    let multiplier = 0;

    if (choice === 'RED' && winningColor === 'RED') { isWin = true; multiplier = 2; }
    else if (choice === 'BLACK' && winningColor === 'BLACK') { isWin = true; multiplier = 2; }
    else if (choice === 'GREEN' && winningColor === 'GREEN') { isWin = true; multiplier = 14; }
    else if (parseInt(choice, 10) === winningNumber) { isWin = true; multiplier = 36; }

    const payout = isWin ? bet * multiplier : 0;
    if (isWin) {
      eco.balance += payout;
      db.setEconomy(message.guild.id, message.author.id, eco);
    }

    const cardAttachment = await renderRouletteCard({
      winningNumber,
      color: winningColor,
      bet,
      payout,
      isWin,
      username: message.author.username
    });

    const resultIcon = isWin ? '<a:accept_animated:1537177319603703969>' : '<a:wrong_animated:1537179702928875631>';

    const embed = new EmbedBuilder()
      .setColor(isWin ? 0x57F287 : 0xED4245)
      .setTitle(`${resultIcon} Konoha Shinobi Roulette Wheel`)
      .setDescription(
        `**Winning Slot:** **${winningNumber} (${winningColor})**\n\n` +
        `${resultIcon} ${isWin ? `**WINNER!** Choice matched! Won **+${fmt(payout)}** Ryo!` : `**LOST!** Roulette landed on ${winningNumber} (${winningColor}). Lost -${fmt(bet)} Ryo.`}`
      )
      .setImage('attachment://naruto-roulette.png')
      .setFooter({ text: `Wallet: ${fmt(eco.balance)} Ryo • Naruto Shinobi Games` })
      .setTimestamp();

    return message.channel.send({ embeds: [embed], files: [cardAttachment] });
  },
};
