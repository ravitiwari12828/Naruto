const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const { fmt } = require('../../utils/economyCore');
const { renderHigherLowerCard } = require('../../utils/casinoCard');

const SUITS = ['♠️', '♥️', '♦️', '♣️'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function getRandomCard() {
  const r = RANKS[Math.floor(Math.random() * RANKS.length)];
  const s = SUITS[Math.floor(Math.random() * SUITS.length)];
  return { r, s, val: RANKS.indexOf(r) + 2 };
}

module.exports = {
  name: 'higherlower',
  aliases: ['hl'],
  description: 'Guess if the next drawn card is Higher or Lower!',
  usage: '.higherlower <bet>',
  cooldown: 4000,
  async execute(message, args) {
    const bet = parseInt(args[0], 10);
    const eco = db.economy(message.guild.id, message.author.id);

    if (!bet || bet <= 0) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`<a:wrong_animated:1537179702928875631> Provide a valid bet amount, e.g. \`.hl 100\`.`)] });
    }
    if (bet > eco.balance) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`<a:wrong_animated:1537179702928875631> Insufficient wallet balance. Wallet: **${fmt(eco.balance)}** <a:dollar_animated:1537177379666006016>.`)] });
    }

    eco.balance -= bet;
    db.setEconomy(message.guild.id, message.author.id, eco);

    const baseCard = getRandomCard();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('hl_higher').setLabel('HIGHER ⬆️').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('hl_lower').setLabel('LOWER ⬇️').setStyle(ButtonStyle.Danger),
    );

    const embed = new EmbedBuilder()
      .setColor(0x00F0FF)
      .setTitle(`🃏 Shinobi Higher or Lower`)
      .setDescription(
        `**Base Card:** \`[ ${baseCard.s} ${baseCard.r} ]\`\n\n` +
        `Will the next drawn card be **HIGHER** or **LOWER**? Click below!`
      )
      .setFooter({ text: `Bet: ${fmt(bet)} Ryo • Naruto Shinobi Games` });

    const sent = await message.channel.send({ embeds: [embed], components: [row] });
    const collector = sent.createMessageComponentCollector({ time: 30000 });

    collector.on('collect', async (i) => {
      if (i.user.id !== message.author.id) return i.reply({ content: `<a:wrong_animated:1537179702928875631> Not your game.`, flags: 64 });

      const guess = i.customId === 'hl_higher' ? 'HIGHER' : 'LOWER';
      const nextCard = getRandomCard();

      let isWin = false;
      if (guess === 'HIGHER' && nextCard.val >= baseCard.val) isWin = true;
      if (guess === 'LOWER' && nextCard.val <= baseCard.val) isWin = true;

      const payout = isWin ? bet * 2 : 0;
      if (isWin) {
        eco.balance += payout;
        db.setEconomy(message.guild.id, message.author.id, eco);
      }

      const cardAttachment = await renderHigherLowerCard({
        currentCard: `${baseCard.s} ${baseCard.r}`,
        nextCard: `${nextCard.s} ${nextCard.r}`,
        guess,
        bet,
        payout,
        isWin,
        username: message.author.username
      });

      const resultIcon = isWin ? '<a:accept_animated:1537177319603703969>' : '<a:wrong_animated:1537179702928875631>';

      const resultEmbed = new EmbedBuilder()
        .setColor(isWin ? 0x57F287 : 0xED4245)
        .setTitle(`${resultIcon} Shinobi Higher or Lower Results`)
        .setDescription(
          `**Base Card:** \`[ ${baseCard.s} ${baseCard.r} ]\` | **Drawn Card:** \`[ ${nextCard.s} ${nextCard.r} ]\`\n\n` +
          `${resultIcon} ${isWin ? `**WINNER!** Guessed **${guess}** correctly! Won **+${fmt(payout)}** Ryo!` : `**LOST!** Guessed **${guess}**. Lost -${fmt(bet)} Ryo.`}`
        )
        .setImage('attachment://naruto-higherlower.png')
        .setFooter({ text: `Wallet: ${fmt(eco.balance)} Ryo • Naruto Shinobi Games` })
        .setTimestamp();

      await i.update({ embeds: [resultEmbed], files: [cardAttachment], components: [] }).catch(() => {});
      collector.stop();
    });
  },
};
