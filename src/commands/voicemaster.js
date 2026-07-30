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
 * Builds the ultra-aesthetic 2-column VoiceMaster Control Center embed matching screenshot.
 */
function buildVoiceMasterInterfaceEmbed(triggerChanId = null) {
  const triggerMention = triggerChanId ? `<#${triggerChanId}>` : '`➕ Join to Create`';

  const embed = new EmbedBuilder()
    .setColor(0x7E0808)
    .setTitle(`🔊 VoiceMaster Control Interface`)
    .setDescription(
      `Join ${triggerMention} to create and manage your private Voice Channel!\n` +
      `Use the interactive buttons below to control permissions, locks, and limits.\n\n` +
      `>>> **🚷 Ban member** ─── **👤 Unban member**\n` +
      `**👤+ Whitelist member** ─── **👤- Unwhitelist member**\n` +
      `**🔒 Lock VC** ─── **🔓 Unlock VC**\n` +
      `**🚫 Ghost VC** ─── **👁️ Unghost VC**\n` +
      `**🤝 Claim VC** ─── **⇄ Transfer VC**\n` +
      `**🎛️ Set Limit** ─── **▶️ Start Activity**\n` +
      `**ℹ️ VC Information** ─── **🔗 Disconnect member**`
    )
    .setFooter({ text: 'Naruto VoiceMaster • Click buttons below to manage your room' });

  return embed;
}

/**
 * Builds the 3-row interactive VoiceMaster Discord ActionRow buttons matching screenshot.
 */
function buildVoiceMasterActionRows() {
  // Row 1: Claim, Transfer, Set Limit, VC Info, Disconnect
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vm_claim').setLabel('Claim').setEmoji('🤝').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('vm_transfer').setLabel('Transfer').setEmoji('⇄').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('vm_limit').setLabel('Limit').setEmoji('🎛️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('vm_info').setLabel('Info').setEmoji('ℹ️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('vm_disconnect').setLabel('Disconnect').setEmoji('🔗').setStyle(ButtonStyle.Danger)
  );

  // Row 2: Ban, Unban, Whitelist, Unwhitelist
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vm_ban').setLabel('Ban').setEmoji('🚷').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_unban').setLabel('Unban').setEmoji('👤').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_whitelist').setLabel('Whitelist').setEmoji('👤').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_unwhitelist').setLabel('Unwhitelist').setEmoji('👤').setStyle(ButtonStyle.Secondary)
  );

  // Row 3: Lock, Unlock, Ghost, Unghost
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vm_lock').setLabel('Lock').setEmoji('🔒').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_unlock').setLabel('Unlock').setEmoji('🔓').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_ghost').setLabel('Ghost').setEmoji('🚫').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_unghost').setLabel('Unghost').setEmoji('👁️').setStyle(ButtonStyle.Secondary)
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
