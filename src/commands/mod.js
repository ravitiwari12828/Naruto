const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const { PermissionsBitField } = require('discord.js');

function missingPerms(message, perm) {
  return message.reply(`${emojis.WARNING} You need the **${perm}** permission to use this command.`);
}
function botMissingPerms(message, perm) {
  return message.reply(`${emojis.WARNING} I need the **${perm}** permission to do that!`);
}

module.exports = {
  name: 'mod',
  description: 'Moderation commands: ban, kick, mute, purge, nuke, role & more.',
  aliases: [
    'ban', 'hackban', 'kick', 'mute', 'unmute',
    'nuke', 'purge', 'purgebots',
    'unban', 'unbanall',
    'role', 'rolemenu',
    'warn', 'warnings', 'clearwarns'
  ],

  async execute(message, args) {
    const invoked = message.content.slice(1).split(/ +/)[0].toLowerCase();
    const guild = message.guild;
    const author = message.member;

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // 15-Day Quarantine Probation Check
    const quarantineCmd = message.client.commands.get('quarantine');
    if (quarantineCmd && quarantineCmd.isMemberInQuarantine) {
      const qCheck = quarantineCmd.isMemberInQuarantine(message.member);
      if (qCheck.isQuarantined) {
        return message.reply(`🚨 **15-Day New Joiner Security Probation Active!**\nYou have been in this server for **${qCheck.daysJoined} days** (Requires **${qCheck.requiredDays} Days**). Moderation actions are restricted for new members/bots to prevent server nuking.`);
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🔨 BAN
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (invoked === 'ban') {
      if (!author.permissions.has(PermissionsBitField.Flags.BanMembers)) return missingPerms(message, 'Ban Members');
      if (!guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) return botMissingPerms(message, 'Ban Members');

      const target = message.mentions.members?.first();
      if (!target) return message.reply(`${emojis.WARNING} Please mention a user to ban.\nUsage: \`.ban @user [reason]\``);
      if (!target.bannable) return message.reply(`${emojis.WARNING} I cannot ban that user — they may have higher permissions.`);

      // Daily Quota Check
      const modLimitsCmd = message.client.commands.get('modlimits');
      if (modLimitsCmd && modLimitsCmd.checkAndIncrementModAction) {
        const quota = modLimitsCmd.checkAndIncrementModAction(guild.id, message.author.id, 'ban');
        if (!quota.allowed) {
          return message.reply(`🚨 **Daily Moderation Limit Reached!** You have used **${quota.current}/${quota.limit}** daily \`BAN\` actions. Your limit resets <t:${Math.floor(quota.resetAt / 1000)}:R>.`);
        }
      }

      const reason = args.slice(1).join(' ') || 'No reason provided.';
      await target.ban({ reason, deleteMessageSeconds: 86400 });

      const embed = createStyledEmbed({
        title: `🔨 User Banned`,
        description: `**${target.user.tag}** has been banished from the village!\n\n**Reason:** ${reason}`,
        requestedBy: message.author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🌐 HACKBAN (ban by ID)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (invoked === 'hackban') {
      if (!author.permissions.has(PermissionsBitField.Flags.BanMembers)) return missingPerms(message, 'Ban Members');
      if (!guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) return botMissingPerms(message, 'Ban Members');

      const userId = args[0];
      if (!userId || isNaN(userId)) return message.reply(`${emojis.WARNING} Please provide a valid User ID.\nUsage: \`.hackban <ID> [reason]\``);

      // Daily Quota Check
      const modLimitsCmd = message.client.commands.get('modlimits');
      if (modLimitsCmd && modLimitsCmd.checkAndIncrementModAction) {
        const quota = modLimitsCmd.checkAndIncrementModAction(guild.id, message.author.id, 'ban');
        if (!quota.allowed) {
          return message.reply(`🚨 **Daily Moderation Limit Reached!** You have used **${quota.current}/${quota.limit}** daily \`BAN\` actions. Your limit resets <t:${Math.floor(quota.resetAt / 1000)}:R>.`);
        }
      }

      const reason = args.slice(1).join(' ') || 'No reason provided.';
      await guild.members.ban(userId, { reason }).catch(err => {
        return message.reply(`${emojis.WARNING} Failed to ban user ID \`${userId}\`: ${err.message}`);
      });

      const embed = createStyledEmbed({
        title: `🔨 Hackban Executed`,
        description: `User ID **\`${userId}\`** has been pre-emptively banned.\n\n**Reason:** ${reason}`,
        requestedBy: message.author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 👢 KICK
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (invoked === 'kick') {
      if (!author.permissions.has(PermissionsBitField.Flags.KickMembers)) return missingPerms(message, 'Kick Members');
      if (!guild.members.me.permissions.has(PermissionsBitField.Flags.KickMembers)) return botMissingPerms(message, 'Kick Members');

      const target = message.mentions.members?.first();
      if (!target) return message.reply(`${emojis.WARNING} Usage: \`.kick @user [reason]\``);
      if (!target.kickable) return message.reply(`${emojis.WARNING} I cannot kick that user.`);

      const reason = args.slice(1).join(' ') || 'No reason provided.';
      await target.kick(reason);

      const embed = createStyledEmbed({
        title: `👢 User Kicked`,
        description: `**${target.user.tag}** has been sent flying out of the village!\n\n**Reason:** ${reason}`,
        requestedBy: message.author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🔇 MUTE (timeout 10 min default)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (invoked === 'mute') {
      if (!author.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return missingPerms(message, 'Timeout Members');
      if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return botMissingPerms(message, 'Timeout Members');

      const target = message.mentions.members?.first();
      if (!target) return message.reply(`${emojis.WARNING} Usage: \`.mute @user [duration: 1m/1h/1d] [reason]\``);

      const timeArg = args[1];
      const timeMap = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
      const match = timeArg?.match(/^(\d+)(s|m|h|d)$/i);
      const duration = match ? parseInt(match[1]) * timeMap[match[2].toLowerCase()] : 600000; // default 10 min
      const reason = (match ? args.slice(2) : args.slice(1)).join(' ') || 'No reason provided.';

      await target.timeout(duration, reason);

      const embed = createStyledEmbed({
        title: `🔇 User Muted`,
        description: `**${target.user.tag}** has been silenced!\n\n**Duration:** \`${timeArg || '10m'}\`\n**Reason:** ${reason}`,
        requestedBy: message.author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🔊 UNMUTE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (invoked === 'unmute') {
      if (!author.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return missingPerms(message, 'Timeout Members');

      const target = message.mentions.members?.first();
      if (!target) return message.reply(`${emojis.WARNING} Usage: \`.unmute @user\``);

      await target.timeout(null);

      const embed = createStyledEmbed({
        title: `🔊 User Unmuted`,
        description: `**${target.user.tag}** can speak again in the village!`,
        requestedBy: message.author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ✅ UNBAN
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (invoked === 'unban') {
      if (!author.permissions.has(PermissionsBitField.Flags.BanMembers)) return missingPerms(message, 'Ban Members');

      const userId = args[0]?.replace(/[<@!>]/g, '');
      if (!userId) return message.reply(`${emojis.WARNING} Usage: \`.unban <userID>\``);

      await guild.bans.remove(userId).catch(() => null);

      const embed = createStyledEmbed({
        title: `✅ User Unbanned`,
        description: `User ID \`${userId}\` has been pardoned and may return to the village.`,
        requestedBy: message.author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ✅ UNBAN ALL
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (invoked === 'unbanall') {
      if (!author.permissions.has(PermissionsBitField.Flags.BanMembers)) return missingPerms(message, 'Ban Members');
      if (!author.permissions.has(PermissionsBitField.Flags.Administrator)) return missingPerms(message, 'Administrator');

      const bans = await guild.bans.fetch();
      let count = 0;
      for (const [, ban] of bans) {
        await guild.bans.remove(ban.user.id).catch(() => {});
        count++;
      }

      const embed = createStyledEmbed({
        title: `✅ Mass Unban Complete`,
        description: `**${count}** banned user(s) have been pardoned from the village.`,
        requestedBy: message.author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🗑️ PURGE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (invoked === 'purge') {
      if (!author.permissions.has(PermissionsBitField.Flags.ManageMessages)) return missingPerms(message, 'Manage Messages');
      if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) return botMissingPerms(message, 'Manage Messages');

      const amount = parseInt(args[0]);
      if (!amount || amount < 1 || amount > 100) {
        return message.reply(`${emojis.WARNING} Usage: \`.purge <1-100>\``);
      }

      await message.delete().catch(() => {});
      const deleted = await message.channel.bulkDelete(amount, true).catch(() => null);

      const embed = createStyledEmbed({
        title: `🗑️ Messages Purged`,
        description: `**${deleted?.size || 0}** message(s) have been incinerated with Fire Style!`,
        requestedBy: message.author,
        clientUser
      });
      const reply = await message.channel.send({ embeds: [embed] });
      setTimeout(() => reply.delete().catch(() => {}), 4000);
      return;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🤖 PURGEBOTS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (invoked === 'purgebots') {
      if (!author.permissions.has(PermissionsBitField.Flags.ManageMessages)) return missingPerms(message, 'Manage Messages');

      const amount = parseInt(args[0]) || 50;
      const messages = await message.channel.messages.fetch({ limit: Math.min(amount, 100) });
      const botMessages = messages.filter(m => m.author.bot);
      await message.channel.bulkDelete(botMessages, true).catch(() => null);

      const embed = createStyledEmbed({
        title: `🤖 Bot Messages Purged`,
        description: `**${botMessages.size}** bot message(s) cleared from the channel.`,
        requestedBy: message.author,
        clientUser
      });
      const reply = await message.channel.send({ embeds: [embed] });
      setTimeout(() => reply.delete().catch(() => {}), 4000);
      return;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 💣 NUKE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (invoked === 'nuke') {
      if (!author.permissions.has(PermissionsBitField.Flags.ManageChannels)) return missingPerms(message, 'Manage Channels');
      if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) return botMissingPerms(message, 'Manage Channels');

      const channel = message.channel;
      const position = channel.position;
      const newChannel = await channel.clone({ reason: `Channel nuked by ${message.author.tag}` });
      await newChannel.setPosition(position);
      await channel.delete().catch(() => {});

      const embed = createStyledEmbed({
        title: `💣 CHANNEL NUKED`,
        subtitle: `Rasenshuriken — All messages obliterated!`,
        description: `This channel was nuked and recreated. All previous messages are gone.\n\n**Executed by:** ${message.author.tag}`,
        requestedBy: message.author,
        clientUser
      });
      return newChannel.send({ embeds: [embed] });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🎭 ROLE (add/remove)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (invoked === 'role') {
      if (!author.permissions.has(PermissionsBitField.Flags.ManageRoles)) return missingPerms(message, 'Manage Roles');
      if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) return botMissingPerms(message, 'Manage Roles');

      const target = message.mentions.members?.first();
      const roleMention = message.mentions.roles?.first();
      if (!target || !roleMention) {
        return message.reply(`${emojis.WARNING} Usage: \`.role @user @role\` — adds or removes the role.`);
      }

      if (target.roles.cache.has(roleMention.id)) {
        await target.roles.remove(roleMention);
        const embed = createStyledEmbed({
          title: `🎭 Role Removed`,
          description: `Removed **${roleMention.name}** from **${target.user.tag}**.`,
          requestedBy: message.author, clientUser
        });
        return message.channel.send({ embeds: [embed] });
      } else {
        await target.roles.add(roleMention);
        const embed = createStyledEmbed({
          title: `🎭 Role Added`,
          description: `Gave **${roleMention.name}** to **${target.user.tag}**.`,
          requestedBy: message.author, clientUser
        });
        return message.channel.send({ embeds: [embed] });
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📋 ROLEMENU (list all roles)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (invoked === 'rolemenu') {
      const roles = guild.roles.cache
        .filter(r => r.name !== '@everyone')
        .sort((a, b) => b.position - a.position)
        .map(r => `• ${r} — \`${r.members.size} members\``)
        .slice(0, 25);

      const embed = createStyledEmbed({
        title: `📋 Server Role List`,
        description: roles.join('\n') || '*No roles found.*',
        requestedBy: message.author,
        clientUser,
        footerText: `Total Roles: ${guild.roles.cache.size - 1}`
      });
      return message.channel.send({ embeds: [embed] });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📜 BAN LIST
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (invoked === 'list') {
      if (!author.permissions.has(PermissionsBitField.Flags.BanMembers)) return missingPerms(message, 'Ban Members');

      const bans = await guild.bans.fetch();
      if (bans.size === 0) return message.reply(`${emojis.WARNING} No users are currently banned.`);

      const lines = [...bans.values()].slice(0, 20).map(b =>
        `• **${b.user.tag}** (\`${b.user.id}\`) — *${b.reason || 'No reason'}*`
      );

      const embed = createStyledEmbed({
        title: `📜 Bingo Book — Banned Users`,
        description: lines.join('\n'),
        requestedBy: message.author,
        clientUser,
        footerText: `Total Bans: ${bans.size}`
      });
      return message.channel.send({ embeds: [embed] });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ⚠️ WARN
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (invoked === 'warn') {
      if (!author.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return missingPerms(message, 'Moderate Members');

      const target = message.mentions.members?.first();
      if (!target) return message.reply(`${emojis.WARNING} Usage: \`.warn @user [reason]\``);

      const reason = args.slice(1).join(' ') || 'No reason provided.';
      try {
        await target.user.send(`⚠️ You have been warned in **${guild.name}**.\n**Reason:** ${reason}`);
      } catch (e) { /* DMs closed */ }

      const embed = createStyledEmbed({
        title: `⚠️ User Warned`,
        description: `**${target.user.tag}** has received an official village warning.\n\n**Reason:** ${reason}`,
        requestedBy: message.author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Default: Mod Help
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const embed = createStyledEmbed({
      title: `${emojis.MOD} Moderation Commands`,
      description:
        `\`.ban @user [reason]\` — Ban a shinobi\n` +
        `\`.hackban <ID> [reason]\` — Ban by User ID\n` +
        `\`.kick @user [reason]\` — Kick a shinobi\n` +
        `\`.mute @user [time] [reason]\` — Timeout a member\n` +
        `\`.unmute @user\` — Remove timeout\n` +
        `\`.unban <ID>\` — Unban a user\n` +
        `\`.unbanall\` — Lift all bans\n` +
        `\`.purge <1-100>\` — Delete messages\n` +
        `\`.purgebots [amount]\` — Delete bot messages\n` +
        `\`.nuke\` — Clone + delete channel\n` +
        `\`.role @user @role\` — Add/remove role\n` +
        `\`.rolemenu\` — List all server roles\n` +
        `\`.list\` — View ban list\n` +
        `\`.warn @user [reason]\` — Warn a member`,
      requestedBy: message.author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
