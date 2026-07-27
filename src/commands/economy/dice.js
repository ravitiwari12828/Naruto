const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const { animate } = require('../../utils/funCore');
const { fmt } = require('../../utils/economyCore');

module.exports = {
  name: 'dice',
  description: 'Roll dice against the bot — highest total wins your bet.',
  usage: '!dice <bet>',
  cooldown: 3000,
  async execute(message, args) {
    const bet = parseInt(args[0], 10);
    const eco = db.economy(message.guild.id, message.author.id);
    if (!bet || bet <= 0 || bet > eco.balance) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} Give a valid bet you can afford.`)],
      });
    }

    const sent = await message.channel.send({ embeds: [new EmbedBuilder().setColor(config.embedColor).setDescription(`${emojis.dice} Rolling...`)] });
    await animate(sent, [{ embeds: [new EmbedBuilder().setColor(config.embedColor).setDescription(`${emojis.dice} ${emojis.dice}`)] }], 700);

    const playerRoll = (Math.floor(Math.random() * 6) + 1) + (Math.floor(Math.random() * 6) + 1);
    const botRoll = (Math.floor(Math.random() * 6) + 1) + (Math.floor(Math.random() * 6) + 1);

    let outcome, color;
    if (playerRoll > botRoll) { eco.balance += bet; outcome = `${emojis.success} You win **${fmt(bet)}** coins!`; color = config.successColor; }
    else if (playerRoll < botRoll) { eco.balance -= bet; outcome = `${emojis.error} You lose **${fmt(bet)}** coins.`; color = config.errorColor; }
    else { outcome = `${emojis.info} It's a tie — bet returned.`; color = config.warnColor; }
    db.setEconomy(message.guild.id, message.author.id, eco);

    await sent.edit({
      embeds: [new EmbedBuilder()
        .setColor(color)
        .setTitle(`${emojis.dice} Dice Duel`)
        .setDescription(`You rolled **${playerRoll}**\nI rolled **${botRoll}**\n\n${outcome}`)
        .setFooter({ text: `New balance: ${fmt(eco.balance)} coins` })],
    });
  },
};
