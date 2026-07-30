const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
  EmbedBuilder
} = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');

// Global VoiceMaster store
const voicemasterConfigs = new Map();

function getOrCreateVMConfig(guildId) {
  if (!voicemasterConfigs.has(guildId)) {
    voicemasterConfigs.set(guildId, {
      enabled: true,
      triggerChanId: null,
      interfaceChanId: null,
      inVcRoleId: null,
      activeTempVCs: new Map()
    });
  }
  const cfg = voicemasterConfigs.get(guildId);
  if (!cfg.activeTempVCs) cfg.activeTempVCs = new Map();
  return cfg;
}

/**
 * Builds the 3-Column Glassmorphic Executive VoiceMaster Control Hub embed matching user screenshot.
 */
function buildVoiceMasterInterfaceEmbed(triggerChanId = null, member = null, tempVcDetails = null) {
  const triggerMention = triggerChanId ? `<#${triggerChanId}>` : '`➕ Join to Create`';
  const ownerName = member ? `@${member.user.username}` : '`Creator / Owner`';
  const sessionName = tempVcDetails?.name || '`The Obsidian Lounge 🎙️`';
  const activeCount = tempVcDetails?.members?.size || '`Active Session`';

  const embed = new EmbedBuilder()
    .setColor(0x7E0808)
    .setAuthor({ name: '👑 NARUTO EXECUTIVE VOICE SUITE • VIP CONTROL HUB' })
    .setTitle(`🔊 VoiceMaster Executive Control Hub`)
    .setDescription(
      `Welcome to the **VoiceMaster™ Executive Control Hub**!\n` +
      `Join ${triggerMention} to generate your temporary voice room and manage settings.\n` +
      `──────────────────────────────────────────────────`
    )
    .addFields(
      {
        name: `🎛️ ROOM MANAGEMENT`,
        value:
          `**Current Session**\n${sessionName}\n\n` +
          `**Participants**\n${activeCount} Active Users\n\n` +
          `**Management Commands**\n` +
          `• \`.vc transfer @user\`\n` +
          `• \`.vc disconnect @user\`\n` +
          `• \`.vc limit <1-99>\``,
        inline: true
      },
      {
        name: `👑 OWNERSHIP`,
        value:
          `**Room Admin**\n${ownerName}\n\n` +
          `**Role & Rank**\nAdministrator / Host\n\n` +
          `**Access Controls**\n` +
          `• \`.vc claim\`\n` +
          `• \`.vc whitelist @user\`\n` +
          `• \`.vc unwhitelist @user\``,
        inline: true
      },
      {
        name: `🔒 ACCESS & PRIVACY`,
        value:
          `**Visibility**\nPrivate / Managed 🔒\n\n` +
          `**Permissions**\nRole-Based Protection\n\n` +
          `**Privacy Commands**\n` +
          `• \`.vc lock\` • \`.vc unlock\`\n` +
          `• \`.vc ghost\` • \`.vc unghost\`\n` +
          `• \`.vc ban @user\``,
        inline: true
      }
    )
    .setFooter({ text: 'Naruto VoiceMaster Executive Suite • Click interactive buttons below to manage room' });

  return embed;
}

/**
 * Builds the 3 rows of interactive Discord buttons matching screenshot.
 */
