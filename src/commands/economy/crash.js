const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const { fmt } = require('../../utils/economyCore');

module.exports = {
  name: 'crash',
  description: 'Watch the multiplier rise and cash out before it crashes!',
  usage: '.crash <bet>',
  cooldown: 5000,
  async execute(message, args) {
    const bet = parseInt(args[0], 10);
    const eco = db.economy(message.guild.id, message.author.id);
    if (!bet || bet <= 0) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} Provide a valid bet, e.g. \`.crash 100\`.`)] });
    }
    if (bet > eco.balance) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} Insufficient wallet balance. Wallet: **${fmt(eco.balance)}** ${emojis.coin}.`)] });
    }

    eco.balance -= bet;
    db.setEconomy(message.guild.id, message.author.id, eco);

    const crashAt = parseFloat((1 + Math.random() * Math.random() * 8.5).toFixed(2));
    let currentMultiplier = 1.00;
    let cashedOut = false;
    let finalMultiplier = 1.00;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('crash_cashout').setLabel('CASHOUT').setEmoji('💰').setStyle(ButtonStyle.Success)
    );

    const getEmbed = (multiplier, status = 'Rising...') => new EmbedBuilder()
      .setColor(status.includes('CRASHED') ? config.errorColor : status.includes('CASHED') ? config.successColor : config.embedColor)
      .setAuthor({ name: `${message.author.username}'s Crash Rocket`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
      .setTitle(`🚀 Crash Game`)
      .setDescription(`\`\`\`\n  🚀 Rocket Status: ${status}\n  Current Multipliers: ${multiplier.toFixed(2)}x\n  Potential Payout: ${fmt(Math.floor(bet * multiplier))} coins\n\`\`\``)
      .setFooter({ text: `Bet: ${fmt(bet)} ${emojis.coin}` });

    const sent = await message.channel.send({ embeds: [getEmbed(currentMultiplier)], components: [row] });
    const collector = sent.createMessageComponentCollector({ time: 30000 });

    collector.on('collect', async (i) => {
      if (i.user.id !== message.author.id) return i.reply({ content: `${emojis.error} Not your game.`, ephemeral: true });
      if (i.customId === 'crash_cashout') {
        cashedOut = true;
        finalMultiplier = currentMultiplier;
        const payout = Math.floor(bet * finalMultiplier);
        eco.balance += payout;
        db.setEconomy(message.guild.id, message.author.id, eco);

        await i.update({
          embeds: [getEmbed(finalMultiplier, `CASHED OUT at ${finalMultiplier.toFixed(2)}x (Won +${fmt(payout)} coins!)`)],
          components: []
        });
        collector.stop();
      }
    });

    const interval = setInterval(async () => {
      if (cashedOut) {
        clearInterval(interval);
        return;
      }

      currentMultiplier = parseFloat((currentMultiplier + 0.25).toFixed(2));

      if (currentMultiplier >= crashAt) {
        clearInterval(interval);
        collector.stop();
        if (!cashedOut) {
          await sent.edit({
            embeds: [getEmbed(crashAt, `💥 CRASHED AT ${crashAt.toFixed(2)}x (Lost -${fmt(bet)} coins)`)],
            components: []
          }).catch(() => {});
        }
      } else {
        await sent.edit({ embeds: [getEmbed(currentMultiplier)] }).catch(() => {});
      }
    }, 1500);
  },
};
