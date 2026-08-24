const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionsBitField,
  ChannelType
} = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const { createDynamicBox } = require('../utils/boxBuilder');
const emojis = require('../utils/emojis');

// In-Memory store for active server lockdowns & previous permissions backup
const activeLockdowns = new Map(); // guildId -> { timestamp, lockedBy, channelPerms: Map(channelId -> map) }

module.exports = {
  name: 'lockdown',
  description: 'Emergency Server & Channel Lockdown Control Suite (Lockdown, Unlockdown, Single Channel Lock & User Quarantine)',
  aliases: ['unlockdown', 'serverlock', 'serverunlock'],

  activeLockdowns,

  async execute(message, args) {
    const rawFirstWord = message.content.trim().split(/ +/)[0] || '';
    const invokedName = rawFirstWord.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();
    const guild = message.guild;
    const author = message.author;

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // Permission Check: Administrator or Server Owner
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && guild.ownerId !== author.id) {
      return message.reply(`${emojis.WARNING} You need **Administrator** permission or **Server Owner** status to manage Server Lockdown.`);
    }

    if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return message.reply(`${emojis.WARNING} I need **Manage Channels** permission to execute Lockdown!`);
    }

    // ━━━━━ 1. UNLOCKDOWN (.unlockdown or .lockdown off / disable / unlock) ━━━━━
    if (invokedName === 'unlockdown' || invokedName === 'serverunlock' || (args[0] && ['off', 'disable', 'unlock', 'stop'].includes(args[0].toLowerCase()))) {
      const lockData = activeLockdowns.get(guild.id);
      const everyoneRole = guild.roles.everyone;

      const statusMsg = await message.channel.send(`${emojis.SPARKLES || '⚡'} **Initiating Server Unlockdown...** Restoring channel permissions...`);

      let unlockedCount = 0;
      const channels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText || c.type === ChannelType.GuildVoice || c.type === ChannelType.GuildAnnouncement);

      for (const [id, ch] of channels) {
        try {
          if (lockData && lockData.channelPerms && lockData.channelPerms.has(id)) {
            // Restore previous saved overwrites
            const prevPerms = lockData.channelPerms.get(id);
            await ch.permissionOverwrites.edit(everyoneRole, prevPerms).catch(() => {});
          } else {
            // Default restore: allow SendMessages and Connect for @everyone
            await ch.permissionOverwrites.edit(everyoneRole, {
              SendMessages: null,
              SendMessagesInThreads: null,
              CreatePublicThreads: null,
              CreatePrivateThreads: null,
              Connect: null
            }).catch(() => {});
          }
          unlockedCount++;
        } catch (e) {}
      }

      activeLockdowns.delete(guild.id);

      const box = createDynamicBox('SERVER UNLOCKDOWN COMPLETE', [
        { key: 'Status', value: 'NORMAL [OK]' },
        { key: 'Channels', value: unlockedCount + ' restored' },
        { key: 'Unlocked By', value: author.username }
      ]);

      const embed = createStyledEmbed({
        title: `🔓 SERVER UNLOCKDOWN COMPLETED`,
        subtitle: `Normal operations restored for ${guild.name}`,
        description:
          `Emergency lockdown has been **LIFTED** by <@${author.id}>!\n\n` +
          '```\n' + box + '\n```\n' +
          `• All text channels unlocked for member participation.\n` +
          `• Voice channel connection rights restored to standard permissions.`,
        requestedBy: author,
        clientUser
      });

      await statusMsg.delete().catch(() => {});
      return message.channel.send({ embeds: [embed] });
    }

    // ━━━━━ 2. EMERGENCY LOCKDOWN (.lockdown [reason]) ━━━━━
    const reason = args.join(' ') || 'Emergency Lockdown Triggered';
    const everyoneRole = guild.roles.everyone;

    const statusMsg = await message.channel.send(`🚨 **INITIATING EMERGENCY SERVER LOCKDOWN...** Locking all text & voice channels...`);

    const channelPermsBackup = new Map();
    let lockedCount = 0;
    const channels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText || c.type === ChannelType.GuildVoice || c.type === ChannelType.GuildAnnouncement);

    for (const [id, ch] of channels) {
      try {
        // Backup previous @everyone permissions before locking
        const everyoneOverwrite = ch.permissionOverwrites.cache.get(everyoneRole.id);
        if (everyoneOverwrite) {
          channelPermsBackup.set(id, {
            SendMessages: everyoneOverwrite.allow.has(PermissionsBitField.Flags.SendMessages) ? true : everyoneOverwrite.deny.has(PermissionsBitField.Flags.SendMessages) ? false : null,
            Connect: everyoneOverwrite.allow.has(PermissionsBitField.Flags.Connect) ? true : everyoneOverwrite.deny.has(PermissionsBitField.Flags.Connect) ? false : null
          });
        }

        // Apply strict lockdown overwrites on @everyone
        await ch.permissionOverwrites.edit(everyoneRole, {
          SendMessages: false,
          SendMessagesInThreads: false,
          CreatePublicThreads: false,
          CreatePrivateThreads: false,
          AddReactions: false,
          Connect: false
        }).catch(() => {});

        lockedCount++;
      } catch (e) {}
    }

    activeLockdowns.set(guild.id, {
      timestamp: Date.now(),
      lockedBy: author.id,
      channelPerms: channelPermsBackup
    });

    const box = createDynamicBox('SERVER LOCKDOWN ACTIVE', [
      { key: 'Status', value: 'LOCKED [ALERT]' },
      { key: 'Channels', value: lockedCount + ' locked' },
      { key: 'Reason', value: reason.length > 25 ? reason.slice(0, 22) + '...' : reason },
      { key: 'Locked By', value: author.username }
    ]);

    const embed = createStyledEmbed({
      title: `🚨 EMERGENCY SERVER LOCKDOWN ACTIVATED`,
      subtitle: `Shinobi Security Shield Engaged for ${guild.name}`,
      description:
        `⚠️ **CRITICAL SECURITY ALERT:** Server lockdown has been engaged by <@${author.id}>!\n\n` +
        '```\n' + box + '\n```\n\n' +
        `• **Reason:** \`${reason}\`\n` +
        `• **Text Channels:** All chat participation & thread creation disabled.\n` +
        `• **Voice Channels:** Voice channel connection disabled.\n\n` +
        `💡 *Use \`.unlockdown\` or \`.lockdown off\` to lift lockdown when situation is secured.*`,
      requestedBy: author,
      clientUser
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('lockdown_unlock')
        .setLabel('Lift Lockdown')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🔓')
    );

    await statusMsg.delete().catch(() => {});
    return message.channel.send({ embeds: [embed], components: [row] });
  }
};
