const { createStyledEmbed } = require('../utils/embedBuilder');
const { createDynamicBox } = require('../utils/boxBuilder');
const db = require('../database/db');
const emojis = require('../utils/emojis');
const { PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'singlereaction',
  description: 'Configure single-reaction mode & auto-reactions for a channel',
  aliases: [],

  async execute(message, args) {
    const guild = message.guild;
    const author = message.author;
    const sub = args[0]?.toLowerCase();

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // Permission check: Manage Messages or Manage Channels
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels) &&
        !message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return message.reply(`${emojis.WARNING} You need **Manage Channels** or **Manage Messages** permission to configure Single Reaction Mode.`);
    }

    if (!sub || !['enable', 'disable', 'status', 'on', 'off', 'list'].includes(sub)) {
      const boxCmds = createDynamicBox('SINGLE REACTION COMMANDS', [
        '.sr enable #channel <emoji> [#log-channel]',
        '.sr disable #channel',
        '.sr status'
      ]);

      const embed = createStyledEmbed({
        title: `${emojis.AN_ROLE || '⚙️'} Single Reaction Mode Hub`,
        subtitle: `Enforce One Active Reaction & Auto-React Per Channel`,
        description:
          `**What is Single Reaction Mode?**\n` +
          `• Auto-reacts to every new message posted in a target channel with your specified emoji.\n` +
          `• **Enforces 1 Reaction per User:** If a user adds an extra reaction or tries to vote multiple times, their extra reaction is automatically stripped!\n` +
          `• Great for voting rounds, PFP contests, media showcase & announcement channels.\n\n` +
          '```\n' + boxCmds + '\n```',
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // ENABLE / ON
    if (['enable', 'on', 'active'].includes(sub)) {
      const channels = Array.from(message.mentions.channels.values());
      const targetChannel = channels[0];
      const logChannel = channels[1] || null;

      // Extract reaction emoji (arg that is not a channel mention)
      const nonMentionArgs = args.slice(1).filter(a => !a.match(/^<#\d+>$/));
      const rawEmoji = nonMentionArgs[0];

      if (!targetChannel) {
        return message.reply(`${emojis.WARNING} Please mention a channel!\nUsage: \`.sr enable #channel <emoji> [#log-channel]\``);
      }

      if (!rawEmoji) {
        return message.reply(`${emojis.WARNING} Please provide the reaction emoji!\nUsage: \`.sr enable #channel <emoji> [#log-channel]\``);
      }

      // Validate emoji
      const reactionEmoji = emojis.resolveEmojiForReaction ? emojis.resolveEmojiForReaction(message.client, guild, rawEmoji) : rawEmoji;
      if (!reactionEmoji) {
        return message.reply(`${emojis.WARNING} Could not resolve emoji **${rawEmoji}**. Please use a standard emoji (e.g. 🗳️, 👍) or custom emoji from this server.`);
      }

      const logChanId = logChannel ? logChannel.id : null;
      db.addReactionChannel(guild.id, targetChannel.id, rawEmoji, logChanId);

      const boxConfig = createDynamicBox('SINGLE REACTION CONFIG', [
        { key: 'Target Channel', value: '#' + targetChannel.name },
        { key: 'Auto-React Emoji', value: rawEmoji },
        { key: 'Reaction Log', value: logChannel ? '#' + logChannel.name : 'Not set' },
        { key: 'Single Vote Mode', value: 'ACTIVE [OK]' }
      ]);

      const embed = createStyledEmbed({
        title: `${emojis.SUCCESS} Single Reaction Mode Enabled!`,
        subtitle: `Configured for #${targetChannel.name}`,
        description:
          `Every message in ${targetChannel} will now be auto-reacted with ${rawEmoji}.\n` +
          `Each user is restricted to **1 reaction** — duplicate votes will be stripped automatically!\n\n` +
          '```\n' + boxConfig + '\n```',
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // DISABLE / OFF
    if (['disable', 'off'].includes(sub)) {
      const targetChannel = message.mentions.channels.first() || message.channel;
      const existing = db.getReactionChannel(guild.id, targetChannel.id);

      if (!existing) {
        return message.reply(`${emojis.WARNING} Single Reaction Mode is not active in ${targetChannel}.`);
      }

      db.removeReactionChannel(guild.id, targetChannel.id);

      const embed = createStyledEmbed({
        title: `${emojis.REMOVE} Single Reaction Mode Disabled`,
        description: `Disabled Single Reaction Mode for ${targetChannel}. The bot will no longer auto-react or enforce single reactions in that channel.`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // STATUS / LIST
    if (['status', 'list'].includes(sub)) {
      const activeChannels = db.getAllReactionChannels(guild.id);

      if (activeChannels.length === 0) {
        const embed = createStyledEmbed({
          title: `${emojis.INFO} Single Reaction Mode Status`,
          description: `No channels currently have Single Reaction Mode enabled.\n\nUse \`.sr enable #channel <emoji>\` to enable it!`,
          requestedBy: author,
          clientUser
        });
        return message.channel.send({ embeds: [embed] });
      }

      const lines = activeChannels.map((ch, idx) => {
        const logStr = ch.log_channel_id ? `<#${ch.log_channel_id}>` : '`Not Set`';
        return `**${idx + 1}.** <#${ch.channel_id}> — Emoji: ${ch.emoji} | Logs: ${logStr}`;
      }).join('\n');

      const embed = createStyledEmbed({
        title: `${emojis.AN_SHIELD || '🛡️'} Single Reaction Active Channels (${activeChannels.length})`,
        description: lines,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }
  }
};
