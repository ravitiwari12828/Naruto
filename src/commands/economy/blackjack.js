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
  if (hideSecond) return `\`[ ${hand[0].s} ${hand[0].r} ]\` \`[ <a:membercard_animated:1537177436146638993> ? ]\``;
  return hand.map(c => `\`[ ${c.s} ${c.r} ]\``).join(' ');
}

module.exports = {
  name: 'blackjack',
  aliases: ['bj'],
  description: 'Play an interactive hand of Blackjack against the dealer for coins.',
  usage: '.blackjack <bet>',
  cooldown: 3000,
  async execute(message, args) {
    let bet = parseInt(args[0], 10);
    const eco = db.economy(message.guild.id, message.author.id);
    if (!bet || bet <= 0) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} Specify a valid bet, e.g. \`.blackjack 100\`.`)],
      });
    }
    if (bet > eco.balance) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} You don't have enough coins in your wallet. Wallet: **${fmt(eco.balance)}** ${emojis.coin}.`)],
      });
    }

    const deck = freshDeck();
    const player = [deck.pop(), deck.pop()];
    const dealer = [deck.pop(), deck.pop()];

    const render = (finished, resultText = null) => new EmbedBuilder()
      .setColor(resultText ? (resultText.includes('win') || resultText.includes('Blackjack') ? config.successColor : resultText.includes('lose') || resultText.includes('Bust') ? config.errorColor : config.warnColor) : config.embedColor)
      .setAuthor({ name: `${message.author.username}'s Blackjack Game`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
      .setTitle(`🃏 OwO Blackjack Table`)
      .addFields(
        { name: `<a:robot_animated:1537177494183088199> Dealer (${finished ? handValue(dealer) : '?'})`, value: fmtHand(dealer, !finished), inline: false },
        { name: `<a:membercard_animated:1537177436146638993> You (${handValue(player)})`, value: fmtHand(player), inline: false },
      )
      .setDescription(resultText || 'Hit to draw a card, Stand to stay, or Double your bet!')
      .setFooter({ text: `Current Bet: ${fmt(bet)} ${emojis.coin} • Wallet: ${fmt(eco.balance)} coins` })
      .setTimestamp();

    const getRow = (canDouble) => {
      const r = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('bj_hit').setLabel('Hit').setEmoji('🃏').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('bj_stand').setLabel('Stand').setEmoji('🛑').setStyle(ButtonStyle.Success),
      );
      if (canDouble && eco.balance >= bet * 2) {
        r.addComponents(new ButtonBuilder().setCustomId('bj_double').setLabel('Double').setEmoji('🪙').setStyle(ButtonStyle.Warning));
      }
      return r;
    };

    if (handValue(player) === 21) {
      const winAmount = Math.floor(bet * 1.5);
      eco.balance += winAmount;
      db.setEconomy(message.guild.id, message.author.id, eco);
      return message.channel.send({ embeds: [render(true, `${emojis.success} **BLACKJACK!** You won **+${fmt(winAmount)}** ${emojis.coin}!`)] });
    }

    const sent = await message.channel.send({ embeds: [render(false)], components: [getRow(true)] });
    const collector = sent.createMessageComponentCollector({ time: 45000 });

    const finish = async (i, finalBet = bet) => {
      let dealerValue = handValue(dealer);
      while (dealerValue < 17) { dealer.push(deck.pop()); dealerValue = handValue(dealer); }
      const playerValue = handValue(player);

      let delta;
      let resultText;
      if (playerValue > 21) {
        delta = -finalBet;
        resultText = `${emojis.error} **Bust (${playerValue})!** You lost **-${fmt(finalBet)}** ${emojis.coin}.`;
      } else if (dealerValue > 21) {
        delta = finalBet;
        resultText = `${emojis.success} **Dealer Bust (${dealerValue})!** You won **+${fmt(finalBet)}** ${emojis.coin}!`;
      } else if (playerValue > dealerValue) {
        delta = finalBet;
        resultText = `${emojis.success} **You Won!** (${playerValue} vs ${dealerValue}) You won **+${fmt(finalBet)}** ${emojis.coin}!`;
      } else if (playerValue < dealerValue) {
        delta = -finalBet;
        resultText = `${emojis.error} **Dealer Won!** (${dealerValue} vs ${playerValue}) You lost **-${fmt(finalBet)}** ${emojis.coin}.`;
      } else {
        delta = 0;
        resultText = `${emojis.info} **Push!** Both scored ${playerValue}. Bet returned.`;
      }

      eco.balance += delta;
      db.setEconomy(message.guild.id, message.author.id, eco);

      await i.update({ embeds: [render(true, resultText)], components: [] });
      collector.stop();
    };

    collector.on('collect', async (i) => {
      if (i.user.id !== message.author.id) return i.reply({ content: `${emojis.error} This is not your game.`, ephemeral: true });

      if (i.customId === 'bj_hit') {
        player.push(deck.pop());
        if (handValue(player) >= 21) return finish(i);
        return i.update({ embeds: [render(false)], components: [getRow(false)] });
      }

      if (i.customId === 'bj_double') {
        bet *= 2;
        player.push(deck.pop());
        return finish(i, bet);
      }

      return finish(i);
    });

    collector.on('end', (collected) => {
      if (!collected.size) sent.edit({ components: [] }).catch(() => {});
    });
  },
};
