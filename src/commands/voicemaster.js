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
 * Builds the Custom Voice Channels deployment embed matching Screenshot 2.
 */
function buildCustomVoiceChannelsEmbed(guild, triggerChanId = null) {
  const triggerMention = triggerChanId ? `<#${triggerChanId}>` : '`🔊 ✨ 「 Join to Create 」`';

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`Custom Voice Channels`)
    .setDescription(
      `Looking to escape from the public calls? Create your own private channel and have control over every aspect of it\n\n` +
      `**ℹ️ How to create a channel**\n` +
      `**1️⃣ Join** ${triggerMention}\n` +
      `**2️⃣ Wait** *patiently* for the channel to be created\n` +
      `**3️⃣ Type** \`.vc help\` in your channel to customize\n\n` +
      `**Member Perks** ─── **Donor Perks (Full Access)**\n` +
      `❌ Channel Name ─── ✔️ Channel Name\n` +
      `✔️ Channel Size **[Max 5]** ─── ✔️ Channel Size **[No Limit]**\n` +
      `✔️ Permit Users **[Max 5]** ─── ✔️ Permit Users **[No Limit]**\n` +
      `✔️ Ban Users **[Max 5]** ─── ✔️ Ban Users **[No Limit]**\n` +
      `✔️ Lock/Unlock Channel ─── ✔️ Lock/Unlock Channel\n` +
      `✔️ Kick/Disconnect users ─── ✔️ Kick/Disconnect Users`
    )
    .setThumbnail('https://cdn.discordapp.com/emojis/1530942654530064394.gif')
    .setImage('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80')
    .setFooter({ text: `${guild.name} Custom Voice Calls`, iconURL: guild.iconURL({ dynamic: true }) || undefined });

  return embed;
}

/**
 * Builds Link Buttons matching Screenshot 2 (No control buttons, Support Server Link button).
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
 * Builds the Voice Help embed matching Screenshot 1 when .vc help is ran.
 */
function buildVoiceHelpEmbed(member) {
  const user = member.user;

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setAuthor({ name: 'Voice Help', iconURL: user.displayAvatarURL({ dynamic: true }) })
    .setTitle('Commands')
    .setDescription(
      `• \`.vc info\` \| View your channel settings\n` +
      `• \`.vc name <name>\` \| Rename your channel\n` +
      `• \`.vc size <amount/unlimited>\` \| Set your channel size\n` +
      `• \`.vc lock\` \| Make your channel private\n` +
      `• \`.vc unlock\` \| Make your channel public\n` +
      `• \`.vc permit <user>\` \| Allow a specific user to join\n` +
      `• \`.vc unpermit <user>\` \| Remove a user from the allowed list\n` +
      `• \`.vc kick <user>\` \| Disconnect a user from your channel\n` +
      `• \`.vc ban <user>\` \| Ban a user from your channel\n` +
      `• \`.vc unban <user>\` \| Unban a user from your channel`
    )
    .setThumbnail('https://cdn.discordapp.com/emojis/1530942654530064394.gif')
    .setFooter({ text: `Requested by ${user.tag}`, iconURL: user.displayAvatarURL({ dynamic: true }) });

  return embed;
}

/**
 * Builds the Channel Created notification embed matching Screenshot 1 when member joins Join to Create.
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