function buildVoiceMasterActionRows() {
  // Row 1: Transfer, Kick/Ban, Allow/Deny, Lock Room, VC Info
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vm_transfer').setLabel('Transfer Ownership').setEmoji('👥').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('vm_ban').setLabel('Kick/Ban User').setEmoji('𚷷').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('vm_whitelist').setLabel('Allow/Deny Access').setEmoji('✨').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('vm_lock').setLabel('Lock Room').setEmoji('🔒').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_info').setLabel('Room Logs').setEmoji('📌').setStyle(ButtonStyle.Secondary)
  );

  // Row 2: Claim, Set Limit, Unlock, Ghost, Unghost
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vm_claim').setLabel('Claim Room').setEmoji('✋').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('vm_limit').setLabel('Adjust Bitrate/Limit').setEmoji('🎛️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('vm_unlock').setLabel('Unlock Room').setEmoji('🔓').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_ghost').setLabel('Ghost Room').setEmoji('👻').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_unghost').setLabel('Unghost Room').setEmoji('👁️').setStyle(ButtonStyle.Secondary)
  );

  // Row 3: Mute All, Deafen All, Disconnect, Start Activity
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vm_mute').setLabel('Mute Participants').setEmoji('🔇').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_deafen').setLabel('Deafen Participants').setEmoji('🎧').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_disconnect').setLabel('Disconnect Member').setEmoji('❌').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('vm_activity').setLabel('Start Activity').setEmoji('▶️').setStyle(ButtonStyle.Secondary)
  );

  return [row1, row2, row3];
}

module.exports = {
  name: 'voicemaster',
  description: 'VoiceMaster Executive 3-Column Control Hub & Temporary VC Suite',
  aliases: ['vctemp', 'tempvc', 'vm', 'setupvc', 'vcsetup', 'invcrole'],
  voicemasterConfigs,
  getOrCreateVMConfig,
  buildVoiceMasterInterfaceEmbed,
  buildVoiceMasterActionRows,

  async execute(message, args) {
    const invoked = message.content.slice(1).split(/ +/)[0].toLowerCase();
    const sub = args[0]?.toLowerCase();

    const author = message.author;
    const guild = message.guild;
    const config = getOrCreateVMConfig(guild.id);

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // 1. SETUP COMMAND (.setupvc / .vcsetup / .voicemaster setup)
    if (invoked === 'setupvc' || invoked === 'vcsetup' || sub === 'setup') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(`${emojis.DISABLED} Administrator permission required to deploy VoiceMaster.`);
      }

      const statusMsg = await message.channel.send(`⏳ Creating **VoiceMaster Temporary VC Category & Interface**...`);

      try {
        // Create Category
        const category = await guild.channels.create({
          name: '🔊 VoiceMaster Hub',
          type: ChannelType.GuildCategory
        });

        // Create Trigger VC
        const triggerChan = await guild.channels.create({
          name: '➕ Join to Create',
          type: ChannelType.GuildVoice,
          parent: category.id
        });

        // Create Interface Text Channel
        const interfaceChan = await guild.channels.create({
          name: 'interface',
          type: ChannelType.GuildText,
          parent: category.id,
          permissionOverwrites: [
            {
              id: guild.roles.everyone.id,
              allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory],
              deny: [PermissionsBitField.Flags.SendMessages]
            }
          ]
        });

        config.triggerChanId = triggerChan.id;
        config.interfaceChanId = interfaceChan.id;
        voicemasterConfigs.set(guild.id, config);

        const embed = buildVoiceMasterInterfaceEmbed(triggerChan.id, message.member);
        const rows = buildVoiceMasterActionRows();

        await interfaceChan.send({ embeds: [embed], components: rows });

        await statusMsg.delete().catch(() => {});

        const confirmEmbed = createStyledEmbed({
          title: `🔊 VoiceMaster System Deployed!`,
          subtitle: `${guild.name} Temporary Voice Channels Active`,
          fields: [
            { name: `➕ Join Channel`, value: `<#${triggerChan.id}>`, inline: true },
            { name: `🎮 Control Interface`, value: `<#${interfaceChan.id}>`, inline: true }
          ],
          requestedBy: author,
          clientUser
        });

        return message.channel.send({ embeds: [confirmEmbed] });
      } catch (err) {
        return statusMsg.edit(`❌ Failed to deploy VoiceMaster: \`${err.message}\``);
      }
    }

    // Default Dashboard
    const embed = buildVoiceMasterInterfaceEmbed(config.triggerChanId, message.member);
    const rows = buildVoiceMasterActionRows();
    return message.channel.send({ embeds: [embed], components: rows });
  }
};
