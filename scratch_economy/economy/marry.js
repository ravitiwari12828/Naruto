const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../../database/db');
const config = require('../../../config');
const emojis = require('../../../config/emojis');

module.exports = {
  name: 'marry',
  description: 'Propose marriage to another member.',
  usage: '!marry @user',
  cooldown: 5000,
  async execute(message) {
    const target = message.mentions.users.first();
    if (!target || target.id === message.author.id || target.bot) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} Mention someone to propose to.`)] });
    }

    const proposer = db.economy(message.guild.id, message.author.id);
    const partner = db.economy(message.guild.id, target.id);
    if (proposer.married) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} You're already married! Use \`!divorce\` first.`)] });
    }
    if (partner.married) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} ${target.username} is already married to someone else.`)] });
    }

    const embed = new EmbedBuilder()
      .setColor(0xFF6B9D)
      .setTitle(`${emojis.ring} A Proposal!`)
      .setDescription(`${message.author} got down on one knee for ${target}... 💍\n\n${target.username}, do you accept?`)
      .setFooter({ text: 'You have 60 seconds to respond.' });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('marry_yes').setLabel('I do!').setEmoji('💍').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('marry_no').setLabel('Decline').setStyle(ButtonStyle.Danger),
    );
    const sent = await message.channel.send({ embeds: [embed], components: [row] });

    const collector = sent.createMessageComponentCollector({ time: 60000, max: 1, filter: (i) => i.user.id === target.id });
    collector.on('collect', async (i) => {
      if (i.customId === 'marry_no') return i.update({ embeds: [embed.setColor(config.errorColor).setDescription(`${target} declined the proposal. 💔`)], components: [] });

      const freshProposer = db.economy(message.guild.id, message.author.id);
      const freshPartner = db.economy(message.guild.id, target.id);
      freshProposer.married = target.id;
      freshPartner.married = message.author.id;
      db.setEconomy(message.guild.id, message.author.id, freshProposer);
      db.setEconomy(message.guild.id, target.id, freshPartner);

      await i.update({ embeds: [embed.setColor(config.successColor).setDescription(`${emojis.ring} ${message.author} and ${target} are now married! Congratulations! 🎉`)], components: [] });
    });
    collector.on('end', (collected) => { if (!collected.size) sent.edit({ components: [] }).catch(() => {}); });
  },
};
