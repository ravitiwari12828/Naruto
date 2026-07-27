const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../../database/db');
const config = require('../../../config');
const emojis = require('../../../config/emojis');
const { fmt } = require('../../../utils/economyCore');

module.exports = {
  name: 'crash',
  description: 'Watch the multiplier climb and cash out before it crashes!',
  usage: '!crash <bet>',
  cooldown: 5000,
  async execute(message, args) {
    const bet = parseInt(args[0], 10);
    const eco = db.economy(message.guild.id, message.author.id);
    if (!bet || bet <= 0 || bet > eco.balance) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} Give a valid bet you can afford.`)],
      });
    }
    eco.balance -= bet;
    db.setEconomy(message.guild.id, message.author.id, eco);

    // Crash point drawn from an exponential-ish distribution so low multipliers are common.
    const crashPoint = Math.max(1.01, 1 / (1 - Math.random() * 0.97));
    let multiplier = 1.0;
    let cashedOut = false;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('crash_cashout').setLabel('Cash Out').setEmoji(emojis.coin).setStyle(ButtonStyle.Success),
    );
    const buildEmbed = (status) => new EmbedBuilder()
      .setColor(config.embedColor)
      .setTitle('🚀 Crash')
      .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
      .setDescription(`Multiplier: **${multiplier.toFixed(2)}x**\nPotential payout: **${fmt(Math.floor(bet * multiplier))}** ${emojis.coin}\n\n${status || 'Cash out before it crashes!'}`)
      .setFooter({ text: `Bet: ${fmt(bet)} coins` });

    const sent = await message.channel.send({ embeds: [buildEmbed()], components: [row] });
    const collector = sent.createMessageComponentCollector({ time: 15000, filter: (i) => i.user.id === message.author.id });

    collector.on('collect', async (i) => {
      if (cashedOut) return;
      cashedOut = true;
      const payout = Math.floor(bet * multiplier);
      const fresh = db.economy(message.guild.id, message.author.id);
      fresh.balance += payout;
      db.setEconomy(message.guild.id, message.author.id, fresh);
      collector.stop('cashed');
      await i.update({ embeds: [buildEmbed(`${emojis.success} Cashed out at **${multiplier.toFixed(2)}x** for **${fmt(payout)}** coins!`).setColor(config.successColor)], components: [] });
    });

    const interval = setInterval(async () => {
      if (cashedOut) return clearInterval(interval);
      multiplier += 0.15 + Math.random() * 0.2;
      if (multiplier >= crashPoint) {
        clearInterval(interval);
        cashedOut = true;
        collector.stop('crashed');
        await sent.edit({ embeds: [buildEmbed(`${emojis.error} Crashed at **${crashPoint.toFixed(2)}x**! Lost **${fmt(bet)}** coins.`).setColor(config.errorColor)], components: [] }).catch(() => {});
        return;
      }
      await sent.edit({ embeds: [buildEmbed()], components: [row] }).catch(() => {});
    }, 1200);

    collector.on('end', () => clearInterval(interval));
  },
};
