const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const { fmt } = require('../../utils/economyCore');

module.exports = {
  name: 'pay',
  description: 'Pay coins to another member.',
  usage: '.pay @user <amount>',
  async execute(message, args) {
    const target = message.mentions.users?.first();
    if (!target || target.id === message.author.id) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.errorColor)
          .setDescription(`${emojis.error} Mention a valid member to pay.\n-# Usage: \`.pay @user <amount>\``)],
      });
    }

    const amount = parseInt(args[1], 10);
    const sender = db.economy(message.guild.id, message.author.id);

    if (!amount || amount <= 0 || amount > sender.balance) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.errorColor)
          .setDescription(`${emojis.error} Enter a valid amount (up to your wallet balance of **${fmt(sender.balance)}** ${emojis.coin}).`)],
      });
    }

    sender.balance -= amount;
    db.setEconomy(message.guild.id, message.author.id, sender);
    const receiver = db.economy(message.guild.id, target.id);
    receiver.balance += amount;
    db.setEconomy(message.guild.id, target.id, receiver);

    const embed = new EmbedBuilder()
      .setColor(config.successColor)
      .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
      .setDescription(`${emojis.money} ${message.author} paid **${fmt(amount)}** ${emojis.coin} to ${target}.`)
      .addFields({ name: `${emojis.money} Your New Balance`, value: `${fmt(sender.balance)} ${emojis.coin}`, inline: true });

    message.channel.send({ embeds: [embed] });
  },
};
