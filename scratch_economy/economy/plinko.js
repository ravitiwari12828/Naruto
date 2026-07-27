const { EmbedBuilder } = require('discord.js');
const db = require('../../../database/db');
const config = require('../../../config');
const emojis = require('../../../config/emojis');
const { animate } = require('../../../utils/funCore');
const { fmt } = require('../../../utils/economyCore');

const ROWS = 8;
const MULTIPLIERS = [5, 2, 1, 0.5, 0.2, 0.5, 1, 2, 5];

module.exports = {
  name: 'plinko',
  description: 'Drop a ball down the Plinko board and win based on where it lands.',
  usage: '!plinko <bet>',
  cooldown: 5000,
  async execute(message, args) {
    const bet = parseInt(args[0], 10);
    const eco = db.economy(message.guild.id, message.author.id);
    if (!bet || bet <= 0 || bet > eco.balance) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} Give a valid bet you can afford.`)] });
    }

    let position = 0;
    const path = [];
    for (let i = 0; i < ROWS; i++) {
      const goRight = Math.random() < 0.5;
      if (goRight) position++;
      path.push(goRight ? '↘️' : '↙️');
    }
    const slot = Math.min(MULTIPLIERS.length - 1, Math.max(0, position));
    const multiplier = MULTIPLIERS[slot];

    const sent = await message.channel.send({ embeds: [new EmbedBuilder().setColor(config.embedColor).setTitle('🔴 Dropping ball...').setDescription('⚪')] });
    await animate(sent, [
      { embeds: [new EmbedBuilder().setColor(config.embedColor).setTitle('🔴 Dropping...').setDescription(path.slice(0, 3).join(' '))] },
      { embeds: [new EmbedBuilder().setColor(config.embedColor).setTitle('🔴 Dropping...').setDescription(path.slice(0, 6).join(' '))] },
      { embeds: [new EmbedBuilder().setColor(config.embedColor).setTitle('🔴 Dropping...').setDescription(path.join(' '))] },
    ], 500);

    eco.balance -= bet;
    const payout = Math.floor(bet * multiplier);
    eco.balance += payout;
    db.setEconomy(message.guild.id, message.author.id, eco);

    const slots = MULTIPLIERS.map((m, i) => (i === slot ? `[${m}x]` : `${m}x`)).join(' ');
    await sent.edit({
      embeds: [new EmbedBuilder()
        .setColor(payout >= bet ? config.successColor : config.errorColor)
        .setTitle('🔴 Plinko Result')
        .setDescription(`${slots}\n\nLanded on **${multiplier}x** — ${payout >= bet ? 'won' : 'received'} **${fmt(payout)}** ${emojis.coin} (bet: ${fmt(bet)})`)
        .setFooter({ text: `New balance: ${fmt(eco.balance)} coins` })],
    });
  },
};
