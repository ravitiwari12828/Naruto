const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const { fmt } = require('../../utils/economyCore');

const SUITS = ['♠️', '♥️', '♦️', '♣️'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function freshDeck() {
  const deck = [];
  for (const s of SUITS) for (const r of RANKS) deck.push({ r, s });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function cardValue(card) {
  if (card.r === 'A') return 11;
  if (['J', 'Q', 'K'].includes(card.r)) return 10;
  return parseInt(card.r, 10);
}

function handValue(hand) {
  let value = hand.reduce((sum, c) => sum + cardValue(c), 0);
  let aces = hand.filter(c => c.r === 'A').length;
  while (value > 21 && aces > 0) { value -= 10; aces--; }
  return value;
}

function fmtHand(hand, hideSecond = false) {
  if (hideSecond) return `${hand[0].r}${hand[0].s} 🂠`;
  return hand.map(c => `${c.r}${c.s}`).join(' ');
}

module.exports = {
  name: 'blackjack',
  description: 'Play a hand of Blackjack against the dealer for coins.',
  usage: '!blackjack <bet>',
  cooldown: 3000,
  async execute(message, args) {
    const bet = parseInt(args[0], 10);
    const eco = db.economy(message.guild.id, message.author.id);
    if (!bet || bet <= 0) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} Give me a valid bet, e.g. \`!blackjack 100\`.`)],
      });
    }
    if (bet > eco.balance) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} You don't have that many coins in your wallet. Wallet: **${fmt(eco.balance)}** ${emojis.coin}.`)],
      });
    }

    const deck = freshDeck();
    const player = [deck.pop(), deck.pop()];
    const dealer = [deck.pop(), deck.pop()];

    const render = (finished, resultText = null) => new EmbedBuilder()
      .setColor(resultText ? (resultText.includes(emojis.success) ? config.successColor : resultText.includes(emojis.error) ? config.errorColor : config.warnColor) : config.embedColor)
      .setTitle(`${emojis.cards} Blackjack`)
      .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
      .addFields(
        { name: `Dealer's Hand${finished ? ` (${handValue(dealer)})` : ''}`, value: fmtHand(dealer, !finished) },
        { name: `Your Hand (${handValue(player)})`, value: fmtHand(player) },
      )
      .setDescription(resultText || 'Hit to draw another card, or Stand to let the dealer play.')
      .setFooter({ text: `Bet: ${fmt(bet)} ${emojis.coin} • Wallet: ${fmt(eco.balance)} coins` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('bj_hit').setLabel('Hit').setEmoji('🃏').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('bj_stand').setLabel('Stand').setEmoji('✋').setStyle(ButtonStyle.Secondary),
    );

    if (handValue(player) === 21) {
      eco.balance += Math.floor(bet * 1.5);
      db.setEconomy(message.guild.id, message.author.id, eco);
      return message.channel.send({ embeds: [render(true, `${emojis.success} **Blackjack!** You win **${fmt(Math.floor(bet * 1.5))}** coins!`)] });
    }

    const sent = await message.channel.send({ embeds: [render(false)], components: [row] });
    const collector = sent.createMessageComponentCollector({ time: 30000 });

    const finish = async (i) => {
      let resultText;
      let dealerValue = handValue(dealer);
      while (dealerValue < 17) { dealer.push(deck.pop()); dealerValue = handValue(dealer); }
      const playerValue = handValue(player);

      let delta;
      if (playerValue > 21) { delta = -bet; resultText = `${emojis.error} Bust! You lose **${fmt(bet)}** coins.`; }
      else if (dealerValue > 21) { delta = bet; resultText = `${emojis.success} Dealer busts! You win **${fmt(bet)}** coins!`; }
      else if (playerValue > dealerValue) { delta = bet; resultText = `${emojis.success} You win **${fmt(bet)}** coins!`; }
      else if (playerValue < dealerValue) { delta = -bet; resultText = `${emojis.error} Dealer wins. You lose **${fmt(bet)}** coins.`; }
      else { delta = 0; resultText = `${emojis.info} Push — bet returned.`; }

      eco.balance += delta;
      db.setEconomy(message.guild.id, message.author.id, eco);
      const disabledRow = new ActionRowBuilder().addComponents(
        ButtonBuilder.from(row.components[0]).setDisabled(true),
        ButtonBuilder.from(row.components[1]).setDisabled(true),
      );
      await i.update({ embeds: [render(true, resultText)], components: [disabledRow] });
      collector.stop();
    };

    collector.on('collect', async (i) => {
      if (i.user.id !== message.author.id) return i.reply({ content: `${emojis.error} This isn't your game.`, ephemeral: true });
      if (i.customId === 'bj_hit') {
        player.push(deck.pop());
        if (handValue(player) >= 21) return finish(i);
        return i.update({ embeds: [render(false)], components: [row] });
      }
      return finish(i);
    });

    collector.on('end', (collected) => {
      if (!collected.size) sent.edit({ components: [] }).catch(() => {});
    });
  },
};
