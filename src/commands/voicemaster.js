const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  AttachmentBuilder
} = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
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
      cardType: 'embed', // 'embed' or 'canvas'
      activeTempVCs: new Map()
    });
  }
  const cfg = voicemasterConfigs.get(guildId);
  if (!cfg.activeTempVCs) cfg.activeTempVCs = new Map();
  return cfg;
}

/**
 * Custom Canvas Graphic Generator: Exact 3-Column Glassmorphic VoiceMaster Executive Control Hub.
 */
async function generateVoiceMasterCanvasCard(member = null, tempVcDetails = null) {
  const width = 1100;
  const height = 620;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Dark obsidian gradient background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#0a0a0f');
  bgGrad.addColorStop(0.5, '#12070a');
  bgGrad.addColorStop(1, '#0a0a0f');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Geometric red accent lines
  ctx.strokeStyle = 'rgba(255, 42, 75, 0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(150, 0); ctx.lineTo(0, 150); ctx.closePath(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(width, height); ctx.lineTo(width - 150, height); ctx.lineTo(width, height - 150); ctx.closePath(); ctx.stroke();

  // Outer glowing red frame
  ctx.strokeStyle = '#ff2a4b';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(15, 15, width - 30, height - 30, 16);
  ctx.stroke();

  // Header Title
  ctx.fillStyle = '#ff2a4b';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('VoiceMaster Executive', 450, 65);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Control Hub', 635, 65);

  // 3 Glassmorphic Columns
  const cols = [
    { title: 'ROOM MANAGEMENT', x: 40 },
    { title: 'OWNERSHIP', x: 385 },
    { title: 'ACCESS & PRIVACY', x: 730 }
  ];

  for (const col of cols) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.roundRect(col.x, 95, 330, 480, 16);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(col.title, col.x + 165, 132);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(col.x + 20, 148);
    ctx.lineTo(col.x + 310, 148);
    ctx.stroke();
  }

  const sessionName = tempVcDetails?.name || 'The Obsidian Lounge 🎙️';
  const activeCount = (tempVcDetails?.members?.size || '12') + ' Active Users';
  const ownerName = member ? `@${member.user.username}` : 'Username #0001 ⭐';

  // Column 1 Details (Room Management)
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('Current Session', 60, 180);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '14px sans-serif';
  ctx.fillText(sessionName.slice(0, 30), 60, 202);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('Participants', 60, 240);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '14px sans-serif';
  ctx.fillText(activeCount, 60, 262);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('Duration', 60, 300);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '14px sans-serif';
  ctx.fillText('02:45:18', 60, 322);

  const c1Btns = ['[TRANSFER OWNERSHIP]', '[KICK/BAN USER]', '[ALLOW/DENY ACCESS]'];
  c1Btns.forEach((label, idx) => {
    const btnY = 360 + idx * 60;
    ctx.fillStyle = 'rgba(255, 42, 75, 0.15)';
    ctx.beginPath();
    ctx.roundRect(60, btnY, 290, 46, 10);
    ctx.fill();

    ctx.strokeStyle = '#ff2a4b';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, 205, btnY + 28);
  });

  // Column 2 Details (Ownership)
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('Server Owner', 405, 180);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '14px sans-serif';
  ctx.fillText(ownerName.slice(0, 28), 405, 202);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('Room Admin', 405, 240);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '14px sans-serif';
  ctx.fillText(ownerName.slice(0, 28), 405, 262);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('Role', 405, 300);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '14px sans-serif';
  ctx.fillText('Administrator', 405, 322);

  const c2Btns = ['[ASSIGN ADMIN]', '[ADJUST BITRATE]', '[SET ROLE PERMISSIONS]'];
  c2Btns.forEach((label, idx) => {
    const btnY = 360 + idx * 60;
    ctx.fillStyle = 'rgba(255, 42, 75, 0.15)';
    ctx.beginPath();
    ctx.roundRect(405, btnY, 290, 46, 10);
    ctx.fill();

    ctx.strokeStyle = '#ff2a4b';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, 550, btnY + 28);
  });

  // Column 3 Details (Access & Privacy)
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('Visibility', 750, 180);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '14px sans-serif';
  ctx.fillText('Private 🔒', 750, 202);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('Access Level', 750, 240);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '14px sans-serif';
  ctx.fillText('Role-Based', 750, 262);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('Permissions', 750, 300);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '14px sans-serif';
  ctx.fillText('Managed', 750, 322);

  const c3Btns = ['[MUTE ALL PARTICIPANTS]', '[LOCK ROOM]', '[ROOM LOGS]'];
  c3Btns.forEach((label, idx) => {
    const btnY = 360 + idx * 60;
    ctx.fillStyle = 'rgba(255, 42, 75, 0.15)';
    ctx.beginPath();
    ctx.roundRect(750, btnY, 290, 46, 10);
    ctx.fill();

    ctx.strokeStyle = '#ff2a4b';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, 895, btnY + 28);
  });

  const buffer = await canvas.encode('png');
  return new AttachmentBuilder(buffer, { name: 'voicemaster-hub.png' });
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
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vm_transfer').setLabel('Transfer Ownership').setEmoji('👥').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('vm_ban').setLabel('Kick/Ban User').setEmoji('𚷷').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('vm_whitelist').setLabel('Allow/Deny Access').setEmoji('✨').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('vm_lock').setLabel('Lock Room').setEmoji('🔒').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_info').setLabel('Room Logs').setEmoji('📌').setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vm_claim').setLabel('Claim Room').setEmoji('✋').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('vm_limit').setLabel('Adjust Bitrate/Limit').setEmoji('🎛️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('vm_unlock').setLabel('Unlock Room').setEmoji('🔓').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_ghost').setLabel('Ghost Room').setEmoji('👻').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_unghost').setLabel('Unghost Room').setEmoji('👁️').setStyle(ButtonStyle.Secondary)
  );

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
  generateVoiceMasterCanvasCard,
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
        const category = await guild.channels.create({
          name: '🔊 VoiceMaster Hub',
          type: ChannelType.GuildCategory
        });

        const triggerChan = await guild.channels.create({
          name: '➕ Join to Create',
          type: ChannelType.GuildVoice,
          parent: category.id
        });

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
        const cardAttachment = await generateVoiceMasterCanvasCard(message.member);
        const rows = buildVoiceMasterActionRows();

        await interfaceChan.send({ files: [cardAttachment], embeds: [embed], components: rows });

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
    const cardAttachment = await generateVoiceMasterCanvasCard(message.member);
    const rows = buildVoiceMasterActionRows();
    return message.channel.send({ files: [cardAttachment], embeds: [embed], components: rows });
  }
};
