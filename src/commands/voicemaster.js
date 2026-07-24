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
 * Builds the ultra-aesthetic VoiceMaster Control Center embed with custom 3D emojis.
 * Kept minimal and clean without clutter or wall-of-text paragraphs.
 */
function buildVoiceMasterInterfaceEmbed(triggerChanId = null) {
  const triggerMention = triggerChanId ? `<#${triggerChanId}>` : '`➕ Join to Create`';
  const voiceIcon = emojis.VOICE || '🎙️';
  return new EmbedBuilder()
    .setColor(0x2B2D31)
    .setTitle(`${voiceIcon} VoiceMaster Control Center`)
    .setDescription(
      `Join ${triggerMention} to automatically create your private voice room.\n` +
      `Click any emoji button below to manage your room settings!`
    )
    .setFooter({ text: 'Naruto VoiceMaster • 20-Control Private Audio Suite' });
}

/**
 * Builds the complete 4-row 20-button control grid matching VoiceMaster standard layout.
 * Uniform Secondary style with NO text labels for perfect mobile UI responsiveness.
 */
function buildVoiceMasterActionRows() {
  // Row 1: Status, Limit, Logs, Ban, Unban
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vm_status').setEmoji(emojis.OBJ_ZAP || '⚡').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_limit').setEmoji(emojis.OBJ_HUMAN || '👥').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_logs').setEmoji(emojis.OBJ_SCROLL || '📜').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_ban').setEmoji(emojis.OBJ_REMOVE || '🔨').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_unban').setEmoji(emojis.OBJ_ENABLED || '🔓').setStyle(ButtonStyle.Secondary)
  );

  // Row 2: Hide, Unhide, Region, Unlock, Lock
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vm_hide').setEmoji(emojis.OBJ_HIDE || '🙈').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_unhide').setEmoji(emojis.OBJ_TOOLS || '👁️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_region').setEmoji('🌐').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_unlock').setEmoji(emojis.OBJ_UNLOCK || '🔓').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_lock').setEmoji(emojis.OBJ_LOCK || '🔒').setStyle(ButtonStyle.Secondary)
  );

  // Row 3: Trust, Untrust, Bitrate, Invite, Kick
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vm_trust').setEmoji(emojis.OBJ_SHIELD || '➕').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_untrust').setEmoji('➖').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_bitrate').setEmoji('📶').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_invite').setEmoji('📞').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_kick').setEmoji('🚫').setStyle(ButtonStyle.Secondary)
  );

  // Row 4: Suppress, Unsuppress, Chat, Claim, Transfer
  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vm_suppress').setEmoji(emojis.OBJ_DISABLED || '🔇').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_unsuppress').setEmoji('🎙️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_chat').setEmoji(emojis.OBJ_MESSAGES || '💬').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_claim').setEmoji(emojis.OBJ_OWNER || '👑').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_transfer').setEmoji('↗️').setStyle(ButtonStyle.Secondary)
  );

  return [row1, row2, row3, row4];
}

