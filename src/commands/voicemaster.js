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
      enabled: false,
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
 * Device-Proof Monospaced Box Builder for PC, Android, and iOS.
 * Strictly capped at 28 total characters width (24 inner characters) to guarantee ZERO line wrapping.
 */
function buildDeviceProofBox(title, items) {
  const INNER_WIDTH = 24;
  const topBorder = '╭' + '─'.repeat(INNER_WIDTH + 2) + '╮';
  const midBorder = '├' + '─'.repeat(INNER_WIDTH + 2) + '┤';
  const botBorder = '╰' + '─'.repeat(INNER_WIDTH + 2) + '╯';

  const titlePad = Math.max(0, INNER_WIDTH - title.length);
  const leftPad = Math.floor(titlePad / 2);
  const rightPad = titlePad - leftPad;
  const header = '│ ' + ' '.repeat(leftPad) + title + ' '.repeat(rightPad) + ' │';

  const rows = items.map(item => {
    const [key, val] = item.split(':').map(s => s.trim());
    const paddedKey = key.padEnd(8, ' ');
    const fullLine = paddedKey + ': ' + val;
    return '│ ' + fullLine.padEnd(INNER_WIDTH, ' ').slice(0, INNER_WIDTH) + ' │';
  });

  return [topBorder, header, midBorder, ...rows, botBorder].join('\n');
}

/**
 * Builds the Custom Voice Channels deployment embed with device-proof 28-char box.
 */
function buildCustomVoiceChannelsEmbed(guild, triggerChanId = null) {
  const triggerMention = triggerChanId ? `<#${triggerChanId}>` : '`<a:volumeup_animated:1537177548121968650> <a:sparkles_animated:1537179684175872171> 「 Join to Create 」`';

  const perkBox = buildDeviceProofBox('PERKS COMPARISON', [
    'Member  : Size Max 5',
    'Member  : Permit Max 5',
    'Member  : Ban Max 5',
    'Member  : Lock & Unlock',
    'Booster : Full Access',
    'Booster : Unlimited Size',
    'Booster : No Limit Permit',
    'Booster : Custom Rename'
  ]);

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`Custom Voice Channels`)
    .setDescription(
      `Looking to escape from public calls? Create your own private channel and have control over every aspect of it.\n\n` +
      `<a:infox_animated:1537177409428787251> **How to Create a Channel:**\n` +
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
      .setEmoji('<a:code_animated:1537177358912725033>')
      .setURL('https://discord.gg/w7Ryr6v4q8')
  );

  return [row];
}

const { createDynamicBox } = require('../utils/boxBuilder');

/**
 * Builds the Voice Help embed with device-proof 26-char box for PC, Android & iOS.
 */
function buildVoiceHelpEmbed(member) {
  const user = member.user;

  const helpBox = createDynamicBox('VOICE COMMANDS', [
    'info    : VC settings',
    'name    : Rename channel',
    'size    : Set VC limit',
    'lock    : Lock channel',
    'unlock  : Unlock channel',
    'ghost   : Hide channel',
    'unghost : Reveal channel',
    'claim   : Claim empty VC',
    'transfer: Transfer VC',
    'permit  : Allow user',
    'unpermit: Revoke user',
    'kick    : Kick user',
    'ban     : Ban user',
    'unban   : Unban user',
    'activity: Start activity'
  ]);

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
    .setTitle('📕 Welcome to your <a:volumeup_animated:1537177548121968650> Channel')
    .setDescription('<a:pencil_animated:1537177465829724181> Use **.vc help** to edit your settings <a:settings_animated:1537177506170404905>')
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
    const rawFirstWord = message.content.trim().split(/ +/)[0] || '';
    const invoked = rawFirstWord.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();
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

      const statusMsg = await message.channel.send(`<a:hourglass_animated:1537179590982631575> Creating **Custom Voice Channels Category & Interface**...`);

      try {
        // Create Category
        const category = await guild.channels.create({
          name: '🔊 · Custom Voice Calls ·',
          type: ChannelType.GuildCategory
        });

        // Create Trigger VC
        const triggerChan = await guild.channels.create({
          name: '🔊 「 Join to Create 」',
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
          title: `<a:volumeup_animated:1537177548121968650> Custom Voice Channels Deployed!`,
          subtitle: `${guild.name} Temporary Voice Channels Active`,
          fields: [
            { name: `➕ Join Channel`, value: `<#${triggerChan.id}>`, inline: true },
            { name: `<a:gamecontroller_animated:1537177388725706802> Control Interface`, value: `<#${interfaceChan.id}>`, inline: true }
          ],
          requestedBy: author,
          clientUser
        });

        return message.channel.send({ embeds: [confirmEmbed] });
      } catch (err) {
        return statusMsg.edit(`<a:wrong_animated:1537179702928875631> Failed to deploy Custom Voice Channels: \`${err.message}\``);
      }
    }

    // Default Dashboard
    const embed = buildCustomVoiceChannelsEmbed(guild, config.triggerChanId);
    const rows = buildCustomVoiceChannelButtons(guild.id, config.triggerChanId);
    return message.channel.send({ embeds: [embed], components: rows });
  }
};
