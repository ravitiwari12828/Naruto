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
 * Builds the ultra-aesthetic VoiceMaster Interface Control Center embed with 3D custom emojis.
 */
function buildVoiceMasterInterfaceEmbed() {
  return new EmbedBuilder()
    .setColor(0x00E5FF)
    .setTitle(`${emojis.VOICE} VoiceMaster Control Center`)
    .setDescription(
      `**${emojis.STAR} VoiceMaster Private Room Hub**\n` +
      `• Join **➕ Join to Create** to create your private voice room.\n` +
      `• Everything below is your control panel for managing room access and audio.\n\n` +
      `**${emojis.GEAR} Control Buttons Guide**\n` +
      `• ${emojis.LOCK} **Lock** • Lock your voice channel\n` +
      `• ${emojis.UNLOCK} **Unlock** • Unlock your voice channel\n` +
      `• ${emojis.HIDE} **Hide** • Hide your voice channel from view\n` +
      `• 📖 **Reveal** • Reveal your hidden voice channel\n` +
      `• 📝 **Rename** • Change your voice channel name\n` +
      `• 👥 **Limit** • Set maximum user slot limit\n` +
      `• 🔇 **Mute** • Server mute all connected members\n` +
      `• 🎙️ **Unmute** • Server unmute all connected members\n` +
      `• 🔕 **Deafen** • Server deafen all connected members\n` +
      `• 🎧 **Undeafen** • Server undeafen all connected members\n` +
      `• ${emojis.SHIELD} **Permit** • Grant private access to a user\n` +
      `• ${emojis.REMOVE} **Ban** • Disconnect & ban user from channel\n` +
      `• 🔄 **Transfer** • Transfer room ownership to member\n` +
      `• ${emojis.OWNER_CROWN} **Claim** • Claim ownership of empty room\n` +
      `• 🌐 **Region** • Change voice channel region\n` +
      `• ${emojis.ZAP} **Bitrate** • Set enhanced audio bitrate`
    )
    .setFooter({ text: 'Naruto VoiceMaster • Premium Audio Suite' })
    .setTimestamp();
}

/**
 * Builds the interactive button grid with 3D aesthetic emojis.
 */
function buildVoiceMasterActionRows() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vm_lock').setEmoji(emojis.OBJ_SHIELD).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_unlock').setEmoji(emojis.OBJ_TOOLS).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_hide').setEmoji('👁️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_reveal').setEmoji('📖').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_rename').setEmoji('📝').setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vm_limit').setEmoji('👥').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_mute').setEmoji('🔇').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_unmute').setEmoji('🎙️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_deafen').setEmoji('🔕').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_undeafen').setEmoji('🎧').setStyle(ButtonStyle.Secondary)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vm_permit').setEmoji(emojis.OBJ_TOOLS).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_ban').setEmoji(emojis.OBJ_REMOVE).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_transfer').setEmoji('🔄').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_claim').setEmoji(emojis.OBJ_OWNER).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_region').setEmoji('🌐').setStyle(ButtonStyle.Secondary)
  );

  return [row1, row2, row3];
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
    if (['setup', 'create'].includes(sub)) {
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
      return message.reply(`${emojis.SUCCESS} In-VC Auto Role set to <@&${role.id}>!`);
    }

    const { renderModuleHelpPanel } = require('../utils/panelRenderer');
    return renderModuleHelpPanel(message, 'voice');
  }
};
