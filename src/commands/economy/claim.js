const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const { cooldownLeft, fmt } = require('../../utils/economyCore');

module.exports = {
  name: 'claim',
  description: "Claim your pet's completed adventure reward.",
  usage: '!claim',
  cooldown: 3000,
  async execute(message) {
    const eco = db.economy(message.guild.id, message.author.id);
    if (!eco.adventure) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} You don't have an adventure in progress. Start one with \`!adventure\`.`)],
      });
    }

    const remaining = eco.adventure.readyAt - Date.now();
    if (remaining > 0) {
      const cd = cooldownLeft(0, remaining);
      return message.reply({
        embeds: [new EmbedBuilder().setColor(config.warnColor).setDescription(`${emojis.hourglass} **${eco.adventure.petName}** is still on their journey. Back in **${cd.text}**.`)],
      });
    }

    eco.balance += eco.adventure.reward;
    const { destination, reward, petName } = eco.adventure;
    eco.adventure = null;
    db.setEconomy(message.guild.id, message.author.id, eco);

    await message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor(config.successColor)
        .setTitle('🗺️ Adventure Complete!')
        .setDescription(`**${petName}** returned from **${destination}** with **${fmt(reward)}** ${emojis.coin}!`)
        .setTimestamp()],
    });
  },
};
