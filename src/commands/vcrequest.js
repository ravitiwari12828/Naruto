const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ComponentType
} = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');

module.exports = {
  name: 'vcrequest',
  description: 'Voice Connection Request & Voice Invite System: .vcrequest @member, .vcinvite @member',
  aliases: ['vcinvite', 'voicerequest', 'voiceinvite'],

  async execute(message, args) {
    const rawFirstWord = message.content.trim().split(/ +/)[0] || '';
    const invoked = rawFirstWord.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();
    const isInvite = invoked === 'vcinvite' || invoked === 'voiceinvite';

    const guild = message.guild;
    const author = message.author;
    const senderMember = message.member;

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // 0. Bot Permission Check (Bot needs Move Members to drag users)
    if (!guild.members.me.permissions.has(PermissionsBitField.Flags.MoveMembers)) {
      return message.reply(`${emojis.WARNING || '⚠️'} I do not have permission to **Move Members** in voice channels!`);
    }

    // 1. Target Member Resolution
    const targetMember = message.mentions.members.first() || (args[0] && args[0].match(/^\d{17,20}$/) ? await guild.members.fetch(args[0]).catch(() => null) : null);

    if (!targetMember) {
      const cmdName = isInvite ? '.vcinvite' : '.vcrequest';
      return message.reply(
        `${emojis.INFO || 'ℹ️'} **Usage:** \`${cmdName} @member\`\n` +
        `• \`.vcinvite @member\` ➔ Invite a member from another VC into your channel.\n` +
        `• \`.vcrequest @member\` ➔ Request permission to join a member's VC.`
      );
    }

    // 2. Self and Bot Validation
    if (targetMember.id === author.id) {
      return message.reply(`❌ You cannot ${isInvite ? 'invite' : 'request to join'} yourself!`);
    }

    if (targetMember.user.bot) {
      return message.reply(`❌ Bots cannot be moved or invited using this system.`);
    }

    // 3. Both Members Must Be in a Voice Channel
    const senderVoice = senderMember.voice?.channel;
    const targetVoice = targetMember.voice?.channel;

    if (!senderVoice || !targetVoice) {
      return message.reply(`❌ **Both users must be in a Voice Channel to use this system.**`);
    }

    // 4. Same Voice Channel Check
    if (senderVoice.id === targetVoice.id) {
      return message.reply(`❌ **You are already in the same Voice Channel!**`);
    }

    // 5. Build Panel and Buttons based on Action Type
    // A. .vcinvite: Sender invites target to come to sender's VC
    // B. .vcrequest: Sender asks target for permission to join target's VC
    const destChannel = isInvite ? senderVoice : targetVoice;
    const memberToMove = isInvite ? targetMember : senderMember;
    const title = isInvite ? `🎙️ Voice Channel Invitation` : `🙏 Voice Connection Request`;

    const description = isInvite
      ? `Hey <@${targetMember.id}>, <@${author.id}> has invited you to join their Voice Channel (**${senderVoice.name}**)!`
      : `Hey <@${targetMember.id}>, <@${author.id}> is requesting permission to join your Voice Channel (**${targetVoice.name}**)!`;

    const embed = createStyledEmbed({
      title,
      description:
        `${description}\n\n` +
        `• **Current Channel:** \`${memberToMove.voice.channel.name}\`\n` +
        `• **Target Channel:** **${destChannel.name}**\n\n` +
        `*Click **Accept** to move into the channel, or **Decline** to reject.*\n` +
        `⏳ *This ${isInvite ? 'invitation' : 'request'} will expire in 1 minute.*`,
      requestedBy: author,
      clientUser
    });

    const acceptBtnId = `vc_${isInvite ? 'inv' : 'req'}_acc_${Date.now()}`;
    const declineBtnId = `vc_${isInvite ? 'inv' : 'req'}_dec_${Date.now()}`;

    const btnRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(acceptBtnId)
        .setLabel('Accept')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅'),
      new ButtonBuilder()
        .setCustomId(declineBtnId)
        .setLabel('Decline')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('❌')
    );

    const panelMsg = await message.channel.send({
      content: `<@${targetMember.id}>`,
      embeds: [embed],
      components: [btnRow]
    });

    // 6. Interactive Button Collector (1-minute expiry window)
    const collector = panelMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000 // 1 minute expiry
    });

    collector.on('collect', async (interaction) => {
      // Only the target member can click Accept or Decline
      if (interaction.user.id !== targetMember.id) {
        return interaction.reply({
          content: `❌ Only <@${targetMember.id}> can accept or decline this ${isInvite ? 'invitation' : 'request'}!`,
          ephemeral: true
        });
      }

      await interaction.deferUpdate().catch(() => {});

      // Disabled Buttons for final state
      const disabledRow = new ActionRowBuilder().addComponents(
        ButtonBuilder.from(btnRow.components[0]).setDisabled(true),
        ButtonBuilder.from(btnRow.components[1]).setDisabled(true)
      );

      // --- ACCEPT ACTION ---
      if (interaction.customId === acceptBtnId) {
        collector.stop('accepted');

        // Re-fetch voice states to prevent moving disconnected users
        const freshSender = await guild.members.fetch(senderMember.id).catch(() => null);
        const freshTarget = await guild.members.fetch(targetMember.id).catch(() => null);

        if (!freshSender?.voice?.channel || !freshTarget?.voice?.channel) {
          const failEmbed = createStyledEmbed({
            title: `❌ Connection Failed`,
            description: `One of the members disconnected from voice while this request was pending!`,
            requestedBy: author,
            clientUser
          });
          return panelMsg.edit({ embeds: [failEmbed], components: [disabledRow] }).catch(() => {});
        }

        const freshDest = isInvite ? freshSender.voice.channel : freshTarget.voice.channel;
        const freshToMove = isInvite ? freshTarget : freshSender;

        try {
          // Drag/Move member into destination VC
          await freshToMove.voice.setChannel(freshDest, `Voice connection ${isInvite ? 'invite' : 'request'} accepted`);

          const successEmbed = createStyledEmbed({
            title: `🙏 Voice Connection Request`,
            description:
              `✅ **Success!** Moved <@${freshToMove.id}> to **${freshDest.name}** 🎀.\n\n` +
              `• **Requested By:** <@${author.id}>\n` +
              `• **Accepted By:** <@${targetMember.id}>\n` +
              `• **Destination:** \`${freshDest.name}\``,
            requestedBy: author,
            clientUser
          });

          return panelMsg.edit({ embeds: [successEmbed], components: [disabledRow] }).catch(() => {});
        } catch (err) {
          console.error('[VC Move Error]', err);
          const errEmbed = createStyledEmbed({
            title: `❌ Failed to Move Member`,
            description: `Could not move <@${freshToMove.id}> to **${freshDest.name}**: ${err.message}`,
            requestedBy: author,
            clientUser
          });
          return panelMsg.edit({ embeds: [errEmbed], components: [disabledRow] }).catch(() => {});
        }
      }

      // --- DECLINE ACTION ---
      if (interaction.customId === declineBtnId) {
        collector.stop('declined');

        const declineEmbed = createStyledEmbed({
          title: `❌ ${isInvite ? 'Voice Invitation' : 'Voice Request'} Declined`,
          description: `<@${targetMember.id}> declined the voice ${isInvite ? 'invitation to join' : 'connection request to'} **${destChannel.name}**.`,
          requestedBy: author,
          clientUser
        });

        return panelMsg.edit({ embeds: [declineEmbed], components: [disabledRow] }).catch(() => {});
      }
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'accepted' || reason === 'declined') return;

      // Expired after 1 minute
      const expiredRow = new ActionRowBuilder().addComponents(
        ButtonBuilder.from(btnRow.components[0]).setDisabled(true),
        ButtonBuilder.from(btnRow.components[1]).setDisabled(true)
      );

      const expiredEmbed = createStyledEmbed({
        title: `⏰ ${isInvite ? 'Voice Invitation' : 'Voice Connection'} Expired`,
        description: `The ${isInvite ? 'invitation' : 'connection request'} between <@${author.id}> and <@${targetMember.id}> has expired. No action was taken within 1 minute.`,
        requestedBy: author,
        clientUser
      });

      return panelMsg.edit({ embeds: [expiredEmbed], components: [expiredRow] }).catch(() => {});
    });
  }
};
