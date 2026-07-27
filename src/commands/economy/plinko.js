const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const { fmt } = require('../../utils/economyCore');

const ROWS = 6;
const MULTIPLIERS = [10.0, 3.0, 1.5, 0.5, 1.5, 3.0, 10.0];

module.exports = {
  name: 'plinko',
  description: 'Drop a glowing pinball down the Plinko board to multiply your coins.',
  usage: '.plinko <bet>',
  cooldown: 3000,
  async execute(message, args) {
    const bet = parseInt(args[0], 10);
    const eco = db.economy(message.guild.id, message.author.id);
    if (!bet || bet <= 0) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} Provide a valid bet, e.g. \`.plinko 100\`.`)] });
    }
    if (bet > eco.balance) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} Insufficient wallet balance. Wallet: **${fmt(eco.balance)}** ${emojis.coin}.`)] });
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

    const initialEmbed = new EmbedBuilder()
      .setColor(config.embedColor)
      .setTitle(`🔴 Plinko Pinball Drop`)
      .setDescription(`\`\`\`\n  🔴 Plinko Ball Released...\n  ${path.join(' ')}\n\`\`\``)
      .setFooter({ text: `Bet: ${fmt(bet)} coins` });

    const sent = await message.channel.send({ embeds: [initialEmbed] });

    await new Promise(r => setTimeout(r, 1200));

    eco.balance += payout;
    db.setEconomy(message.guild.id, message.author.id, eco);

    const slotsFormatted = MULTIPLIERS.map((m, idx) => (idx === slotIndex ? `[🎯 ${m}x]` : `${m}x`)).join(' | ');
    const isWin = payout >= bet;

    const resultEmbed = new EmbedBuilder()
      .setColor(isWin ? config.successColor : config.errorColor)
      .setTitle(`🎰 Plinko Pinball Drop`)
      .setDescription(`\`\`\`\n${path.join(' ')}\n\`\`\`\n` +
                      `**Multiplier Slots:**\n\`${slotsFormatted}\`\n\n` +
                      `${isWin ? emojis.success : emojis.error} Ball landed on **${multiplier}x**!\n` +
                      `Payout: **${fmt(payout)}** ${emojis.coin} (Net: ${isWin ? '+' : ''}${fmt(payout - bet)})`)
      .setFooter({ text: `New Wallet Balance: ${fmt(eco.balance)} ${emojis.coin}` })
      .setTimestamp();

    return sent.edit({ embeds: [resultEmbed] });
  },
};
