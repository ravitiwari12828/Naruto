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
 * Builds a monospaced aligned box with clean indented continuation wrapping.
 */
function buildAlignedBox(title, entries, width = 38) {
  const topBorder = '╭' + '─'.repeat(width + 2) + '╮';
  const midBorder = '├' + '─'.repeat(width + 2) + '┤';
  const botBorder = '╰' + '─'.repeat(width + 2) + '╯';

  const titlePad = Math.max(0, width - title.length);
  const leftPad = Math.floor(titlePad / 2);
  const rightPad = titlePad - leftPad;
  const header = '│ ' + ' '.repeat(leftPad) + title + ' '.repeat(rightPad) + ' │';

  const rows = [];
  for (const entry of entries) {
    const parts = entry.split(':').map(s => s.trim());
    const key = parts[0];
    const val = parts[1] || '';
    const paddedKey = key.padEnd(8, ' ');
    const fullLine = paddedKey + ' : ' + val;

    if (fullLine.length <= width) {
      rows.push('│ ' + fullLine.padEnd(width, ' ') + ' │');
    } else {
      const maxValLen = width - 11; // 8 (key) + 3 (' : ')
      const words = val.split(' ');
      let currentVal = '';
      let first = true;

      for (const word of words) {
        if ((currentVal + (currentVal ? ' ' : '') + word).length <= maxValLen) {
          currentVal += (currentVal ? ' ' : '') + word;
        } else {
          if (first) {
            rows.push('│ ' + (paddedKey + ' : ' + currentVal).padEnd(width, ' ') + ' │');
            first = false;
          } else {
            rows.push('│ ' + (' '.repeat(11) + currentVal).padEnd(width, ' ') + ' │');
          }
          currentVal = word;
        }
      }
      if (currentVal) {
        if (first) {
          rows.push('│ ' + (paddedKey + ' : ' + currentVal).padEnd(width, ' ') + ' │');
        } else {
          rows.push('│ ' + (' '.repeat(11) + currentVal).padEnd(width, ' ') + ' │');
        }
      }
    }
  }

  return [topBorder, header, midBorder, ...rows, botBorder].join('\n');
}

/**
 * Builds the Custom Voice Channels deployment embed packaged inside a monospaced box container.
 */
function buildCustomVoiceChannelsEmbed(guild, triggerChanId = null) {
  const triggerMention = triggerChanId ? `<#${triggerChanId}>` : '`🔊 ✨ 「 Join to Create 」`';

  const perkBox = buildAlignedBox('PERKS COMPARISON', [
    'Member  : Size Limit Max 5',
    'Member  : Permit Users Max 5',
    'Member  : Ban Users Max 5',
    'Member  : Lock & Unlock Room',
    'Booster : Full Access Unlimited',
    'Booster : Unlimited Member Size',
    'Booster : Unlimited Permits',
    'Booster : Custom Rename Channel'
  ], 36);

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`Custom Voice Channels`)
    .setDescription(
      `Looking to escape from public calls? Create your own private channel and have control over every aspect of it.\n\n` +
      `${emojis.CUSTOM_INFO} **How to Create a Channel:**\n` +
      `${emojis.PRIZE_1} **Join** ${triggerMention}\n` +
      `${emojis.PRIZE_2} **Wait** *patiently* for channel to be created\n` +
      `${emojis.PRIZE_3} **Type** \`.vc help\` in your channel to edit settings\n\n` +
      '```\n' + perkBox + '\n```'
    )
    .setFooter({ text: `${guild.name} Custom Voice Calls`, iconURL: guild.iconURL({ dynamic: true }) || undefined });

  return embed;
}

/**
 * Builds Link Buttons matching user preferences (Support Server Link button).
 */
