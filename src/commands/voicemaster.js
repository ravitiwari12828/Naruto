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
 * Builds the VoiceMaster Control Interface embed with 2-column box layout containing all temporary VC commands.
 */
function buildVoiceMasterInterfaceEmbed(triggerChanId = null) {
  const triggerMention = triggerChanId ? `<#${triggerChanId}>` : '`➕ Join to Create`';

  const embed = new EmbedBuilder()
    .setColor(0x7E0808)
    .setTitle(`🔊 VoiceMaster Control Interface`)
    .setDescription(
      `Manage your temporary voice channel using the controls below.\n` +
      `Join ${triggerMention} to create and customize your private voice room.\n\n` +
      `╭─────────────────────────────┬─────────────────────────────╮\n` +
      `│  🔒 Lock VC                 │  🔓 Unlock VC               │\n` +
      `│  👻 Ghost VC                │  👁️ Unghost VC              │\n` +
      `│  ✋ Claim VC                │  👥 Transfer VC             │\n` +
      `│  🎛️ Set Limit               │  ❌ Disconnect Member       │\n` +
      `│  𚷷 Ban Member               │  👤 Unban Member            │\n` +
      `│  ✨ Whitelist Member        │  🛡️ Unwhitelist Member      │\n` +
      `│  📌 VC Info                 │  ▶️ Start Activity           │\n` +
      `╰─────────────────────────────┴─────────────────────────────╯\n\n` +
      `**💬 Voice Commands Reference:**\n` +
      `• \`.vc lock\` • \`.vc unlock\` • \`.vc ghost\` • \`.vc unghost\` • \`.vc claim\` • \`.vc transfer @user\`\n` +
      `• \`.vc limit <1-99>\` • \`.vc disconnect @user\` • \`.vc ban @user\` • \`.vc unban @user\`\n` +
      `• \`.vcmute @user\` • \`.vcunmute @user\` • \`.vcdeafen @user\` • \`.vcundeafen @user\``
    )
    .setFooter({ text: 'Naruto VoiceMaster • Click interactive buttons below' });

  return embed;
}

/**
 * Builds 3 ActionRows of interactive Discord buttons (5 per row max).
 */
function buildVoiceMasterActionRows() {
  // Row 1: Lock, Unlock, Ghost, Unghost, Claim
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vm_lock').setLabel('Lock').setEmoji('🔒').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_unlock').setLabel('Unlock').setEmoji('🔓').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('vm_ghost').setLabel('Ghost').setEmoji('👻').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_unghost').setLabel('Unghost').setEmoji('👁️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('vm_claim').setLabel('Claim').setEmoji('✋').setStyle(ButtonStyle.Danger)
  );

  // Row 2: Transfer, Limit, Disconnect, Ban, Unban
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vm_transfer').setLabel('Transfer').setEmoji('👥').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('vm_limit').setLabel('Limit').setEmoji('🎛️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('vm_disconnect').setLabel('Disconnect').setEmoji('❌').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('vm_ban').setLabel('Ban').setEmoji('𚷷').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_unban').setLabel('Unban').setEmoji('👤').setStyle(ButtonStyle.Secondary)
  );

  // Row 3: Whitelist, VC Info, Mute, Deafen, Activity
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vm_whitelist').setLabel('Whitelist').setEmoji('✨').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_info').setLabel('VC Info').setEmoji('📌').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_mute').setLabel('Mute').setEmoji('🔇').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_deafen').setLabel('Deafen').setEmoji('🎧').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_activity').setLabel('Activity').setEmoji('▶️').setStyle(ButtonStyle.Secondary)
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

        const embed = buildVoiceMasterInterfaceEmbed(triggerChan.id);
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
    const embed = buildVoiceMasterInterfaceEmbed(config.triggerChanId);
    const rows = buildVoiceMasterActionRows();
    return message.channel.send({ embeds: [embed], components: rows });
  }
};
