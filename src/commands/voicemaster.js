const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
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
      `• Use the interactive quick menu or buttons below to manage room privacy, permissions, and capacity.\n\n` +
      `**${emojis.GEAR} Interactive Control Matrix**\n` +
      `• ${emojis.LOCK} **Lock** • Restrict room access to permitted members\n` +
      `• ${emojis.UNLOCK} **Unlock** • Open room access to all server members\n` +
      `• ${emojis.HIDE} **Hide** • Hide your voice room from channel list\n` +
      `• 📖 **Reveal** • Make your hidden voice channel visible\n` +
      `• 📝 **Rename** • Custom rename your voice channel\n` +
      `• 👥 **Limit** • Adjust maximum member slot limit\n` +
      `• 🔇 **Mute All** • Server mute all connected members\n` +
      `• 🎙️ **Unmute All** • Server unmute all connected members\n` +
      `• ${emojis.SHIELD} **Permit** • Grant permanent view/connect access to user\n` +
      `• ${emojis.REMOVE} **Ban** • Disconnect & ban user from channel\n` +
      `• 🔄 **Transfer** • Transfer room ownership to another user\n` +
      `• ${emojis.OWNER_CROWN} **Claim** • Claim ownership of an empty room`
    )
    .setFooter({ text: 'Naruto VoiceMaster • Interactive Audio Suite' })
    .setTimestamp();
}

/**
 * Builds the interactive select menu & color-coded button grid.
 */
function buildVoiceMasterActionRows() {
  const quickMenu = new StringSelectMenuBuilder()
    .setCustomId('vm_quick_menu')
    .setPlaceholder('⚡ VoiceMaster Quick Presets & Control Bar...')
    .addOptions([
      { label: 'Lock Channel', value: 'vm_menu_lock', description: 'Restrict access to permitted users', emoji: '🔒' },
      { label: 'Unlock Channel', value: 'vm_menu_unlock', description: 'Allow public joining', emoji: '🔓' },
      { label: 'Set User Limit', value: 'vm_menu_limit', description: 'Adjust user slot capacity limit', emoji: '👥' },
      { label: 'Mute Room', value: 'vm_menu_mute', description: 'Server mute all connected members', emoji: '🔇' },
      { label: 'Unmute Room', value: 'vm_menu_unmute', description: 'Server unmute all connected members', emoji: '🎙️' },
      { label: 'Claim Ownership', value: 'vm_menu_claim', description: 'Claim empty room ownership', emoji: '👑' }
    ]);

  const menuRow = new ActionRowBuilder().addComponents(quickMenu);

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vm_lock').setLabel('Lock').setEmoji(emojis.OBJ_SHIELD).setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('vm_unlock').setLabel('Unlock').setEmoji(emojis.OBJ_TOOLS).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('vm_hide').setLabel('Hide').setEmoji('👁️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_reveal').setLabel('Reveal').setEmoji('📖').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_rename').setLabel('Rename').setEmoji('📝').setStyle(ButtonStyle.Primary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vm_limit').setLabel('Limit').setEmoji('👥').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('vm_mute').setLabel('Mute').setEmoji('🔇').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('vm_unmute').setLabel('Unmute').setEmoji('🎙️').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('vm_permit').setLabel('Permit').setEmoji(emojis.OBJ_TOOLS).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('vm_claim').setLabel('Claim').setEmoji(emojis.OBJ_OWNER).setStyle(ButtonStyle.Primary)
  );

  return [menuRow, row1, row2];
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
