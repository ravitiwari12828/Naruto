const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const { fmt } = require('../../utils/economyCore');
const { renderPlinkoCard } = require('../../utils/casinoCard');

const ROWS = 6;
const MULTIPLIERS = [10.0, 3.0, 1.5, 0.5, 1.5, 3.0, 10.0];

module.exports = {
  name: 'plinko',
  description: 'Naruto Plinko Plunge — Visual canvas pinball drop!',
  usage: '.plinko <bet>',
  cooldown: 3000,
  async execute(message, args) {
    const bet = parseInt(args[0], 10);
    const eco = db.economy(message.guild.id, message.author.id);
    if (!bet || bet <= 0) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`<a:wrong_animated:1537179702928875631> Provide a valid bet amount, e.g. \`.plinko 100\`.`)] });
    }
    if (bet > eco.balance) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`<a:wrong_animated:1537179702928875631> Insufficient wallet balance. Wallet: **${fmt(eco.balance)}** <a:dollar_animated:1537177379666006016>.`)] });
    }

    eco.balance -= bet;
    db.setEconomy(message.guild.id, message.author.id, eco);

    let position = 3;
    const path = [];
    for (let i = 0; i < ROWS; i++) {
      const goRight = Math.random() < 0.5;
      position += goRight ? 1 : -1;
      path.push(goRight ? '↘️' : '↙️');
    }
    const slotIndex = Math.min(MULTIPLIERS.length - 1, Math.max(0, position));
    const multiplier = MULTIPLIERS[slotIndex];
    const payout = Math.floor(bet * multiplier);
    const isWin = payout >= bet;

    eco.balance += payout;
    db.setEconomy(message.guild.id, message.author.id, eco);

    const cardAttachment = await renderPlinkoCard({
      path,
      slotIndex,
      multiplier,
      bet,
      payout,
      isWin,
      username: message.author.username
    });

    const resultIcon = isWin ? '<a:accept_animated:1537177319603703969>' : '<a:wrong_animated:1537179702928875631>';

    const resultEmbed = new EmbedBuilder()
      .setColor(isWin ? 0x57F287 : 0xED4245)
      .setTitle(`${resultIcon} Naruto Konoha Chakra Plinko Plunge`)
      .setDescription(
        `**Trajectory:** ${path.join(' ')}\n\n` +
        `${resultIcon} Ball landed on **${multiplier}x**!\n` +
        `• **Payout Won:** **${fmt(payout)}** <a:dollar_animated:1537177379666006016> (Net: **${isWin ? '+' : ''}${fmt(payout - bet)}**)`
      )
      .setImage('attachment://naruto-plinko.png')
      .setFooter({ text: `Wallet: ${fmt(eco.balance)} Ryo • Naruto Shinobi Visuals` })
      .setTimestamp();

    return message.channel.send({ embeds: [resultEmbed], files: [cardAttachment] });
  },
};
