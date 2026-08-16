const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const { fmt } = require('../../utils/economyCore');
const { renderCrashCard } = require('../../utils/casinoCard');

module.exports = {
  name: 'crash',
  description: 'Naruto Stake Rocket — Cash out before the rocket explodes!',
  usage: '.crash <bet>',
  cooldown: 5000,
  async execute(message, args) {
    const bet = parseInt(args[0], 10);
    const eco = db.economy(message.guild.id, message.author.id);
    if (!bet || bet <= 0) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`<a:wrong_animated:1537179702928875631> Provide a valid bet amount, e.g. \`.crash 100\`.`)] });
    }
    if (bet > eco.balance) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`<a:wrong_animated:1537179702928875631> Insufficient wallet balance. Current Wallet: **${fmt(eco.balance)}** <a:dollar_animated:1537177379666006016>.`)] });
    }

    eco.balance -= bet;
    db.setEconomy(message.guild.id, message.author.id, eco);

    const crashAt = parseFloat((1 + Math.random() * Math.random() * 8.5).toFixed(2));
    let currentMultiplier = 1.00;
    let cashedOut = false;
    let finalMultiplier = 1.00;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('crash_cashout')
        .setLabel('CASHOUT ROCKET')
        .setEmoji('<a:dollar_animated:1537177379666006016>')
        .setStyle(ButtonStyle.Success)
    );

    const buildPayload = async (multiplier, status = 'Rising...', isCrash = false, isWin = false) => {
      const statusIcon = isCrash ? '<a:kaboom_animated:1537179599228637226>' : isWin ? '<a:accept_animated:1537177319603703969>' : '<a:rocket_animated:1537179661371707402>';
      const color = isCrash ? 0xED4245 : isWin ? 0x57F287 : 0x00F0FF;

      const cardAttachment = await renderCrashCard({
        multiplier,
        status,
        bet,
        payout: Math.floor(bet * multiplier),
        isCrash,
        isWin,
        username: message.author.username
      });

      const embed = new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: `${message.author.username}'s Shinobi Rocket`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTitle(`${statusIcon} Naruto Stake.cc Crash Game`)
        .setDescription(
          `**Status:** ${statusIcon} **${status}**\n` +
          `• **Current Multiplier:** **${multiplier.toFixed(2)}x**\n` +
          `• **Bet Amount:** **${fmt(bet)}** <a:dollar_animated:1537177379666006016>\n` +
          `• **Potential Payout:** **${fmt(Math.floor(bet * multiplier))}** <a:dollar_animated:1537177379666006016>`
        )
        .setImage('attachment://stake-crash.png')
        .setFooter({ text: `Bet: ${fmt(bet)} Ryo • Naruto Shinobi Casino Cards` })
        .setTimestamp();

      return { embeds: [embed], files: [cardAttachment] };
    };

    const initialPayload = await buildPayload(currentMultiplier);
    const sent = await message.channel.send({ ...initialPayload, components: [row] });
    const collector = sent.createMessageComponentCollector({ time: 30000 });

    collector.on('collect', async (i) => {
      if (i.user.id !== message.author.id) return i.reply({ content: `<a:wrong_animated:1537179702928875631> Not your game.`, flags: 64 });
      if (i.customId === 'crash_cashout') {
        cashedOut = true;
        finalMultiplier = currentMultiplier;
        const payout = Math.floor(bet * finalMultiplier);
        eco.balance += payout;
        db.setEconomy(message.guild.id, message.author.id, eco);

        const winPayload = await buildPayload(finalMultiplier, `CASHED OUT at ${finalMultiplier.toFixed(2)}x (Won +${fmt(payout)} Ryo!)`, false, true);
        await i.update({
          ...winPayload,
          components: []
        }).catch(() => {});
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
          const crashPayload = await buildPayload(crashAt, `CRASHED AT ${crashAt.toFixed(2)}x (Lost -${fmt(bet)} Ryo)`, true, false);
          await sent.edit({
            ...crashPayload,
            components: []
          }).catch(() => {});
        }
      } else {
        const updatePayload = await buildPayload(currentMultiplier);
        await sent.edit(updatePayload).catch(() => {});
      }
    }, 1500);
  },
};
