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
      activeTempVCs: new Map() // vcChannelId -> { ownerId, guildId }
    });
  }
  const cfg = voicemasterConfigs.get(guildId);
  if (!cfg.activeTempVCs) cfg.activeTempVCs = new Map();
  return cfg;
}

/**
 * Builds the exact VoiceMaster Interface Control Center embed matching screenshot 1.
 */
function buildVoiceMasterInterfaceEmbed() {
  return new EmbedBuilder()
    .setColor(0x2B2D31)
    .setTitle(`VoiceMaster Interface`)
    .setDescription(
      `🔲 **VoiceMaster Hub**\n` +
      `:Playing: Join **Create Pvt** to create and control your own temporary voice room.\n` +
      `:home: Everything below is your control panel for private channels.\n\n` +
      `🔲 **VoiceMaster Control Center**\n` +
      `:Playing: Use the buttons below to manage your voice channel.\n\n` +
      `⚽ **Control Buttons**\n` +
      `• 🔒 **Lock** your voice channel\n` +
      `• 🔓 **Unlock** your voice channel\n` +
      `• 👁️ **Hide** your voice channel\n` +
      `• 👁️‍🗨️ **Reveal** your voice channel\n` +
      `• 📝 **Rename** your voice channel\n` +
      `• 👥 **Limit** your voice channel user limit\n` +
      `• 🔇 **Mute** a user\n` +
      `• 🔊 **Unmute** a user\n` +
      `• 🔕 **Deafen** a user\n` +
      `• 🔔 **Undeafen** a user\n` +
      `• 🛡️ **Permit** a user\n` +
      `• 🚫 **Ban** a user\n` +
      `• 🔄 **Transfer** ownership\n` +
      `• 👑 **Claim** ownership\n` +
      `• 🌐 **Region** change channel region\n` +
      `• ⚡ **Bitrate** set voice quality`
    )
    .setFooter({ text: 'Powered by Konoha Priority Development' });
}

/**
 * Builds the interactive button grid matching screenshot 1.
 */
function buildVoiceMasterActionRows() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vm_lock').setEmoji('🔒').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_unlock').setEmoji('🔓').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_hide').setEmoji('👁️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_reveal').setEmoji('👁️‍🗨️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_rename').setEmoji('📝').setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vm_limit').setEmoji('👥').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_mute').setEmoji('🔇').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_unmute').setEmoji('🔊').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_deafen').setEmoji('🔕').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_undeafen').setEmoji('🔔').setStyle(ButtonStyle.Secondary)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vm_permit').setEmoji('🛡️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_ban').setEmoji('🚫').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_transfer').setEmoji('🔄').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_claim').setEmoji('👑').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_region').setEmoji('🌐').setStyle(ButtonStyle.Secondary)
  );

  return [row1, row2, row3];
}

module.exports = {
  name: 'voicemaster',
  description: 'VoiceMaster Commands: setupvc, vctemp setup, invcrole, status',
  aliases: ['vctemp', 'tempvc', 'vm', 'setupvc', 'invcrole'],
  voicemasterConfigs,
  getOrCreateVMConfig,
  buildVoiceMasterInterfaceEmbed,
  buildVoiceMasterActionRows,

  async execute(message, args) {
    const invoked = message.content.slice(1).split(/ +/)[0].toLowerCase();
    let sub = args[0]?.toLowerCase();

    if (invoked === 'setupvc') sub = 'setup';
    if (invoked === 'invcrole') sub = 'role';

    const author = message.author;
    const guild = message.guild;
    const config = getOrCreateVMConfig(guild.id);

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // 1. .setupvc / .vctemp setup
    if (sub === 'setup') {
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

      const embed = buildVoiceMasterInterfaceEmbed();
      const rows = buildVoiceMasterActionRows();
      await interfaceChan.send({ embeds: [embed], components: rows });

      config.triggerChanId = triggerChan.id;
      config.interfaceChanId = interfaceChan.id;
      config.enabled = true;
      voicemasterConfigs.set(guild.id, config);

      return message.reply({
        embeds: [
          createStyledEmbed({
            title: `🎙️ VoiceMaster Setup Complete!`,
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

    // 2. IN-VC AUTO ROLE (.invcrole @role / remove)
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
      return message.reply(`✅ In-VC Auto Role set to <@&${role.id}>!`);
    }

    // 3. STATUS / HELP
    const embed = createStyledEmbed({
      title: `🎙️ VoiceMaster System Commands`,
      description:
        `\`.setupvc\` — 1-Click deploy Join to Create VC & Interface Panel\n` +
        `\`.invcrole @role\` — Set automatic role assigned while in VC\n` +
        `\`.tempvc\` — View VoiceMaster system status`,
      fields: [
        { name: '⚙️ Status', value: config.enabled ? '`ENABLED ✅`' : '`DISABLED ❌`', inline: true },
        { name: '🔊 Trigger Channel', value: config.triggerChanId ? `<#${config.triggerChanId}>` : '*Not set*', inline: true },
        { name: '💬 Interface Channel', value: config.interfaceChanId ? `<#${config.interfaceChanId}>` : '*Not set*', inline: true }
      ],
      requestedBy: author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
