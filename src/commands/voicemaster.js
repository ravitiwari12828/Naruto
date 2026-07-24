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
  const voiceIcon = emojis.OBJ_VOICE || emojis.VOICE || '🎙️';
  return new EmbedBuilder()
    .setColor(0x00E5FF)
    .setTitle(`${voiceIcon} VoiceMaster Control Center`)
    .setDescription(
      `Join ${triggerMention} to automatically create your private voice room.\n` +
      `Use the interactive emoji buttons below to control your channel!`
    )
    .setFooter({ text: 'Naruto VoiceMaster • Premium Private Audio' });
}

/**
 * Builds the 2-row color-coded interactive button grid with custom 3D aesthetic emojis.
 */
function buildVoiceMasterActionRows() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vm_lock').setLabel('Lock').setEmoji(emojis.OBJ_LOCK || '🔒').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('vm_unlock').setLabel('Unlock').setEmoji(emojis.OBJ_UNLOCK || '🔓').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('vm_hide').setLabel('Hide').setEmoji(emojis.OBJ_HIDE || '👁️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_reveal').setLabel('Reveal').setEmoji(emojis.OBJ_TOOLS || '📖').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_rename').setLabel('Rename').setEmoji(emojis.OBJ_SCROLL || '📝').setStyle(ButtonStyle.Primary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vm_limit').setLabel('Limit').setEmoji(emojis.OBJ_HUMAN || '👥').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('vm_mute').setLabel('Mute').setEmoji(emojis.OBJ_DISABLED || '🔇').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('vm_unmute').setLabel('Unmute').setEmoji(emojis.OBJ_ENABLED || '🔊').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('vm_permit').setLabel('Permit').setEmoji(emojis.OBJ_SHIELD || '🛡️').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('vm_claim').setLabel('Claim').setEmoji(emojis.OBJ_OWNER || '👑').setStyle(ButtonStyle.Primary)
  );

  return [row1, row2];
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

