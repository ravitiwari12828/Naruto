const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const { fmt } = require('../../utils/economyCore');
const { renderDiceCard } = require('../../utils/casinoCard');

module.exports = {
  name: 'dice',
  description: 'Roll 3D dice against the Konoha Dealer!',
  usage: '.dice <bet>',
  cooldown: 3000,
  async execute(message, args) {
    const bet = parseInt(args[0], 10);
    const eco = db.economy(message.guild.id, message.author.id);

    if (!bet || bet <= 0) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`<a:wrong_animated:1537179702928875631> Provide a valid bet amount, e.g. \`.dice 100\`.`)] });
    }
    if (bet > eco.balance) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`<a:wrong_animated:1537179702928875631> Insufficient wallet balance. Wallet: **${fmt(eco.balance)}** <a:dollar_animated:1537177379666006016>.`)] });
    }

    eco.balance -= bet;
    db.setEconomy(message.guild.id, message.author.id, eco);

    const userRoll = Math.floor(Math.random() * 6) + 1;
    const dealerRoll = Math.floor(Math.random() * 6) + 1;
    const isWin = userRoll > dealerRoll;
    const isTie = userRoll === dealerRoll;

    let payout = 0;
    if (isWin) payout = bet * 2;
    else if (isTie) payout = bet;

    eco.balance += payout;
    db.setEconomy(message.guild.id, message.author.id, eco);

    const cardAttachment = await renderDiceCard({
      userRoll,
      dealerRoll,
      target: dealerRoll,
      bet,
      payout,
      isWin,
      username: message.author.username
    });

    const resultIcon = isWin ? '<a:accept_animated:1537177319603703969>' : isTie ? '<a:infox_animated:1537177409428787251>' : '<a:wrong_animated:1537179702928875631>';

    const embed = new EmbedBuilder()
      .setColor(isWin ? 0x57F287 : isTie ? 0xF59E0B : 0xED4245)
      .setTitle(`${resultIcon} Naruto Stake.cc 3D Dice Roller`)
      .setDescription(
        `**Your Roll:** 🎲 **${userRoll}** | **Dealer Roll:** 🎲 **${dealerRoll}**\n\n` +
        `${resultIcon} ${isWin ? `**WINNER!** You beat the dealer! Won **+${fmt(payout)}** Ryo!` : isTie ? `**PUSH!** Tie game! Bet returned.` : `**LOST!** Dealer won. Lost -${fmt(bet)} Ryo.`}`
      )
      .setImage('attachment://stake-dice.png')
      .setFooter({ text: `Wallet: ${fmt(eco.balance)} Ryo • Stake Casino Visuals` })
      .setTimestamp();

    return message.channel.send({ embeds: [embed], files: [cardAttachment] });
  },
};