module.exports = {
  name: 'voicemaster',
  description: 'VoiceMaster Setup & Interface: setupvc, vcsetup, vctemp setup, tempvc',
  aliases: ['vctemp', 'tempvc', 'vm', 'setupvc', 'vcsetup', 'invcrole'],
  voicemasterConfigs,
  getOrCreateVMConfig,
  buildVoiceMasterInterfaceEmbed,
  buildVoiceMasterActionRows,

  async execute(message, args) {
    const rawFirstWord = message.content.trim().split(/ +/)[0] || '';
    const invoked = rawFirstWord.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();
    let sub = args[0]?.toLowerCase();

    if (['setupvc', 'vcsetup'].includes(invoked)) sub = 'setup';
    if (invoked === 'invcrole') sub = 'role';

    const author = message.author;
    const guild = message.guild;
    const config = getOrCreateVMConfig(guild.id);

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // 1. SETUP COMMAND (.setupvc / .vcsetup / .vctemp setup / .vc setup)
    if (['setup', 'create', 'enable', 'on'].includes(sub)) {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(`${emojis.WARNING} Only Administrators can run VoiceMaster setup.`);
      }

      let category = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes('voice channels'));
      if (!category) {
        try {
          category = await guild.channels.create({
            name: '🔊 Voice Channels',
            type: ChannelType.GuildCategory
          });
        } catch (e) {}
      }

      let triggerChan = await guild.channels.create({
        name: '➕ Join to Create',
        type: ChannelType.GuildVoice,
        parent: category ? category.id : undefined
      });

      let interfaceChan = await guild.channels.create({
        name: 'interface',
        type: ChannelType.GuildText,
        parent: category ? category.id : undefined
      });

      const embed = buildVoiceMasterInterfaceEmbed(triggerChan.id);
      const rows = buildVoiceMasterActionRows();
      await interfaceChan.send({ embeds: [embed], components: rows });

      config.triggerChanId = triggerChan.id;
      config.interfaceChanId = interfaceChan.id;
      config.enabled = true;
      voicemasterConfigs.set(guild.id, config);

      return message.reply({
        embeds: [
          createStyledEmbed({
            title: `${emojis.VOICE} VoiceMaster Setup Complete!`,
            description:
              `• **Join to Create Voice Channel**: <#${triggerChan.id}>\n` +
              `• **VoiceMaster Interface Panel**: Deployed in <#${interfaceChan.id}>\n\n` +
              `When users join **<#${triggerChan.id}>**, their private voice room will automatically be created and managed via the interface panel!`,
            requestedBy: author,
            clientUser
          })
        ]
      });
    }

    // 2. DISABLE / RESET COMMAND (.vctemp disable / .vctemp off / .vctemp reset)
    if (['disable', 'off', 'reset', 'delete', 'remove'].includes(sub)) {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(`${emojis.WARNING} Only Administrators can disable VoiceMaster.`);
      }

      let deletedItems = [];
      let parentCategoryId = null;

      // Delete trigger channel
      if (config.triggerChanId) {
        try {
          const ch = guild.channels.cache.get(config.triggerChanId) || await guild.channels.fetch(config.triggerChanId).catch(() => null);
          if (ch) {
            if (ch.parentId) parentCategoryId = ch.parentId;
            await ch.delete('VoiceMaster disabled').catch(() => {});
            deletedItems.push(`🔊 \`${ch.name}\``);
          }
        } catch (e) {}
      }

      // Delete interface channel
      if (config.interfaceChanId) {
        try {
          const ch = guild.channels.cache.get(config.interfaceChanId) || await guild.channels.fetch(config.interfaceChanId).catch(() => null);
          if (ch) {
            if (ch.parentId && !parentCategoryId) parentCategoryId = ch.parentId;
            await ch.delete('VoiceMaster disabled').catch(() => {});
            deletedItems.push(`💬 \`${ch.name}\``);
          }
        } catch (e) {}
      }

      // Delete active temp VCs
      if (config.activeTempVCs && config.activeTempVCs.size > 0) {
        for (const [vcId] of config.activeTempVCs) {
          try {
            const ch = guild.channels.cache.get(vcId) || await guild.channels.fetch(vcId).catch(() => null);
            if (ch) {
              await ch.delete('VoiceMaster temp VC cleanup').catch(() => {});
              deletedItems.push(`🎙️ \`${ch.name}\``);
            }
          } catch (e) {}
        }
        config.activeTempVCs.clear();
      }

      // Also search for any remaining orphaned "➕ Join to Create" or "interface" channels
      const orphanTrigger = guild.channels.cache.find(c => c.type === ChannelType.GuildVoice && c.name.toLowerCase().includes('join to create'));
      if (orphanTrigger) {
        if (orphanTrigger.parentId && !parentCategoryId) parentCategoryId = orphanTrigger.parentId;
        await orphanTrigger.delete('VoiceMaster cleanup').catch(() => {});
        deletedItems.push(`🔊 \`${orphanTrigger.name}\``);
      }

      const orphanInterface = guild.channels.cache.find(c => c.type === ChannelType.GuildText && c.name.toLowerCase() === 'interface');
      if (orphanInterface) {
        if (orphanInterface.parentId && !parentCategoryId) parentCategoryId = orphanInterface.parentId;
        await orphanInterface.delete('VoiceMaster cleanup').catch(() => {});
        deletedItems.push(`💬 \`${orphanInterface.name}\``);
      }

      // Delete Category if empty
      if (parentCategoryId) {
        try {
          const category = guild.channels.cache.get(parentCategoryId) || await guild.channels.fetch(parentCategoryId).catch(() => null);
          if (category && category.type === ChannelType.GuildCategory) {
            const remainingChildren = guild.channels.cache.filter(c => c.parentId === category.id);
            if (remainingChildren.size === 0) {
              await category.delete('VoiceMaster category cleanup').catch(() => {});
              deletedItems.push(`📁 \`${category.name}\``);
            }
          }
        } catch (e) {}
      }

      config.enabled = false;
      config.triggerChanId = null;
      config.interfaceChanId = null;
      voicemasterConfigs.set(guild.id, config);

      return message.reply({
        embeds: [
          createStyledEmbed({
            title: `${emojis.VOICE} VoiceMaster Temp VC Disabled`,
            description:
              `${emojis.SUCCESS} **VoiceMaster temp VC system has been disabled.**\n\n` +
              `**Deleted Channels & Category:**\n${deletedItems.length > 0 ? deletedItems.join('\n') : '• *No channels found to delete.*'}`,
            requestedBy: author,
            clientUser
          })
        ]
      });
    }

    // 3. IN-VC AUTO ROLE (.invcrole @role / remove)
    if (sub === 'role' || sub === 'vcrole') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(`${emojis.WARNING} Only Administrators can configure in-VC role.`);
      }

      const role = message.mentions.roles.first() || guild.roles.cache.get(args[1]);
      if (!role) {
        if (config.inVcRoleId) {
          return message.reply(`🎙️ Current In-VC Auto Role: <@&${config.inVcRoleId}>`);
        }
        return message.reply(`ℹ️ Usage: \`.invcrole @role\` to set the role automatically given when members join any VC.`);
      }

      config.inVcRoleId = role.id;
      voicemasterConfigs.set(guild.id, config);
      return message.reply(`${emojis.SUCCESS} In-VC Auto Role set to <@&${role.id}>!`);
    }

    const { renderModuleHelpPanel } = require('../utils/panelRenderer');
    return renderModuleHelpPanel(message, 'voice');
  }
};

