const { EmbedBuilder } = require('discord.js');
const db = require('../../../database/db');
const config = require('../../../config');
const emojis = require('../../../config/emojis');
const items = require('../../../config/items');
const { fmt } = require('../../../utils/economyCore');

module.exports = {
  name: 'profile',
  description: "View a member's full economy profile card.",
  usage: '!profile [@user]',
  cooldown: 3000,
  async execute(message) {
    const target = message.mentions.users.first() || message.author;
    const eco = db.economy(message.guild.id, target.id);
    const job = eco.job ? items.JOBS[eco.job] : null;
    const pet = eco.pets?.[0];
    const itemCount = Object.values(eco.inventory || {}).reduce((s, n) => s + n, 0);

    const embed = new EmbedBuilder()
      .setColor(config.embedColor)
      .setAuthor({ name: `${target.username}'s Profile`, iconURL: target.displayAvatarURL() })
      .addFields(
        { name: `${emojis.coin} Wallet`, value: `${fmt(eco.balance)}`, inline: true },
        { name: `${emojis.bank} Bank`, value: `${fmt(eco.bank)} / ${fmt(eco.bankLimit)}`, inline: true },
        { name: `${emojis.gem} Gems`, value: `${fmt(eco.gems || 0)}`, inline: true },
        { name: 'Job', value: job ? `${job.emoji} ${job.name}` : 'Unemployed', inline: true },
        { name: 'Married To', value: eco.married ? `<@${eco.married}>` : 'Single', inline: true },
        { name: 'Pet', value: pet ? `${items.PET_SPECIES[pet.species]?.emoji || '🐾'} ${pet.name} (Lv. ${pet.level})` : 'None', inline: true },
        { name: `${emojis.fire} Daily Streak`, value: `${eco.dailyStreak || 0} days`, inline: true },
        { name: 'Items Owned', value: `${fmt(itemCount)}`, inline: true },
        { name: `${emojis.chart} Net Worth`, value: `${fmt(eco.balance + eco.bank)} ${emojis.coin}`, inline: true },
      )
      .setThumbnail(target.displayAvatarURL({ size: 256 }))
      .setFooter({ text: `Requested by ${message.author.username}` })
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
  },
};
