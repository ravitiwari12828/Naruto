const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const { cooldownLeft, fmt } = require('../../utils/economyCore');

const VOTE_COOLDOWN = 12 * 60 * 60 * 1000;
const VOTE_REWARD = 10000;

module.exports = {
  name: 'vote',
  description: 'Vote for Naruto Bot and claim 10,000 Ryo coins & 1 Gem!',
  usage: '.vote',
  cooldown: 3000,
  async execute(message) {
    const eco = db.economy(message.guild.id, message.author.id);
    const cd = cooldownLeft(eco.lastVote || 0, VOTE_COOLDOWN);

    if (!cd.ready) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.warnColor).setDescription(`${emojis.hourglass} You already claimed your vote reward. You can vote again in **${cd.text}**.`)] });
    }

    eco.balance += VOTE_REWARD;
    eco.gems = (eco.gems || 0) + 1;
    eco.lastVote = Date.now();
    db.setEconomy(message.guild.id, message.author.id, eco);

    const embed = new EmbedBuilder()
      .setColor(config.successColor)
      .setTitle(`${emojis.sparkle || '✨'} Vote Reward Claimed!`)
      .setDescription(`Thank you for voting for **Naruto Bot**!\n\n` +
                      `<a:gift_animated:1537179583064055931> Reward Received: **+${fmt(VOTE_REWARD)}** ${emojis.coin} & **+1** 💎 Gem!`)
      .addFields({ name: `Wallet Balance`, value: `**${fmt(eco.balance)}** ${emojis.coin}`, inline: true })
      .setFooter({ text: 'You can vote every 12 hours for bonuses!' })
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  },
};
