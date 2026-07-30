const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
  EmbedBuilder
} = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const { createDynamicBox } = require('../utils/boxBuilder');
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
 * Builds the Custom Voice Channels deployment embed packaged inside a monospaced box container.
 */
function buildCustomVoiceChannelsEmbed(guild, triggerChanId = null) {
  const triggerMention = triggerChanId ? `<#${triggerChanId}>` : '`🔊 ✨ 「 Join to Create 」`';

  const perkBox = createDynamicBox('PERKS COMPARISON', [
    'Member  : Size Max 5',
    'Member  : Permit Max 5',
    'Member  : Ban Max 5',
    'Member  : Lock & Unlock',
    'Booster : Full Access',
    'Booster : Unlimited Size',
    'Booster : Unlimited Permit',
    'Booster : Rename Channel'
  ]);

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`Custom Voice Channels`)
    .setDescription(
      `Looking to escape from public calls? Create your own private channel and have control over every aspect of it.\n\n` +
      `**ℹ️ How to Create a Channel:**\n` +
      `**1️⃣ Join** ${triggerMention}\n` +
      `**2️⃣ Wait** *patiently* for channel to be created\n` +
      `**3️⃣ Type** \`.vc help\` in your channel to edit settings\n\n` +
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
 * Builds the Voice Help embed packaged inside a monospaced box container without thumbnail.
 */
function buildVoiceHelpEmbed(member) {
  const user = member.user;

  const helpBox = createDynamicBox('VOICE COMMANDS', [
    'info     : View VC settings',
    'name     : Rename channel',
    'size     : Set member limit',
    'lock     : Make VC private',
    'unlock   : Make VC public',
    'ghost    : Hide VC in sidebar',
    'unghost  : Reveal VC in sidebar',
    'claim    : Claim empty VC',
    'transfer : Transfer ownership',
    'permit   : Allow user join',
    'unpermit : Revoke user join',
    'kick     : Disconnect member',
    'ban      : Ban member from VC',
    'unban    : Unban member',
    'activity : Start VC activity'
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
