const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const { fmt } = require('../../utils/economyCore');

module.exports = {
  name: 'withdraw',
  description: 'Withdraw coins from your bank.',
  usage: '!withdraw <amount|all>',
  async execute(message, args) {
    const eco = db.economy(message.guild.id, message.author.id);
    const amount = args[0] === 'all' ? eco.bank : parseInt(args[0], 10);

    if (!amount || amount <= 0 || amount > eco.bank) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.errorColor)
          .setDescription(`${emojis.error} Enter a valid amount to withdraw (up to your bank balance of **${fmt(eco.bank)}** ${emojis.coin}).\n-# Usage: \`!withdraw <amount|all>\``)],
      });
    }

    eco.bank -= amount;
    eco.balance += amount;
    db.setEconomy(message.guild.id, message.author.id, eco);

    const embed = new EmbedBuilder()
      .setColor(config.successColor)
      .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
      .setDescription(`${emojis.money} Withdrew **${fmt(amount)}** ${emojis.coin} from your bank.`)
      .addFields(
        { name: `${emojis.money} Wallet`, value: `${fmt(eco.balance)} ${emojis.coin}`, inline: true },
        { name: `${emojis.bank} Bank`, value: `${fmt(eco.bank)} ${emojis.coin}`, inline: true },
      );

    message.channel.send({ embeds: [embed] });
  },
};
