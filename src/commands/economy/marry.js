const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');

module.exports = {
  name: 'marry',
  description: 'Propose marriage to another member with an interactive ring ceremony!',
  usage: '.marry <@user>',
  cooldown: 5000,
  async execute(message) {
    const target = message.mentions.users.first();
    if (!target || target.id === message.author.id || target.bot) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} Mention a valid member to propose to.`)] });
    }

    const senderEco = db.economy(message.guild.id, message.author.id);
    const targetEco = db.economy(message.guild.id, target.id);

    if (senderEco.marry) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} You are already married to <@${senderEco.marry}>!`)] });
    }
    if (targetEco.marry) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} **${target.username}** is already married to <@${targetEco.marry}>!`)] });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('marry_accept').setLabel('Accept Proposal').setEmoji('💍').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('marry_decline').setLabel('Decline').setEmoji('<a:wrong_animated:1537179702928875631>').setStyle(ButtonStyle.Danger)
    );

    const embed = new EmbedBuilder()
      .setColor(0xFF69B4)
      .setTitle(`💍 Marriage Proposal`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .setDescription(`<@${message.author.id}> has proposed marriage to ${target}!\n\n${target}, do you accept this proposal?`)
      .setFooter({ text: 'Proposal expires in 60 seconds.' })
      .setTimestamp();

    const sent = await message.channel.send({ content: `${target}`, embeds: [embed], components: [row] });
    const collector = sent.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async (i) => {
      if (i.user.id !== target.id) return i.reply({ content: `${emojis.error} Only ${target.username} can respond to this proposal.`, flags: 64, ephemeral: true });

      if (i.customId === 'marry_accept') {
        senderEco.marry = target.id;
        targetEco.marry = message.author.id;
        db.setEconomy(message.guild.id, message.author.id, senderEco);
        db.setEconomy(message.guild.id, target.id, targetEco);

        const winEmbed = new EmbedBuilder()
          .setColor(0xFF69B4)
          .setTitle(`💖 Marriage Ceremony Complete!`)
          .setDescription(`<a:tada_party_animated:1537179689381134356> **<@${message.author.id}>** and **${target}** are now officially married! 💕`)
          .setFooter({ text: 'Congratulations from Naruto Bot!' })
          .setTimestamp();

        await i.update({ embeds: [winEmbed], components: [] });
        collector.stop();
      } else {
        const rejectEmbed = new EmbedBuilder()
          .setColor(config.errorColor)
          .setTitle(`💔 Proposal Declined`)
          .setDescription(`${target.username} declined the marriage proposal.`)
          .setTimestamp();

        await i.update({ embeds: [rejectEmbed], components: [] });
        collector.stop();
      }
    });

    collector.on('end', (collected) => {
      if (!collected.size) sent.edit({ components: [] }).catch(() => {});
    });
  },
};
