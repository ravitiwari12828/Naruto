const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const { fmt } = require('../../utils/economyCore');

module.exports = {
  name: 'deposit',
  description: 'Deposit coins into your bank.',
  usage: '.deposit <amount|all>',
  async execute(message, args) {
    const eco = db.economy(message.guild.id, message.author.id);
    const amount = args[0] === 'all' ? eco.balance : parseInt(args[0], 10);

    if (!amount || amount <= 0 || amount > eco.balance) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.errorColor)
          .setDescription(`${emojis.error} Enter a valid amount to deposit (up to your wallet balance of **${fmt(eco.balance)}** ${emojis.coin}).\n-# Usage: \`.deposit <amount|all>\``)],
      });
    }

    eco.balance -= amount;
    eco.bank += amount;
    db.setEconomy(message.guild.id, message.author.id, eco);

    const embed = new EmbedBuilder()
      .setColor(config.successColor)
      .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
      .setDescription(`${emojis.bank} Deposited **${fmt(amount)}** ${emojis.coin} into your bank.`)
      .addFields(
        { name: `${emojis.money} Wallet`, value: `${fmt(eco.balance)} ${emojis.coin}`, inline: true },
        { name: `${emojis.bank} Bank`, value: `${fmt(eco.bank)} ${emojis.coin}`, inline: true },
      );

    message.channel.send({ embeds: [embed] });
  },
};
