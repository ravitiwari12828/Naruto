const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const { cooldownLeft, fmt } = require('../../utils/economyCore');

const COOLDOWN = 12 * 60 * 60 * 1000; // 12h, matching typical bot-list vote cooldowns
const REWARD = 400;

module.exports = {
  name: 'vote',
  description: "Claim your vote reward (once you've voted for the bot).",
  usage: '!vote',
  cooldown: 3000,
  async execute(message) {
    const eco = db.economy(message.guild.id, message.author.id);
    const cd = cooldownLeft(eco.lastVote, COOLDOWN);
    if (!cd.ready) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.warnColor).setDescription(`${emojis.hourglass} You can vote again in **${cd.text}**.`)] });
    }

    eco.balance += REWARD;
    eco.gems = (eco.gems || 0) + 1;
    eco.lastVote = Date.now();
    db.setEconomy(message.guild.id, message.author.id, eco);

    await message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor(config.successColor)
        .setTitle(`${emojis.sparkle} Thanks for voting!`)
        .setDescription(`You claimed **${fmt(REWARD)}** ${emojis.coin} and **1** ${emojis.gem} gem!`)
        .setFooter({ text: 'You can vote again in 12 hours.' })],
    });
  },
};
