const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const { fmt } = require('../../utils/economyCore');
const { renderBlackjackCard } = require('../../utils/casinoCard');

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
  if (!card) return 0;
  if (card.r === 'A') return 11;
  if (['J', 'Q', 'K'].includes(card.r)) return 10;
  return parseInt(card.r, 10) || 0;
}

function handValue(hand) {
  if (!Array.isArray(hand)) return 0;
  let value = hand.reduce((sum, c) => sum + cardValue(c), 0);
  let aces = hand.filter(c => c && c.r === 'A').length;
  while (value > 21 && aces > 0) { value -= 10; aces--; }
  return value;
}

function fmtHandStr(hand, hideSecond = false) {
  if (!Array.isArray(hand) || hand.length === 0) return '[]';
  if (hideSecond) return `[ ${hand[0].s} ${hand[0].r} ] [ 🎴 ? ]`;
  return hand.map(c => `[ ${c.s} ${c.r} ]`).join(' ');
}

function fmtHandArray(hand, hideSecond = false) {
  if (!Array.isArray(hand) || hand.length === 0) return ['🎴 ?'];
  if (hideSecond) return [`${hand[0].s} ${hand[0].r}`, '🎴 ?'];
  return hand.map(c => `${c.s} ${c.r}`);
}

module.exports = {
  name: 'blackjack',
  aliases: ['bj'],
  description: 'Stake.cc Ninja Blackjack 21 vs Konoha Dealer',
  usage: '.blackjack <bet>',
  cooldown: 3000,
  async execute(message, args) {
    let bet = parseInt(args[0], 10);
    const eco = db.economy(message.guild.id, message.author.id);
    if (!bet || bet <= 0) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`<a:wrong_animated:1537179702928875631> Provide a valid bet amount, e.g. \`.bj 100\`.`)],
      });
    }
    if (bet > eco.balance) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`<a:wrong_animated:1537179702928875631> Insufficient wallet balance. Wallet: **${fmt(eco.balance)}** <a:dollar_animated:1537177379666006016>.`)],
      });
    }

    const deck = freshDeck();
    const player = [deck.pop(), deck.pop()];
    const dealer = [deck.pop(), deck.pop()];

    const renderPayload = async (finished, resultText = null, statusStr = 'IN GAME') => {
      const pVal = handValue(player);
      const dVal = finished ? handValue(dealer) : '?';
      const isWin = resultText ? (resultText.includes('Won') || resultText.includes('BLACKJACK') || resultText.includes('Bust')) && !resultText.includes('Dealer Won') && !resultText.includes('Bust (') : false;
      const isLoss = resultText ? resultText.includes('lose') || resultText.includes('Dealer Won') || resultText.includes('Bust (') : false;
      const color = isWin ? 0x57F287 : isLoss ? 0xED4245 : 0x00F0FF;

      const cardAttachment = await renderBlackjackCard({
        dealerCards: fmtHandArray(dealer, !finished),
        playerCards: fmtHandArray(player, false),
        dealerScore: String(dVal),
        playerScore: String(pVal),
        bet,
        payout: isWin ? Math.floor(bet * 2) : 0,
        status: statusStr,
        username: message.author.username
      });

      const embed = new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: `${message.author.username}'s Blackjack 21`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTitle(`🃏 Naruto Stake.cc Blackjack 21 Table`)
        .addFields(
          { name: `Dealer (${String(dVal)})`, value: String(fmtHandStr(dealer, !finished)), inline: true },
          { name: `You (${String(pVal)})`, value: String(fmtHandStr(player)), inline: true }
        )
        .setDescription(String(resultText || 'Hit to draw a card, Stand to stay, or Double your bet!'))
        .setImage('attachment://stake-blackjack.png')
        .setFooter({ text: `Bet: ${fmt(bet)} Ryo • Wallet: ${fmt(eco.balance)} Ryo` })
        .setTimestamp();

      return { embeds: [embed], files: [cardAttachment] };
    };

    const getRow = (canDouble) => {
      const r = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('bj_hit').setLabel('HIT').setEmoji('🃏').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('bj_stand').setLabel('STAND').setEmoji('🛑').setStyle(ButtonStyle.Success),
      );
      if (canDouble && eco.balance >= bet * 2) {
        r.addComponents(new ButtonBuilder().setCustomId('bj_double').setLabel('DOUBLE').setEmoji('<a:dollar_animated:1537177379666006016>').setStyle(ButtonStyle.Warning));
      }
      return r;
    };

    if (handValue(player) === 21) {
      const winAmount = Math.floor(bet * 1.5);
      eco.balance += winAmount;
      db.setEconomy(message.guild.id, message.author.id, eco);
      const initPayload = await renderPayload(true, `<a:accept_animated:1537177319603703969> **BLACKJACK!** You won **+${fmt(winAmount)}** Ryo!`, 'BLACKJACK!');
      return message.channel.send(initPayload);
    }

    const initPayload = await renderPayload(false);
    const sent = await message.channel.send({ ...initPayload, components: [getRow(true)] });
    const collector = sent.createMessageComponentCollector({ time: 45000 });

    const finish = async (i, finalBet = bet) => {
      let dealerValue = handValue(dealer);
      while (dealerValue < 17) { dealer.push(deck.pop()); dealerValue = handValue(dealer); }
      const playerValue = handValue(player);

      let delta;
      let resultText;
      let statusStr = 'END GAME';
      if (playerValue > 21) {
        delta = -finalBet;
        resultText = `<a:wrong_animated:1537179702928875631> **Bust (${playerValue})!** You lost **-${fmt(finalBet)}** Ryo.`;
        statusStr = 'PLAYER BUST';
      } else if (dealerValue > 21) {
        delta = finalBet;
        resultText = `<a:accept_animated:1537177319603703969> **Dealer Bust (${dealerValue})!** You won **+${fmt(finalBet)}** Ryo!`;
        statusStr = 'DEALER BUST';
      } else if (playerValue > dealerValue) {
        delta = finalBet;
        resultText = `<a:accept_animated:1537177319603703969> **You Won!** (${playerValue} vs ${dealerValue}) You won **+${fmt(finalBet)}** Ryo!`;
        statusStr = 'YOU WON!';
      } else if (playerValue < dealerValue) {
        delta = -finalBet;
        resultText = `<a:wrong_animated:1537179702928875631> **Dealer Won!** (${dealerValue} vs ${playerValue}) You lost **-${fmt(finalBet)}** Ryo.`;
        statusStr = 'DEALER WON';
      } else {
        delta = 0;
        resultText = `<a:infox_animated:1537177409428787251> **Push!** Both scored ${playerValue}. Bet returned.`;
        statusStr = 'PUSH (TIE)';
      }

      eco.balance += delta;
      db.setEconomy(message.guild.id, message.author.id, eco);

      const endPayload = await renderPayload(true, resultText, statusStr);

      await i.update({
        ...endPayload,
        components: []
      }).catch(() => {});
      collector.stop();
    };

    collector.on('collect', async (i) => {
      if (i.user.id !== message.author.id) return i.reply({ content: `<a:wrong_animated:1537179702928875631> Not your game.`, flags: 64 });

      if (i.customId === 'bj_hit') {
        player.push(deck.pop());
        if (handValue(player) > 21) {
          await finish(i);
        } else {
          const updatePayload = await renderPayload(false);
          await i.update({ ...updatePayload, components: [getRow(false)] }).catch(() => {});
        }
      } else if (i.customId === 'bj_stand') {
        await finish(i);
      } else if (i.customId === 'bj_double') {
        player.push(deck.pop());
        await finish(i, bet * 2);
      }
    });
  },
};
