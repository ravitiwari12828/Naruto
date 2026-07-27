const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../../database/db');
const config = require('../../../config');
const emojis = require('../../../config/emojis');

module.exports = {
  name: 'divorce',
  description: 'End your current marriage.',
  usage: '!divorce',
  cooldown: 5000,
  async execute(message) {
    const eco = db.economy(message.guild.id, message.author.id);
    if (!eco.married) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} You're not married to anyone.`)],
      });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('divorce_confirm').setLabel('Confirm Divorce').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('divorce_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
    );
    const sent = await message.channel.send({
      embeds: [new EmbedBuilder().setColor(config.warnColor).setDescription(`${emojis.warning} Are you sure you want to divorce <@${eco.married}>? This can't be undone.`)],
      components: [row],
    });
    const collector = sent.createMessageComponentCollector({ time: 20000, max: 1, filter: (i) => i.user.id === message.author.id });
    collector.on('collect', async (i) => {
      if (i.customId === 'divorce_cancel') {
        return i.update({ embeds: [new EmbedBuilder().setColor(config.embedColor).setDescription('Divorce cancelled.')], components: [] });
      }

      const partnerId = eco.married;
      const partner = db.economy(message.guild.id, partnerId);
      eco.married = null;
      partner.married = null;
      db.setEconomy(message.guild.id, message.author.id, eco);
      db.setEconomy(message.guild.id, partnerId, partner);

      await i.update({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.brokenHeart} ${message.author} and <@${partnerId}> are now divorced.`)], components: [] });
    });
    collector.on('end', (collected) => { if (!collected.size) sent.edit({ components: [] }).catch(() => {}); });
  },
};