function buildCustomVoiceChannelButtons(guildId, triggerChanId = null) {
  const triggerUrl = triggerChanId ? `https://discord.com/channels/${guildId}/${triggerChanId}` : `https://discord.com/channels/${guildId}`;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel('Create a Custom Channel')
      .setEmoji('🖱️')
      .setURL(triggerUrl),
    new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel('Support Server')
      .setEmoji('💬')
      .setURL('https://discord.gg/w7Ryr6v4q8')
  );

  return [row];
}

/**
 * Builds the Voice Help embed with aligned box and indented multi-line wrapping.
 */
function buildVoiceHelpEmbed(member) {
  const user = member.user;

  const helpBox = buildAlignedBox('VOICE COMMANDS', [
    'info: View channel settings',
    'name: Rename voice channel',
    'size: Set channel size limit',
    'lock: Make channel private',
    'unlock: Make channel public',
    'ghost: Hide channel from sidebar',
    'unghost: Reveal channel in sidebar',
    'claim: Claim empty voice channel',
    'transfer: Transfer channel ownership',
    'permit: Allow specific user to join',
    'unpermit: Remove user from allowed list',
    'kick: Disconnect member from channel',
    'ban: Ban user from voice channel',
    'unban: Unban user from channel',
    'activity: Start Discord voice activity'
  ], 38);

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setAuthor({ name: 'Voice Help', iconURL: user.displayAvatarURL({ dynamic: true }) })
    .setTitle('Commands Directory')
    .setDescription(
      '```\n' + helpBox + '\n```\n' +
      '• Use `.vc <command> [args]` to execute any command!'
    )
    .setFooter({ text: `Requested by ${user.tag}`, iconURL: user.displayAvatarURL({ dynamic: true }) });

  return embed;
}

/**
 * Builds the Channel Created notification embed when member joins Join to Create.
 */
function buildChannelCreatedEmbed(member) {
  const user = member.user;

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setAuthor({ name: 'Channel Created', iconURL: user.displayAvatarURL({ dynamic: true }) })
    .setTitle('📕 Welcome to your 🔊 Channel')
    .setDescription('📝 Use **.vc help** to edit your settings ⚙️')
    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }));

  return embed;
}

module.exports = {
  name: 'voicemaster',
  description: 'VoiceMaster Setup & Interface: setupvc, vcsetup, vctemp setup, tempvc',
  aliases: ['vctemp', 'tempvc', 'vm', 'setupvc', 'vcsetup', 'invcrole'],
  voicemasterConfigs,
  getOrCreateVMConfig,
  buildCustomVoiceChannelsEmbed,
  buildCustomVoiceChannelButtons,
  buildVoiceHelpEmbed,
  buildChannelCreatedEmbed,

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
        return message.reply(`${emojis.DISABLED} Administrator permission required to deploy Custom Voice Channels.`);
      }

      const statusMsg = await message.channel.send(`⏳ Creating **Custom Voice Channels Category & Interface**...`);

      try {
        // Create Category
        const category = await guild.channels.create({
          name: '🔊 Custom Voice Calls',
          type: ChannelType.GuildCategory
        });

        // Create Trigger VC
        const triggerChan = await guild.channels.create({
          name: '🔊 ✨ 「 Join to Create 」',
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

        const embed = buildCustomVoiceChannelsEmbed(guild, triggerChan.id);
        const rows = buildCustomVoiceChannelButtons(guild.id, triggerChan.id);

        await interfaceChan.send({ embeds: [embed], components: rows });

        await statusMsg.delete().catch(() => {});

        const confirmEmbed = createStyledEmbed({
          title: `🔊 Custom Voice Channels Deployed!`,
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
        return statusMsg.edit(`❌ Failed to deploy Custom Voice Channels: \`${err.message}\``);
      }
    }

    // Default Dashboard
    const embed = buildCustomVoiceChannelsEmbed(guild, config.triggerChanId);
    const rows = buildCustomVoiceChannelButtons(guild.id, config.triggerChanId);
    return message.channel.send({ embeds: [embed], components: rows });
  }
};
