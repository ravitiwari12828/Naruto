const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const db = require('../database/db');
const { PermissionsBitField } = require('discord.js');

const { dispatchLog } = require('../utils/logger');

function missingPerms(message, perm) {
  return message.reply(`${emojis.WARNING} You need the **${perm}** permission to use this command.`);
}
function botMissingPerms(message, perm) {
  return message.reply(`${emojis.WARNING} I need the **${perm}** permission to do that!`);
}

function recordAndLogCase(guild, { action, targetId, targetTag, executorId, executorTag, reason }) {
  const caseData = db.createCase(guild.id, {
    action,
    targetId,
    targetTag,
    executorId,
    executorTag,
    reason
  });

  const colors = {
    BAN: 0xED4245,
    HACKBAN: 0xED4245,
    KICK: 0xFEE75C,
    MUTE: 0xE91E63,
    UNMUTE: 0x57F287,
    UNBAN: 0x57F287,
    WARN: 0xFEE75C,
    UNWARN: 0x57F287,
    CLEARWARNS: 0x57F287
  };

  const color = colors[action.toUpperCase()] || 0x7E0808;

  dispatchLog(guild, 'modcases', {
    color,
    title: `🛡️ Case #${caseData.caseId} | ${caseData.action}`,
    description:
      `• **Target:** <@${caseData.targetId}> (\`${caseData.targetTag}\`)\n` +
      `• **Moderator:** <@${caseData.executorId}> (\`${caseData.executorTag}\`)\n` +
      `• **Reason:** ${caseData.reason}`,
    footer: `Case #${caseData.caseId} • Server Audit Logs`
  });

  return caseData;
}

