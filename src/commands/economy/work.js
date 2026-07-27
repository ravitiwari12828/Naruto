const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const items = require('../../config/items');
const { cooldownLeft, bumpQuest, fmt } = require('../../utils/economyCore');

const COOLDOWN = 60 * 60 * 1000;
const GENERIC_LINES = ['delivered pizzas', 'walked dogs', 'coded a bot', 'busked on the street', 'fixed a computer', 'tutored a student'];

module.exports = {
  name: 'work',
  description: 'Work your job to earn coins (1 hour cooldown). Use !job to specialize.',
  usage: '!work',
  cooldown: 3000,
  async execute(message) {
    const eco = db.economy(message.guild.id, message.author.id);
    const cd = cooldownLeft(eco.lastWork, COOLDOWN);
    if (!cd.ready) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.warnColor)
          .setDescription(`${emojis.hourglass} You're tired. Try again in **${cd.text}**.`)],
      });
    }

    const job = eco.job ? items.JOBS[eco.job] : null;
    const earned = job ? Math.floor(Math.random() * (job.payMax - job.payMin + 1)) + job.payMin
      : Math.floor(Math.random() * 100) + 50;
    const line = job ? job.lines[Math.floor(Math.random() * job.lines.length)] : GENERIC_LINES[Math.floor(Math.random() * GENERIC_LINES.length)];

    eco.balance += earned;
    eco.lastWork = Date.now();
    bumpQuest(eco, 'earn500', earned);
    db.setEconomy(message.guild.id, message.author.id, eco);

    const embed = new EmbedBuilder()
      .setColor(config.successColor)
      .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
      .setTitle(`${job?.emoji || emojis.work} ${job ? job.name : 'Work'} Shift Complete`)
      .setDescription(`You ${line} and earned **${fmt(earned)}** ${emojis.coin}!`)
      .addFields({ name: `${emojis.money} New Balance`, value: `${fmt(eco.balance)} ${emojis.coin}`, inline: true })
      .setFooter({ text: job ? 'Use !job to switch careers anytime.' : 'Tip: use !job to pick a career for better pay.' })
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
  },
};
