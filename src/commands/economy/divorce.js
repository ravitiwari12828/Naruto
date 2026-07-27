const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');

module.exports = {
  name: 'divorce',
  description: 'Divorce your current spouse.',
  usage: '.divorce',
  cooldown: 5000,
  async execute(message) {
    const eco = db.economy(message.guild.id, message.author.id);
    if (!eco.marry) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} You are not married to anyone.`)] });
    }

    const partnerId = eco.marry;
    const partnerEco = db.economy(message.guild.id, partnerId);

    eco.marry = null;
    partnerEco.marry = null;

    db.setEconomy(message.guild.id, message.author.id, eco);
    db.setEconomy(message.guild.id, partnerId, partnerEco);

    const embed = new EmbedBuilder()
      .setColor(config.warnColor)
      .setTitle(`💔 Divorce Finalized`)
      .setDescription(`You have officially divorced <@${partnerId}>. You are both single now.`)
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  },
};
