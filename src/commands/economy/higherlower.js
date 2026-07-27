const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const { fmt } = require('../../utils/economyCore');

const SUITS = ['♠️', '♥️', '♦️', '♣️'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function drawCard() {
  return { rank: RANKS[Math.floor(Math.random() * RANKS.length)], suit: SUITS[Math.floor(Math.random() * SUITS.length)] };
}
function rankValue(card) { return RANKS.indexOf(card.rank); }

module.exports = {
  name: 'higherlower',
  description: 'Guess if the next card is higher or lower — cash out anytime before you lose it all.',
  usage: '.higherlower <bet>',
  cooldown: 5000,
  async execute(message, args) {
    const bet = parseInt(args[0], 10);
    const eco = db.economy(message.guild.id, message.author.id);
    if (!bet || bet <= 0 || bet > eco.balance) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} Give a valid bet you can afford.`)] });
    }
    eco.balance -= bet;
    db.setEconomy(message.guild.id, message.author.id, eco);

    let current = drawCard();
    let multiplier = 1;

    const buildRow = () => new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('hl_higher').setLabel('Higher').setEmoji('⬆️').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('hl_lower').setLabel('Lower').setEmoji('⬇️').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('hl_cashout').setLabel(`Cash Out (${Math.floor(bet * multiplier)})`).setEmoji(emojis.coin).setStyle(ButtonStyle.Primary),
    );
    const buildEmbed = () => new EmbedBuilder()
      .setColor(config.embedColor)
      .setTitle('🃏 Higher or Lower')
      .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
      .setDescription(`Current card: **${current.rank}${current.suit}**\n\nMultiplier: **x${multiplier.toFixed(2)}**\nPotential payout: **${fmt(Math.floor(bet * multiplier))}** ${emojis.coin}`)
      .setFooter({ text: `Bet: ${fmt(bet)} coins` });

    const sent = await message.channel.send({ embeds: [buildEmbed()], components: [buildRow()] });
    const collector = sent.createMessageComponentCollector({ time: 30000, filter: (i) => i.user.id === message.author.id });

    collector.on('collect', async (i) => {
      if (i.customId === 'hl_cashout') {
        const fresh = db.economy(message.guild.id, message.author.id);
        const payout = Math.floor(bet * multiplier);
        fresh.balance += payout;
        db.setEconomy(message.guild.id, message.author.id, fresh);
        collector.stop();
        return i.update({ embeds: [buildEmbed().setColor(config.successColor).setDescription(`${emojis.success} Cashed out for **${fmt(payout)}** coins!`)], components: [] });
      }

      const next = drawCard();
      const guess = i.customId === 'hl_higher' ? 'higher' : 'lower';
      const actual = rankValue(next) === rankValue(current) ? 'tie' : rankValue(next) > rankValue(current) ? 'higher' : 'lower';
      current = next;

      if (actual === 'tie' || actual === guess) {
        multiplier += 0.5;
        await i.update({ embeds: [buildEmbed()], components: [buildRow()] });
      } else {
        collector.stop();
        await i.update({ embeds: [buildEmbed().setColor(config.errorColor).setDescription(`${emojis.error} Wrong! The card was **${current.rank}${current.suit}**. You lost your **${fmt(bet)}** coin bet.`)], components: [] });
      }
    });
    collector.on('end', (collected, reason) => { if (reason === 'time') sent.edit({ components: [] }).catch(() => {}); });
  },
};