module.exports = {
  name: 'mod',
  description: 'Moderation Suite: ban, hackban, kick, mute, unmute, unban, unbanall, purge, purgebots, nuke, role, rolemenu, list, warn, case, cases, modlogs',
  aliases: [
    'ban', 'hackban', 'kick', 'mute', 'unmute',
    'nuke', 'purge', 'purgebots',
    'unban', 'unbanall',
    'role', 'rolemenu', 'list',
    'warn', 'unwarn', 'rmwarn', 'warnremove', 'warnings', 'clearwarns',
    'case', 'cases', 'modlogs', 'caseinfo'
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

    // 1. 🔨 BAN
    if (invoked === 'ban') {
      if (!author.permissions.has(PermissionsBitField.Flags.BanMembers)) return missingPerms(message, 'Ban Members');
      if (!guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) return botMissingPerms(message, 'Ban Members');

      const target = message.mentions.members?.first();
      if (!target) return message.reply(`${emojis.WARNING} Please mention a user to ban.\nUsage: \`.ban @user [reason]\``);
      if (!target.bannable) return message.reply(`${emojis.WARNING} I cannot ban that user — they may have higher permissions.`);

      const modLimitsCmd = message.client.commands.get('modlimits');
      if (modLimitsCmd && modLimitsCmd.checkAndIncrementModAction) {
        const quota = modLimitsCmd.checkAndIncrementModAction(guild.id, message.author.id, 'ban');
        if (!quota.allowed) {
          return message.reply(`🚨 **Daily Moderation Limit Reached!** You have used **${quota.current}/${quota.limit}** daily \`BAN\` actions. Your limit resets <t:${Math.floor(quota.resetAt / 1000)}:R>.`);
        }
      }

      const reason = args.slice(1).join(' ') || 'No reason provided.';
      await target.ban({ reason, deleteMessageSeconds: 86400 });

      const cData = recordAndLogCase(guild, {
        action: 'BAN',
        targetId: target.id,
        targetTag: target.user.tag,
        executorId: message.author.id,
        executorTag: message.author.tag,
        reason
      });

      const embed = createStyledEmbed({
        title: `🔨 User Banned [Case #${cData.caseId}]`,
        description: `**${target.user.tag}** has been banished from the village!\n\n**Case ID:** \`#${cData.caseId}\`\n**Reason:** ${reason}`,
        requestedBy: message.author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 2. 🌐 HACKBAN (ban by ID)
    if (invoked === 'hackban') {
      if (!author.permissions.has(PermissionsBitField.Flags.BanMembers)) return missingPerms(message, 'Ban Members');
      if (!guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) return botMissingPerms(message, 'Ban Members');

      const userId = args[0]?.replace(/[<@!>]/g, '');
      if (!userId || isNaN(userId)) return message.reply(`${emojis.WARNING} Please provide a valid User ID.\nUsage: \`.hackban <ID> [reason]\``);

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

      const cData = recordAndLogCase(guild, {
        action: 'HACKBAN',
        targetId: userId,
        targetTag: `User ID: ${userId}`,
        executorId: message.author.id,
        executorTag: message.author.tag,
        reason
      });

      const embed = createStyledEmbed({
        title: `🔨 Hackban Executed [Case #${cData.caseId}]`,
        description: `User ID **\`${userId}\`** has been pre-emptively banned.\n\n**Case ID:** \`#${cData.caseId}\`\n**Reason:** ${reason}`,
        requestedBy: message.author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 3. 👢 KICK
    if (invoked === 'kick') {
      if (!author.permissions.has(PermissionsBitField.Flags.KickMembers)) return missingPerms(message, 'Kick Members');
      if (!guild.members.me.permissions.has(PermissionsBitField.Flags.KickMembers)) return botMissingPerms(message, 'Kick Members');

      const target = message.mentions.members?.first();
      if (!target) return message.reply(`${emojis.WARNING} Usage: \`.kick @user [reason]\``);
      if (!target.kickable) return message.reply(`${emojis.WARNING} I cannot kick that user.`);

      const reason = args.slice(1).join(' ') || 'No reason provided.';
      await target.kick(reason);

      const cData = recordAndLogCase(guild, {
        action: 'KICK',
        targetId: target.id,
        targetTag: target.user.tag,
        executorId: message.author.id,
        executorTag: message.author.tag,
        reason
      });

      const embed = createStyledEmbed({
        title: `👢 User Kicked [Case #${cData.caseId}]`,
        description: `**${target.user.tag}** has been sent flying out of the village!\n\n**Case ID:** \`#${cData.caseId}\`\n**Reason:** ${reason}`,
        requestedBy: message.author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 4. 🔇 MUTE (timeout 10 min default)
    if (invoked === 'mute') {
      if (!author.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return missingPerms(message, 'Timeout Members');
      if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return botMissingPerms(message, 'Timeout Members');

      const target = message.mentions.members?.first();
      if (!target) return message.reply(`${emojis.WARNING} Usage: \`.mute @user [duration: 1m/1h/1d] [reason]\``);

      const timeArg = args[1];
      const timeMap = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
      const match = timeArg?.match(/^(\d+)(s|m|h|d)$/i);
      const duration = match ? parseInt(match[1]) * timeMap[match[2].toLowerCase()] : 600000;
      const reason = (match ? args.slice(2) : args.slice(1)).join(' ') || 'No reason provided.';

      await target.timeout(duration, reason);

      const cData = recordAndLogCase(guild, {
        action: 'MUTE',
        targetId: target.id,
        targetTag: target.user.tag,
        executorId: message.author.id,
        executorTag: message.author.tag,
        reason: `[${timeArg || '10m'}] ${reason}`
      });

      const embed = createStyledEmbed({
        title: `🔇 User Muted [Case #${cData.caseId}]`,
        description: `**${target.user.tag}** has been silenced!\n\n**Case ID:** \`#${cData.caseId}\`\n**Duration:** \`${timeArg || '10m'}\`\n**Reason:** ${reason}`,
        requestedBy: message.author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 5. 🔊 UNMUTE
    if (invoked === 'unmute') {
      if (!author.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return missingPerms(message, 'Timeout Members');

      const target = message.mentions.members?.first();
      if (!target) return message.reply(`${emojis.WARNING} Usage: \`.unmute @user\``);

      await target.timeout(null);

      const cData = recordAndLogCase(guild, {
        action: 'UNMUTE',
        targetId: target.id,
        targetTag: target.user.tag,
        executorId: message.author.id,
        executorTag: message.author.tag,
        reason: 'Manual Unmute'
      });

      const embed = createStyledEmbed({
        title: `🔊 User Unmuted [Case #${cData.caseId}]`,
        description: `**${target.user.tag}** can speak again in the village!`,
        requestedBy: message.author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 6. ✅ UNBAN
    if (invoked === 'unban') {
      if (!author.permissions.has(PermissionsBitField.Flags.BanMembers)) return missingPerms(message, 'Ban Members');

      const userId = args[0]?.replace(/[<@!>]/g, '');
      if (!userId) return message.reply(`${emojis.WARNING} Usage: \`.unban <userID>\``);

      await guild.bans.remove(userId).catch(() => null);

      const cData = recordAndLogCase(guild, {
        action: 'UNBAN',
        targetId: userId,
        targetTag: `User ID: ${userId}`,
        executorId: message.author.id,
        executorTag: message.author.tag,
        reason: 'Manual Unban'
      });

      const embed = createStyledEmbed({
        title: `✅ User Unbanned [Case #${cData.caseId}]`,
        description: `User ID \`${userId}\` has been pardoned and may return to the village.`,
        requestedBy: message.author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 7. ✅ UNBAN ALL
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

    // 8. 🗑️ PURGE
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

    // 9. 🤖 PURGEBOTS
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

    // 10. 💣 NUKE
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

    // 11. 🎭 ROLE (add/remove)
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

    // 12. 📋 ROLEMENU (list all roles)
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

    // 13. 📜 LIST (bans, bots, admins, mutes)
    if (invoked === 'list') {
      const sub = args[0]?.toLowerCase();

      if (sub === 'bots') {
        const bots = guild.members.cache.filter(m => m.user.bot);
        const lines = [...bots.values()].slice(0, 25).map(b => `• <@${b.id}> (\`${b.user.tag}\`)`);
        const embed = createStyledEmbed({
          title: `🤖 Server Bots List`,
          description: lines.join('\n') || '*No bots in server.*',
          requestedBy: message.author, clientUser,
          footerText: `Total Bots: ${bots.size}`
        });
        return message.channel.send({ embeds: [embed] });
      }

      if (sub === 'admins' || sub === 'staff') {
        const admins = guild.members.cache.filter(m => m.permissions.has(PermissionsBitField.Flags.Administrator) && !m.user.bot);
        const lines = [...admins.values()].slice(0, 25).map(a => `• <@${a.id}> (\`${a.user.tag}\`)`);
        const embed = createStyledEmbed({
          title: `🛡️ Server Administrators List`,
          description: lines.join('\n') || '*No administrators found.*',
          requestedBy: message.author, clientUser,
          footerText: `Total Admins: ${admins.size}`
        });
        return message.channel.send({ embeds: [embed] });
      }

      if (sub === 'mutes' || sub === 'muted') {
        const muted = guild.members.cache.filter(m => m.communicationDisabledUntilTimestamp && m.communicationDisabledUntilTimestamp > Date.now());
        const lines = [...muted.values()].slice(0, 25).map(m => `• <@${m.id}> — Until <t:${Math.floor(m.communicationDisabledUntilTimestamp / 1000)}:R>`);
        const embed = createStyledEmbed({
          title: `🔇 Muted / Timed Out Members`,
          description: lines.join('\n') || '*No members currently muted.*',
          requestedBy: message.author, clientUser,
          footerText: `Total Muted: ${muted.size}`
        });
        return message.channel.send({ embeds: [embed] });
      }

      // Default to bans list
      const bans = await guild.bans.fetch().catch(() => null);
      if (!bans || bans.size === 0) return message.reply(`${emojis.WARNING} No users are currently banned.`);

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

    // 14. ⚠️ WARN / UNWARN / CLEARWARNS
    if (['warn', 'unwarn', 'rmwarn', 'warnremove', 'clearwarns'].includes(invoked)) {
      if (!author.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return missingPerms(message, 'Moderate Members');

      const isRemove = invoked === 'unwarn' || invoked === 'rmwarn' || invoked === 'warnremove' || (invoked === 'warn' && args[0] === 'remove');
      const isClear = invoked === 'clearwarns' || (invoked === 'warn' && args[0] === 'clear');

      // Check if an explicit Case ID was passed for unwarn (e.g. .unwarn 5 or .unwarn #5)
      let caseIdArg = null;
      if (isRemove) {
        for (const arg of args) {
          const cleanArg = arg.replace('#', '');
          if (!isNaN(cleanArg) && cleanArg.length < 10 && parseInt(cleanArg) > 0) {
            caseIdArg = parseInt(cleanArg);
            break;
          }
        }
      }

      if (isRemove && caseIdArg) {
        const c = db.getCase(guild.id, caseIdArg);
        if (!c) return message.reply(`${emojis.WARNING} Case **#${caseIdArg}** not found in this server.`);
        if (c.action !== 'WARN') {
          return message.reply(`${emojis.WARNING} Case **#${caseIdArg}** is a **${c.action}** case, not a **WARN** case.`);
        }

        const targetUserId = c.targetId;
        const userObj = db.getUser(targetUserId);
        const newWarns = Math.max(0, (userObj.warns || 0) - 1);
        db.updateUser(targetUserId, u => { u.warns = newWarns; });

        const cData = recordAndLogCase(guild, {
          action: 'UNWARN',
          targetId: targetUserId,
          targetTag: c.targetTag,
          executorId: message.author.id,
          executorTag: message.author.tag,
          reason: `Revoked Warning Case #${caseIdArg}`
        });

        const embed = createStyledEmbed({
          title: `✅ Warning Case #${caseIdArg} Revoked [Case #${cData.caseId}]`,
          description:
            `• **Revoked Case:** \`#${caseIdArg}\`\n` +
            `• **Member:** <@${targetUserId}> (\`${c.targetTag}\`)\n` +
            `• **Remaining Warnings:** \`${newWarns}\`\n` +
            `• **Reason:** ${c.reason}`,
          requestedBy: message.author,
          clientUser
        });
        return message.channel.send({ embeds: [embed] });
      }

      const targetIndex = (invoked === 'warn' && (args[0] === 'remove' || args[0] === 'clear')) ? 1 : 0;
      const target = message.mentions.members?.first() || guild.members.cache.get(args[targetIndex]);

      if (!target) {
        return message.reply(
          `${emojis.WARNING} Usage:\n` +
          `• \`.warn @user [reason]\` — Add warning\n` +
          `• \`.unwarn <caseID>\` — Remove warning by Case ID (e.g. \`.unwarn 5\`)\n` +
          `• \`.unwarn @user\` — Remove latest warning for member\n` +
          `• \`.clearwarns @user\` — Clear all warnings`
        );
      }

      const userObj = db.getUser(target.id);
      const currentWarns = userObj.warns || 0;

      if (isClear) {
        db.updateUser(target.id, u => { u.warns = 0; });
        const cData = recordAndLogCase(guild, {
          action: 'CLEARWARNS',
          targetId: target.id,
          targetTag: target.user.tag,
          executorId: message.author.id,
          executorTag: message.author.tag,
          reason: `Cleared all warnings (Previous: ${currentWarns})`
        });

        const embed = createStyledEmbed({
          title: `🧹 All Warnings Cleared [Case #${cData.caseId}]`,
          description: `**Member:** <@${target.id}> (\`${target.user.tag}\`)\n**Case ID:** \`#${cData.caseId}\`\n**Cleared Warnings:** \`${currentWarns}\` → \`0\``,
          requestedBy: message.author,
          clientUser
        });
        return message.channel.send({ embeds: [embed] });
      }

      if (isRemove) {
        if (currentWarns <= 0) return message.reply(`${emojis.INFO} <@${target.id}> has 0 active warnings.`);
        const newWarns = currentWarns - 1;
        db.updateUser(target.id, u => { u.warns = newWarns; });

        const reason = args.slice(targetIndex + 1).join(' ') || 'Warning removed by staff.';
        const cData = recordAndLogCase(guild, {
          action: 'UNWARN',
          targetId: target.id,
          targetTag: target.user.tag,
          executorId: message.author.id,
          executorTag: message.author.tag,
          reason
        });

        const embed = createStyledEmbed({
          title: `✅ Warning Removed [Case #${cData.caseId}]`,
          description: `**Member:** <@${target.id}> (\`${target.user.tag}\`)\n**Case ID:** \`#${cData.caseId}\`\n**Remaining Warnings:** \`${newWarns}\`\n**Reason:** ${reason}`,
          requestedBy: message.author,
          clientUser
        });
        return message.channel.send({ embeds: [embed] });
      }

      // Standard .warn @user
      const reason = args.slice(1).join(' ') || 'No reason provided.';
      const warnCount = currentWarns + 1;
      db.updateUser(target.id, u => { u.warns = warnCount; });

      const cData = recordAndLogCase(guild, {
        action: 'WARN',
        targetId: target.id,
        targetTag: target.user.tag,
        executorId: message.author.id,
        executorTag: message.author.tag,
        reason: `[Warning #${warnCount}] ${reason}`
      });

      try {
        await target.user.send(`⚠️ You have received Warning #${warnCount} [Case #${cData.caseId}] in **${guild.name}**.\n**Reason:** ${reason}`);
      } catch (e) {}

      const embed = createStyledEmbed({
        title: `⚠️ User Warned [Case #${cData.caseId}]`,
        description: `**Member:** <@${target.id}> (\`${target.user.tag}\`)\n**Case ID:** \`#${cData.caseId}\`\n**Warning Count:** \`${warnCount} warning(s)\`\n**Reason:** ${reason}`,
        requestedBy: message.author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 15. 🛡️ CASE / CASES / MODLOGS (.case <id> | .cases [@user])
    if (['case', 'cases', 'modlogs', 'caseinfo'].includes(invoked)) {
      const targetUser = message.mentions.users.first();
      const caseIdInput = args[0] && !isNaN(args[0]) ? parseInt(args[0]) : null;

      if (caseIdInput) {
        const c = db.getCase(guild.id, caseIdInput);
        if (!c) return message.reply(`${emojis.WARNING} Case **#${caseIdInput}** not found in this server.`);

        const embed = createStyledEmbed({
          title: `🛡️ Moderation Case #${c.caseId}`,
          description:
            `• **Action:** \`${c.action}\`\n` +
            `• **Target:** <@${c.targetId}> (\`${c.targetTag}\`)\n` +
            `• **Moderator:** <@${c.executorId}> (\`${c.executorTag}\`)\n` +
            `• **Reason:** ${c.reason}\n` +
            `• **Date:** <t:${Math.floor(c.timestamp / 1000)}:F> (<t:${Math.floor(c.timestamp / 1000)}:R>)`,
          requestedBy: message.author,
          clientUser
        });
        return message.channel.send({ embeds: [embed] });
      }

      const userId = targetUser ? targetUser.id : (args[0] && args[0].length > 10 ? args[0] : null);
      if (userId) {
        const userCases = db.getUserCases(guild.id, userId);
        if (userCases.length === 0) return message.reply(`${emojis.INFO} No moderation cases found for <@${userId}>.`);

        const lines = userCases.map(c => `\`Case #${c.caseId}\` | **${c.action}** — ${c.reason.length > 40 ? c.reason.slice(0, 40) + '...' : c.reason} (By <@${c.executorId}>)`);
        const embed = createStyledEmbed({
          title: `🛡️ Cases for User`,
          description: lines.join('\n'),
          requestedBy: message.author,
          clientUser,
          footerText: `Total Cases: ${userCases.length}`
        });
        return message.channel.send({ embeds: [embed] });
      }

      const allCases = db.getCases(guild.id);
      if (allCases.length === 0) return message.reply(`${emojis.INFO} No moderation cases recorded yet.`);

      const recentCases = allCases.slice(-15).reverse();
      const lines = recentCases.map(c => `\`Case #${c.caseId}\` | **${c.action}** on <@${c.targetId}> — *${c.reason.length > 30 ? c.reason.slice(0, 30) + '...' : c.reason}*`);

      const embed = createStyledEmbed({
        title: `🛡️ Server Moderation Cases`,
        description: lines.join('\n'),
        requestedBy: message.author,
        clientUser,
        footerText: `Total Guild Cases: ${allCases.length}`
      });
      return message.channel.send({ embeds: [embed] });
    }

    const { renderModuleHelpPanel } = require('../utils/panelRenderer');
    return renderModuleHelpPanel(message, 'mod');
  }
};
