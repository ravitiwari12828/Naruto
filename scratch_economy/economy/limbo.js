const { EmbedBuilder } = require('discord.js');
const db = require('../../../database/db');
const config = require('../../../config');
const emojis = require('../../../config/emojis');
const { fmt } = require('../../../utils/economyCore');

module.exports = {
  name: 'limbo',
  description: 'Pick a target multiplier — if the roll beats it, you win big. Higher target = higher risk.',
  usage: '!limbo <bet> <target multiplier e.g. 2.5>',
  cooldown: 3000,
  async execute(message, args) {
    const bet = parseInt(args[0], 10);
    const target = parseFloat(args[1]);
    const eco = db.economy(message.guild.id, message.author.id);
    if (!bet || bet <= 0 || bet > eco.balance) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} Give a valid bet you can afford.`)] });
    }
    if (!target || target < 1.1 || target > 100) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} Pick a target multiplier between 1.1 and 100, e.g. \`!limbo 100 2.5\`.`)] });
    }

    // House-edge-adjusted roll: win chance is roughly 1/target (minus a small edge).
    const winChance = (1 / target) * 0.97;
    const won = Math.random() < winChance;

    eco.balance -= bet;
    let payout = 0;
    if (won) { payout = Math.floor(bet * target); eco.balance += payout; }
    db.setEconomy(message.guild.id, message.author.id, eco);

    await message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor(won ? config.successColor : config.errorColor)
        .setTitle('📉 Limbo')
        .setDescription(`Target: **${target}x** (win chance ~${(winChance * 100).toFixed(1)}%)\n\n${won ? `${emojis.success} You hit it! Won **${fmt(payout)}** coins!` : `${emojis.error} Missed. Lost **${fmt(bet)}** coins.`}`)
        .setFooter({ text: `New balance: ${fmt(eco.balance)} coins` })],
    });
  },
};
