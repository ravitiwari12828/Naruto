const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const items = require('../../config/items');
const { removeItem, addItem } = require('../../utils/economyCore');

module.exports = {
  name: 'trade',
  description: 'Propose a coin-for-item (or item-for-item) trade with another member.',
  usage: '.trade @user <your item id> <amount> <their item id> <amount>',
  cooldown: 5000,
  async execute(message, args) {
    const target = message.mentions.users.first();
    if (!target || target.id === message.author.id || target.bot) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} Mention a valid member to trade with.`)] });
    }
    const rest = args.filter((a) => !a.startsWith('<'));
    const [giveId, giveAmt, wantId, wantAmt] = rest;
    const giveItem = items.findItem((giveId || '').toLowerCase());
    const wantItem = items.findItem((wantId || '').toLowerCase());
    const giveQty = Math.max(1, parseInt(giveAmt, 10) || 1);
    const wantQty = Math.max(1, parseInt(wantAmt, 10) || 1);
    if (!giveItem || !wantItem) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} Usage: \`.trade @user <your item id> <amount> <their item id> <amount>\``)] });
    }

    const embed = new EmbedBuilder()
      .setColor(config.warnColor)
      .setTitle(`${emojis.tools} Trade Offer`)
      .setDescription(`${message.author} offers **${giveQty}× ${giveItem.emoji} ${giveItem.name}**\nfor ${target}'s **${wantQty}× ${wantItem.emoji} ${wantItem.name}**`)
      .setFooter({ text: `${target.username} must accept within 60 seconds.` });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('trade_accept').setLabel('Accept').setEmoji(emojis.success).setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('trade_decline').setLabel('Decline').setEmoji(emojis.error).setStyle(ButtonStyle.Danger),
    );
    const sent = await message.channel.send({ embeds: [embed], components: [row] });

    const collector = sent.createMessageComponentCollector({ time: 60000, max: 1, filter: (i) => i.user.id === target.id });
    collector.on('collect', async (i) => {
      if (i.customId === 'trade_decline') return i.update({ embeds: [embed.setColor(config.errorColor).setFooter({ text: 'Trade declined.' })], components: [] });

      const sender = db.economy(message.guild.id, message.author.id);
      const receiver = db.economy(message.guild.id, target.id);
      if ((sender.inventory[giveItem.id] || 0) < giveQty) return i.update({ embeds: [embed.setColor(config.errorColor).setFooter({ text: `${message.author.username} no longer has enough items.` })], components: [] });
      if ((receiver.inventory[wantItem.id] || 0) < wantQty) return i.update({ embeds: [embed.setColor(config.errorColor).setFooter({ text: `${target.username} doesn't have enough items.` })], components: [] });

      removeItem(sender, giveItem.id, giveQty);
      removeItem(receiver, wantItem.id, wantQty);
      addItem(receiver, giveItem.id, giveQty);
      addItem(sender, wantItem.id, wantQty);
      db.setEconomy(message.guild.id, message.author.id, sender);
      db.setEconomy(message.guild.id, target.id, receiver);

      await i.update({ embeds: [embed.setColor(config.successColor).setFooter({ text: 'Trade completed!' })], components: [] });
    });
    collector.on('end', (collected) => {
      if (!collected.size) sent.edit({ components: [] }).catch(() => {});
    });
  },
};
