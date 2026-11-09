const { verifyTierPermission, getMemberTier, TIERS } = require('../utils/modHierarchy');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionsBitField
} = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const db = require('../database/db');
const { dispatchLog } = require('../utils/logger');

async function checkModeratorPermissionAndQuota(message, actionName = 'action', options = {}) {
  return await verifyTierPermission(message, actionName, options);
}

async function renderModerationPanel(message, clientUser) {
  const guild = message.guild;
  const modConfig = db.getModConfig(guild.id);
  const modRolesStr = modConfig.roles && modConfig.roles.length > 0
    ? modConfig.roles.map(rId => `<@&${rId}>`).join(', ')
    : '*None configured (Locked to Administrators & Server Owner)*';

  const modBox = createDynamicBox('MODERATION COMMANDS', [
    '.ban <@user> [reason]',
    '.hackban <id> [reason]',
    '.kick <@user> [reason]',
    '.mute <@user> [duration]',
    '.unmute <@user>',
    '.unban <id> / .unbanall',
    '.nuke (clone & reset)',
    '.clear [count] (1-100)',
    '.lock / .unlock [#chan]',
    '.lockall / .unlockall',
    '.hide / .unhide [#chan]',
    '.hideall / .unhideall',
    '.slowmode <seconds>',
    '.role <@user> <@role>',
    '.temprole <@user> <@r> <t>',
    '.warn / .warnings / .clearwarns'
  ]);

  const configBox = createDynamicBox('ROLE & LIMITS CONFIG', [
    '.mod role add @role',
    '.mod role remove @role',
    '.mod roles',
    '.mod limit <count>',
    '.secure channel enable'
  ]);

  const embed = createStyledEmbed({
    title: `${emojis.SHIELD || '🛡️'} Moderation Suite Control Hub`,
    subtitle: 'Executive Server Moderation & Anti-Abuse Dashboard',
    description:
      `Welcome **${message.author.username}**! Below is the executive moderation suite.\n\n` +
      '```\n' + modBox + '\n```\n' +
      '```\n' + configBox + '\n```\n\n' +
      `• **Authorized Mod Roles:** ${modRolesStr}\n` +
      `• **Daily Limit:** \`${modConfig.dailyLimit || 5}\` actions/day per moderator\n` +
      '• ⚠️ **Anti-Abuse Rule:** If any non-owner moderator exceeds daily limit, they are automatically **timed out for 2 Hours**!',
    requestedBy: message.author,
    clientUser
  });

  const btnRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('btn_mod_roles').setLabel('Mod Roles').setEmoji('🛡️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('btn_mod_limits').setLabel('Daily Limits').setEmoji('📊').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('btn_mod_secure').setLabel('Secure Channels').setEmoji('🔒').setStyle(ButtonStyle.Success)
  );
  const panelMsg = await message.channel.send({ embeds: [embed], components: [btnRow] });

  // Interactive Button Collector for the Panel
  const collector = panelMsg.createMessageComponentCollector({
    filter: i => i.user.id === message.author.id,
    time: 120000
  });

  collector.on('collect', async i => {
    if (i.customId === 'btn_mod_roles') {
      const currentCfg = db.getModConfig(guild.id);
      const rolesInfo = currentCfg.roles.length > 0 ? currentCfg.roles.map(rId => `<@&${rId}>`).join(', ') : 'None configured yet. Use \`.mod role add @role\`';
      await i.reply({ content: `🛡️ **Authorized Moderator Roles:** ${rolesInfo}`, ephemeral: true }).catch(() => {});
    } else if (i.customId === 'btn_mod_limits') {
      const currentCfg = db.getModConfig(guild.id);
      await i.reply({ content: `📊 **Daily Moderation Limit:** \`${currentCfg.dailyLimit || 5}\` actions per 24 hours.\n⚠️ Exceeding this limit will trigger a 2-Hour Server Timeout.`, ephemeral: true }).catch(() => {});
    } else if (i.customId === 'btn_mod_secure') {
      await i.deferUpdate().catch(() => {});
      const securesetupCmd = message.client.commands.get('securesetup');
      if (securesetupCmd) {
        securesetupCmd.execute(message, ['channel', 'enable']);
      }
    }
  });

  collector.on('end', () => {
    panelMsg.edit({ components: [] }).catch(() => {});
  });

  return panelMsg;
}



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
    title: `${emojis.SHIELD} Case #${caseData.caseId} | ${caseData.action}`,
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
    'clone',     'ban', 'hackban', 'kick', 'mute', 'unmute',
    'nuke', 'purge', 'purgebots', 'clear',
    'unban', 'unbanall',
    'role', 'rolemenu', 'list',
    'warn', 'unwarn', 'rmwarn', 'warnremove', 'warnings', 'clearwarns',
    'case', 'cases', 'modlogs', 'caseinfo',
    'temprole', 'trole', 'addrole', 'giverole'
  ],

  // In-memory store for active temp roles (survives within process lifetime)
  // Format: Map<`${guildId}:${userId}:${roleId}`, { timer, expiresAt }>
  _tempRoles: new Map(),


  async execute(message, args) {
    const rawFirstWord = message.content.trim().split(/ +/)[0] || '';
    const invoked = rawFirstWord.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();
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
        return message.reply(`🚨 **${qCheck.requiredDays}-Day New Joiner Security Probation Active!**\nYou have been in this server for **${qCheck.daysJoined} days** (Requires **${qCheck.requiredDays} Days**). Only whitelisted members and the Server Owner can bypass the Security Probation Grid.`);
      }
    }

    // 0. Dedicated Moderation Hub Panel & Subcommands (.mod, .moderation, .mod role, .mod limit)
    if (['mod', 'moderation', 'moderator'].includes(invoked)) {
      const sub = args[0]?.toLowerCase();
      const { isExtraOwner } = require('../utils/owners');
      const isOwner = guild.ownerId === message.author.id || (isExtraOwner && isExtraOwner(guild.id, message.author.id));
      const isAdmin = author.permissions.has(PermissionsBitField.Flags.Administrator);

      if (['role', 'roles', 'setrole', 'addrole', 'remrole'].includes(sub)) {
        if (!isOwner && !isAdmin) {
          return message.reply(`${emojis.WARNING || '⚠️'} Only the Server Owner or Administrators can configure Moderator Roles.`);
        }

        if (sub === 'role' && args[1] && ['add', 'set'].includes(args[1].toLowerCase())) {
          const role = message.mentions.roles.first() || guild.roles.cache.get(args[2]);
          if (!role) return message.reply(`${emojis.WARNING || '⚠️'} Please mention a role!\nUsage: \`.mod role add @role\``);
          db.addModRole(guild.id, role.id);
          return message.reply(`${emojis.SUCCESS || '✅'} Role **${role.name}** is now an authorized **Moderator Role**! Members with this role can use moderation commands.`);
        }

        if (sub === 'role' && args[1] && ['remove', 'rem', 'del', 'delete'].includes(args[1].toLowerCase())) {
          const role = message.mentions.roles.first() || guild.roles.cache.get(args[2]);
          if (!role) return message.reply(`${emojis.WARNING || '⚠️'} Please mention a role!\nUsage: \`.mod role remove @role\``);
          db.removeModRole(guild.id, role.id);
          return message.reply(`${emojis.SUCCESS || '✅'} Role **${role.name}** removed from authorized Moderator Roles.`);
        }

        if (sub === 'setrole' || sub === 'addrole') {
          const role = message.mentions.roles.first() || guild.roles.cache.get(args[1]);
          if (!role) return message.reply(`${emojis.WARNING || '⚠️'} Please mention a role!\nUsage: \`.mod setrole @role\``);
          db.addModRole(guild.id, role.id);
          return message.reply(`${emojis.SUCCESS || '✅'} Role **${role.name}** is now an authorized **Moderator Role**!`);
        }

        if (sub === 'remrole') {
          const role = message.mentions.roles.first() || guild.roles.cache.get(args[1]);
          if (!role) return message.reply(`${emojis.WARNING || '⚠️'} Please mention a role!\nUsage: \`.mod remrole @role\``);
          db.removeModRole(guild.id, role.id);
          return message.reply(`${emojis.SUCCESS || '✅'} Role **${role.name}** removed from authorized Moderator Roles.`);
        }

        const cfg = db.getModConfig(guild.id);
        const rolesText = cfg.roles.length > 0 ? cfg.roles.map(rId => `<@&${rId}>`).join(', ') : '*None set (Locked to Administrators)*';
        return message.reply(`🛡️ **Authorized Moderator Roles:** ${rolesText}\nDaily Action Limit: **${cfg.dailyLimit} actions/day**`);
      }

      if (['limit', 'limits', 'setlimit'].includes(sub)) {
        if (!isOwner && !isAdmin) {
          return message.reply(`${emojis.WARNING || '⚠️'} Only the Server Owner or Administrators can configure daily moderation limits.`);
        }
        const newLim = parseInt(args[1]);
        if (isNaN(newLim) || newLim < 1 || newLim > 50) {
          return message.reply(`${emojis.WARNING || '⚠️'} Please provide a valid daily limit between 1 and 50.\nUsage: \`.mod limit 5\``);
        }
        db.setModDailyLimit(guild.id, newLim);
        return message.reply(`${emojis.SUCCESS || '✅'} Daily moderation limit set to **${newLim} actions/day** per moderator! If exceeded, the moderator will be automatically timed out for 2 Hours.`);
      }

      if (['secure', 'securechannel'].includes(sub)) {
        const securesetupCmd = message.client.commands.get('securesetup');
        if (securesetupCmd) return securesetupCmd.execute(message, ['channel', 'enable']);
      }

      return renderModerationPanel(message, clientUser);
    }

    // 1. ${emojis.MOD} BAN
    if (invoked === 'ban') {
      const modCheck = await checkModeratorPermissionAndQuota(message, 'ban');
      if (!modCheck.allowed) return;
      // Verified via modHierarchy
      if (!guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) return botMissingPerms(message, 'Ban Members');

      const targetId = message.mentions.users.first()?.id || (args[0] && args[0].replace(/[<@!>]/g, '').match(/^\d{17,20}$/) ? args[0].replace(/[<@!>]/g, '') : null);
      if (!targetId) return message.reply(`${emojis.WARNING} Please mention a user or provide a valid User ID.\nUsage: \`.ban @user [reason]\` or \`.ban <userID> [reason]\``);

      const targetMember = await guild.members.fetch(targetId).catch(() => null);
      if (targetMember && !targetMember.bannable) return message.reply(`${emojis.WARNING} I cannot ban that user — they may have higher permissions.`);

      const modLimitsCmd = message.client.commands.get('modlimits');
      if (modLimitsCmd && modLimitsCmd.checkAndIncrementModAction) {
        const quota = modLimitsCmd.checkAndIncrementModAction(guild.id, message.author.id, 'ban');
        if (!quota.allowed) {
          return message.reply(`🚨 **Daily Moderation Limit Reached!** You have used **${quota.current}/${quota.limit}** daily \`BAN\` actions. Your limit resets <t:${Math.floor(quota.resetAt / 1000)}:R>.`);
        }
      }

      const reason = args.slice(1).join(' ') || 'No reason provided.';
      const targetUser = targetMember ? targetMember.user : await message.client.users.fetch(targetId).catch(() => ({ tag: `User ID: ${targetId}` }));

      try {
        await guild.bans.create(targetId, { reason, deleteMessageSeconds: 86400 });
      } catch (err) {
        return message.reply(`${emojis.WARNING} Failed to ban user: ${err.message}`);
      }

      const cData = recordAndLogCase(guild, {
        action: 'BAN',
        targetId: targetId,
        targetTag: targetUser.tag || `User ID: ${targetId}`,
        executorId: message.author.id,
        executorTag: message.author.tag,
        reason
      });

      const embed = createStyledEmbed({
        title: `${emojis.MOD} User Banned [Case #${cData.caseId}]`,
        description: `**<@${targetId}>** (\`${targetUser.tag || targetId}\`) has been banished from the village!\n\n**Case ID:** \`#${cData.caseId}\`\n**Reason:** ${reason}`,
        requestedBy: message.author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 2. 🌐 HACKBAN (ban by ID)
    if (invoked === 'hackban') {
      const modCheck = await checkModeratorPermissionAndQuota(message, 'hackban');
      if (!modCheck.allowed) return;
      // Verified via modHierarchy
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
      try {
        await guild.bans.create(userId, { reason });
      } catch (err) {
        return message.reply(`${emojis.WARNING} Failed to ban user ID \`${userId}\`: ${err.message}`);
      }

      const cData = recordAndLogCase(guild, {
        action: 'HACKBAN',
        targetId: userId,
        targetTag: `User ID: ${userId}`,
        executorId: message.author.id,
        executorTag: message.author.tag,
        reason
      });

      const embed = createStyledEmbed({
        title: `${emojis.MOD} Hackban Executed [Case #${cData.caseId}]`,
        description: `User ID **\`${userId}\`** has been pre-emptively banned.\n\n**Case ID:** \`#${cData.caseId}\`\n**Reason:** ${reason}`,
        requestedBy: message.author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 3. 👢 KICK
    if (invoked === 'kick') {
      const modCheck = await checkModeratorPermissionAndQuota(message, 'kick');
      if (!modCheck.allowed) return;
      if (!guild.members.me.permissions.has(PermissionsBitField.Flags.KickMembers)) return botMissingPerms(message, 'Kick Members');

      const targetId = message.mentions.users.first()?.id || (args[0] && args[0].replace(/[<@!>]/g, '').match(/^\d{17,20}$/) ? args[0].replace(/[<@!>]/g, '') : null);
      if (!targetId) return message.reply(`${emojis.WARNING} Usage: \`.kick @user [reason]\``);

      const target = await guild.members.fetch(targetId).catch(() => null);
      if (!target) return message.reply(`${emojis.WARNING} Member not found in this server.`);
      if (!target.kickable) return message.reply(`${emojis.WARNING} I cannot kick that user — they may have higher permissions.`);

      const reason = args.slice(1).join(' ') || 'No reason provided.';
      try {
        await target.kick(reason);
      } catch (err) {
        return message.reply(`${emojis.WARNING} Failed to kick member: ${err.message}`);
      }

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

    // 4. 🔇 MUTE
    if (invoked === 'mute') {
      const timeArg = args[1];
      const timeMap = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 7 * 86400000 };
      const match = timeArg?.match(/^(\d+)(s|m|h|d|w)$/i);
      const duration = match ? parseInt(match[1]) * timeMap[match[2].toLowerCase()] : 900000;
      const reason = (match ? args.slice(2) : args.slice(1)).join(' ') || 'No reason provided.';

      const modCheck = await checkModeratorPermissionAndQuota(message, 'mute', { durationMs: duration });
      if (!modCheck.allowed) return;
      if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return botMissingPerms(message, 'Timeout Members');

      const targetId = message.mentions.users.first()?.id || (args[0] && args[0].replace(/[<@!>]/g, '').match(/^\d{17,20}$/) ? args[0].replace(/[<@!>]/g, '') : null);
      if (!targetId) return message.reply(`${emojis.WARNING} Usage: \`.mute @user [duration: 1m/1h/1d] [reason]\``);

      const target = await guild.members.fetch(targetId).catch(() => null);
      if (!target) return message.reply(`${emojis.WARNING} Member not found in this server.`);



      try {
        await target.timeout(duration, reason);
      } catch (err) {
        return message.reply(`${emojis.WARNING} Failed to mute member: ${err.message}`);
      }

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
      const modCheck = await checkModeratorPermissionAndQuota(message, 'unmute');
      if (!modCheck.allowed) return;
      // Verified via modHierarchy

      const targetId = message.mentions.users.first()?.id || (args[0] && args[0].replace(/[<@!>]/g, '').match(/^\d{17,20}$/) ? args[0].replace(/[<@!>]/g, '') : null);
      if (!targetId) return message.reply(`${emojis.WARNING} Usage: \`.unmute @user\``);

      const target = await guild.members.fetch(targetId).catch(() => null);
      if (!target) return message.reply(`${emojis.WARNING} Member not found in this server.`);

      try {
        await target.timeout(null);
      } catch (err) {
        return message.reply(`${emojis.WARNING} Failed to unmute member: ${err.message}`);
      }

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

    // 6. ${emojis.SUCCESS} UNBAN
    if (invoked === 'unban') {
      const modCheck = await checkModeratorPermissionAndQuota(message, 'unban');
      if (!modCheck.allowed) return;
      // Verified via modHierarchy

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
        title: `${emojis.SUCCESS} User Unbanned [Case #${cData.caseId}]`,
        description: `User ID \`${userId}\` has been pardoned and may return to the village.`,
        requestedBy: message.author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 7. ${emojis.SUCCESS} UNBAN ALL
    if (invoked === 'unbanall') {
      const modCheck = await checkModeratorPermissionAndQuota(message, 'unbanall');
      if (!modCheck.allowed) return;
      // Verified via modHierarchy
      if (!author.permissions.has(PermissionsBitField.Flags.Administrator)) return missingPerms(message, 'Administrator');

      const bans = await guild.bans.fetch();
      let count = 0;
      for (const [, ban] of bans) {
        await guild.bans.remove(ban.user.id).catch(() => {});
        count++;
      }

      const embed = createStyledEmbed({
        title: `${emojis.SUCCESS} Mass Unban Complete`,
        description: `**${count}** banned user(s) have been pardoned from the village.`,
        requestedBy: message.author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 8. 🗑️ PURGE & ADVANCED CLEAR
    if (invoked === 'purge' || invoked === 'purgebots' || invoked === 'clear') {
      let sub = args[0]?.toLowerCase();
      let isSub = ['all', 'bots', 'bot', 'b', 'contains', 'user', 'reactions', 'embeds', 'files', 'images'].includes(sub);
      
      let amountArg = isSub ? (['contains', 'user'].includes(sub) ? args[2] : args[1]) : args[0];
      let amount = parseInt(amountArg) || (sub === 'reactions' ? 25 : 50);

      const actionKey = sub === 'contains' ? 'clear contains' : 'clear';
      const modCheck = await checkModeratorPermissionAndQuota(message, actionKey, { clearCount: amount });
      if (!modCheck.allowed) return;
      if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) return botMissingPerms(message, 'Manage Messages');

      await message.delete().catch(() => {});

      // Subcommand: CLEAR CONTAINS
      if (sub === 'contains') {
        const textToFind = args[1]?.toLowerCase();
        if (!textToFind) return message.reply(`${emojis.WARNING} Usage: \`.clear contains <text/phrase> [amount]\``);
        const fetchLimit = Math.min(amount, 100);
        const msgs = await message.channel.messages.fetch({ limit: fetchLimit });
        const filtered = msgs.filter(m => m.content && m.content.toLowerCase().includes(textToFind));
        await message.channel.bulkDelete(filtered, true).catch(() => null);
        const reply = await message.channel.send(`🧹 Purged **${filtered.size}** messages containing "\${textToFind}\"!`);
        setTimeout(() => reply.delete().catch(() => {}), 4000);
        return;
      }

      // Subcommand: CLEAR USER
      if (sub === 'user') {
        const targetUser = message.mentions.users.first() || (args[1] && args[1].match(/^\d{17,20}$/) ? await message.client.users.fetch(args[1]).catch(() => null) : null);
        if (!targetUser) return message.reply(`${emojis.WARNING} Usage: \`.clear user @user [amount]\``);
        const fetchLimit = Math.min(amount, 100);
        const msgs = await message.channel.messages.fetch({ limit: fetchLimit });
        const filtered = msgs.filter(m => m.author.id === targetUser.id);
        await message.channel.bulkDelete(filtered, true).catch(() => null);
        const reply = await message.channel.send(`🧹 Purged **${filtered.size}** messages from <@${targetUser.id}>!`);
        setTimeout(() => reply.delete().catch(() => {}), 4000);
        return;
      }

      // Subcommand: CLEAR REACTIONS
      if (sub === 'reactions') {
        const fetchLimit = Math.min(amount, 100);
        const msgs = await message.channel.messages.fetch({ limit: fetchLimit });
        let rxCount = 0;
        for (const msg of msgs.values()) {
          if (msg.reactions.cache.size > 0) {
            await msg.reactions.removeAll().catch(() => {});
            rxCount++;
          }
        }
        const reply = await message.channel.send(`🧹 Cleared reactions from **${rxCount}** messages!`);
        setTimeout(() => reply.delete().catch(() => {}), 4000);
        return;
      }

      // Subcommand: CLEAR BOTS
      if (sub === 'bots' || sub === 'bot' || sub === 'b' || invoked === 'purgebots') {
        const fetchLimit = Math.min(amount, 100);
        const msgs = await message.channel.messages.fetch({ limit: fetchLimit });
        const filtered = msgs.filter(m => m.author.bot);
        await message.channel.bulkDelete(filtered, true).catch(() => null);
        const reply = await message.channel.send(`🤖 Purged **${filtered.size}** bot messages!`);
        setTimeout(() => reply.delete().catch(() => {}), 4000);
        return;
      }

      // Subcommand: CLEAR EMBEDS
      if (sub === 'embeds') {
        const fetchLimit = Math.min(amount, 100);
        const msgs = await message.channel.messages.fetch({ limit: fetchLimit });
        const filtered = msgs.filter(m => m.embeds && m.embeds.length > 0);
        await message.channel.bulkDelete(filtered, true).catch(() => null);
        const reply = await message.channel.send(`📄 Purged **${filtered.size}** embed messages!`);
        setTimeout(() => reply.delete().catch(() => {}), 4000);
        return;
      }

      // Subcommand: CLEAR FILES / IMAGES
      if (sub === 'files' || sub === 'images') {
        const fetchLimit = Math.min(amount, 100);
        const msgs = await message.channel.messages.fetch({ limit: fetchLimit });
        const filtered = msgs.filter(m => m.attachments && m.attachments.size > 0);
        await message.channel.bulkDelete(filtered, true).catch(() => null);
        const reply = await message.channel.send(`🖼️ Purged **${filtered.size}** attachment messages!`);
        setTimeout(() => reply.delete().catch(() => {}), 4000);
        return;
      }

      // Default: CLEAR ALL / GENERAL PURGE
      const fetchLimit = Math.min(amount, 100);
      const deleted = await message.channel.bulkDelete(fetchLimit, true).catch(() => null);
      const count = deleted?.size || 0;

      const embed = createStyledEmbed({
        title: `${emojis.AN_CHANNEL || '🗑️'} Messages Purged`,
        description: `**${count}** message(s) have been incinerated with Fire Style in ${message.channel}!`,
        requestedBy: message.author,
        clientUser
      });
      const reply = await message.channel.send({ embeds: [embed] });
      setTimeout(() => reply.delete().catch(() => {}), 4000);
      return;
    }

    // 10. 💣 NUKE (Strictly Server Owner & Discord Administrators ONLY)
    if (invoked === 'nuke') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && guild.ownerId !== message.author.id) {
        return message.reply(`${emojis.WARNING || '⚠️'} **Admin Reserved!** The \`.nuke\` command is strictly reserved for **Server Owner & Discord Administrators** only.`);
      }
      if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) return botMissingPerms(message, 'Manage Channels');

      const channel = message.channel;
      const position = channel.position;
      const topic = channel.topic;
      const parent = channel.parent;
      const permissionOverwrites = channel.permissionOverwrites.cache;

      const newChannel = await channel.clone({
        name: channel.name,
        permissions: permissionOverwrites,
        topic: topic,
        parent: parent,
        position: position,
        reason: `Nuke command executed by Admin ${message.author.tag}`
      });

      await channel.delete('Nuke command executed');

      const embed = createStyledEmbed({
        title: `${emojis.AN_PANIC || '💣'} Channel Nuked & Re-created!`,
        description: `This channel was nuked by **${message.author.tag}**. All messages cleared!`,
        requestedBy: message.author,
        clientUser
      });
      await newChannel.send({ embeds: [embed] });
      return;
    }

    // 10b. 📋 CLONE CHANNEL
    if (invoked === 'clone') {
      const modCheck = await checkModeratorPermissionAndQuota(message, 'clone');
      if (!modCheck.allowed) return;
      if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) return botMissingPerms(message, 'Manage Channels');

      const targetChan = message.mentions.channels.first() || message.channel;
      const newChannel = await targetChan.clone({
        name: targetChan.name,
        permissions: targetChan.permissionOverwrites.cache,
        topic: targetChan.topic,
        parent: targetChan.parent,
        position: targetChan.position,
        reason: `Cloned by ${message.author.tag}`
      });

      return message.channel.send(`${emojis.SUCCESS || '✅'} Channel cloned successfully: ${newChannel}`);
    }

    // 11. 🎭 ROLE (add/remove)
    if (invoked === 'role' || invoked === 'addrole' || invoked === 'giverole') {
      const modCheck = await checkModeratorPermissionAndQuota(message, 'role');
      if (!modCheck.allowed) return;
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
          description: `✅ Added **${roleMention.name}** to ${target}`,
          requestedBy: message.author, clientUser
        });
        return message.channel.send({ embeds: [embed] });
      }
    }

    // 11b. ⏱️ TEMPROLE (add role for a duration, auto-remove after)
    // Usage: .temprole @user 7d @role
    //        .temprole @user 30m @role
    //        .temprole @user 2h @role
    if (['temprole', 'trole'].includes(invoked)) {
      if (!author.permissions.has(PermissionsBitField.Flags.ManageRoles)) return missingPerms(message, 'Manage Roles');
      if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) return botMissingPerms(message, 'Manage Roles');

      const target = message.mentions.members?.first();
      const roleMention = message.mentions.roles?.first();

      if (!target || !roleMention) {
        return message.reply(
          `${emojis.WARNING} Usage: \`.temprole @user <duration> @role\`\n` +
          `Examples: \`.temprole @user 7d @Management\`, \`.temprole @user 2h @VIP\`, \`.temprole @user 30m @Muted\``
        );
      }

      // Parse duration from args (find first arg matching duration pattern)
      const durationMap = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
        w: 7 * 24 * 60 * 60 * 1000
      };

      let durationMs = null;
      let durationStr = null;

      for (const arg of args) {
        const match = arg.match(/^(\d+)([smhdw])$/i);
        if (match) {
          const amount = parseInt(match[1]);
          const unit   = match[2].toLowerCase();
          durationMs  = amount * durationMap[unit];
          // Pretty format
          const unitNames = { s: 'Second', m: 'Minute', h: 'Hour', d: 'Day', w: 'Week' };
          durationStr = `${amount} ${unitNames[unit]}${amount !== 1 ? 's' : ''}`;
          break;
        }
      }

      if (!durationMs) {
        return message.reply(
          `${emojis.WARNING} Please provide a valid duration: \`30s\`, \`10m\`, \`2h\`, \`7d\`, \`1w\`\n` +
          `Example: \`.temprole @user 7d @Management\``
        );
      }

      const MAX_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days max
      if (durationMs > MAX_DURATION) {
        return message.reply(`${emojis.WARNING} Maximum temp role duration is **30 days**.`);
      }

      // Add the role
      await target.roles.add(roleMention, `TempRole by ${message.author.tag} for ${durationStr}`);

      const expiresAt = new Date(Date.now() + durationMs);
      const expiresTimestamp = Math.floor(expiresAt.getTime() / 1000);

      // Store in _tempRoles map and schedule auto-removal
      const key = `${guild.id}:${target.id}:${roleMention.id}`;
      const existingTimer = module.exports._tempRoles.get(key);
      if (existingTimer) clearTimeout(existingTimer.timer);

      const timer = setTimeout(async () => {
        try {
          const guildObj = message.client.guilds.cache.get(guild.id);
          if (!guildObj) return;
          const member = await guildObj.members.fetch(target.id).catch(() => null);
          if (member && member.roles.cache.has(roleMention.id)) {
            await member.roles.remove(roleMention.id, 'TempRole expired — auto-removed by Naruto Bot');
          }
          module.exports._tempRoles.delete(key);

          // Try to notify in the same channel
          message.channel.send({
            embeds: [
              createStyledEmbed({
                title: `⏱️ TempRole Expired`,
                description:
                  `⏰ **Temp Role Auto-Removed!**\n\n` +
                  `👤 **Member:** ${target}\n` +
                  `🎭 **Role:** **${roleMention.name}**\n` +
                  `📋 **Reason:** Duration expired after **${durationStr}**`,
                requestedBy: message.author,
                clientUser
              })
            ]
          }).catch(() => {});
        } catch (e) {}
      }, durationMs);

      module.exports._tempRoles.set(key, { timer, expiresAt, durationStr, roleId: roleMention.id, userId: target.id });

      // Confirmation embed with Duration field
      const embed = createStyledEmbed({
        title: `⏱️ Temp Role Added`,
        description:
          `✅ Added **${roleMention.name}** to ${target}\n\n` +
          `**Duration:** ${durationStr}\n` +
          `**Expires:** <t:${expiresTimestamp}:R> (<t:${expiresTimestamp}:f>)\n` +
          `**Auto-Remove:** ✅ Bot will automatically remove this role when it expires.`,
        requestedBy: message.author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
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
          title: `${emojis.SHIELD} Server Administrators List`,
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

    // 14. ${emojis.WARNING} WARN / UNWARN / CLEARWARNS
    if (['warn', 'unwarn', 'rmwarn', 'warnremove', 'clearwarns'].includes(invoked)) {
      const isWarnRemove = invoked === 'unwarn' || invoked === 'rmwarn' || invoked === 'warnremove' || (invoked === 'warn' && args[0] === 'remove');
      const modCheck = await checkModeratorPermissionAndQuota(message, isWarnRemove ? 'unwarn' : (invoked === 'clearwarns' ? 'unwarn' : 'warn'));
      if (!modCheck.allowed) return;

      const isRemove = invoked === 'unwarn' || invoked === 'rmwarn' || invoked === 'warnremove' || (invoked === 'warn' && args[0] === 'remove');
      const isClear = invoked === 'clearwarns' || (invoked === 'warn' && args[0] === 'clear');

      // Check if Case ID was passed for unwarn (e.g. .unwarn 5, .unwarn #5)
      let caseIdArg = null;
      if (isRemove) {
        for (const arg of args) {
          const cleanArg = arg.replace('#', '').trim();
          if (!isNaN(cleanArg) && cleanArg.length > 0 && cleanArg.length < 10 && parseInt(cleanArg) > 0) {
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
          targetTag: c.targetTag || 'User',
          executorId: message.author.id,
          executorTag: message.author.tag,
          reason: `Revoked Warning Case #${caseIdArg}`
        });

        const embed = createStyledEmbed({
          title: `${emojis.SUCCESS} Warning Case #${caseIdArg} Revoked [Case #${cData.caseId}]`,
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
      const targetUser = message.mentions.users.first() || (args[targetIndex] && args[targetIndex].match(/^\d{17,20}$/) ? await message.client.users.fetch(args[targetIndex]).catch(() => null) : null);

      if (!targetUser) {
        return message.reply(
          `${emojis.WARNING} Usage:\n` +
          `• \`.warn @user [reason]\` — Add warning\n` +
          `• \`.unwarn <caseID>\` — Remove warning by Case ID (e.g. \`.unwarn 5\`)\n` +
          `• \`.unwarn @user\` — Remove latest warning for member\n` +
          `• \`.clearwarns @user\` — Clear all warnings`
        );
      }

      const userObj = db.getUser(targetUser.id);
      const currentWarns = userObj.warns || 0;

      if (isClear) {
        db.updateUser(targetUser.id, u => { u.warns = 0; });
        const cData = recordAndLogCase(guild, {
          action: 'CLEARWARNS',
          targetId: targetUser.id,
          targetTag: targetUser.tag,
          executorId: message.author.id,
          executorTag: message.author.tag,
          reason: `Cleared all warnings (Previous: ${currentWarns})`
        });

        const embed = createStyledEmbed({
          title: `🧹 All Warnings Cleared [Case #${cData.caseId}]`,
          description: `**Member:** <@${targetUser.id}> (\`${targetUser.tag}\`)\n**Case ID:** \`#${cData.caseId}\`\n**Cleared Warnings:** \`${currentWarns}\` → \`0\``,
          requestedBy: message.author,
          clientUser
        });
        return message.channel.send({ embeds: [embed] });
      }

      if (isRemove) {
        if (currentWarns <= 0) return message.reply(`${emojis.INFO} <@${targetUser.id}> has 0 active warnings.`);
        const newWarns = currentWarns - 1;
        db.updateUser(targetUser.id, u => { u.warns = newWarns; });

        const reason = args.slice(targetIndex + 1).join(' ') || 'Warning removed by staff.';
        const cData = recordAndLogCase(guild, {
          action: 'UNWARN',
          targetId: targetUser.id,
          targetTag: targetUser.tag,
          executorId: message.author.id,
          executorTag: message.author.tag,
          reason
        });

        const embed = createStyledEmbed({
          title: `${emojis.SUCCESS} Warning Removed [Case #${cData.caseId}]`,
          description: `**Member:** <@${targetUser.id}> (\`${targetUser.tag}\`)\n**Case ID:** \`#${cData.caseId}\`\n**Remaining Warnings:** \`${newWarns}\`\n**Reason:** ${reason}`,
          requestedBy: message.author,
          clientUser
        });
        return message.channel.send({ embeds: [embed] });
      }

      // Standard .warn @user
      const reason = args.slice(1).join(' ') || 'No reason provided.';
      const warnCount = currentWarns + 1;
      db.updateUser(targetUser.id, u => { u.warns = warnCount; });

      const cData = recordAndLogCase(guild, {
        action: 'WARN',
        targetId: targetUser.id,
        targetTag: targetUser.tag,
        executorId: message.author.id,
        executorTag: message.author.tag,
        reason: `[Warning #${warnCount}] ${reason}`
      });

      try {
        await targetUser.send(`${emojis.WARNING} You have received Warning #${warnCount} [Case #${cData.caseId}] in **${guild.name}**.\n**Reason:** ${reason}`);
      } catch (e) {}

      const embed = createStyledEmbed({
        title: `${emojis.WARNING} User Warned [Case #${cData.caseId}]`,
        description: `**Member:** <@${targetUser.id}> (\`${targetUser.tag}\`)\n**Case ID:** \`#${cData.caseId}\`\n**Warning Count:** \`${warnCount} warning(s)\`\n**Reason:** ${reason}`,
        requestedBy: message.author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 15. 🛡️ CASE / CASES / MODLOGS (.case <id> | .cases [@user] | .modlogs [#channel])
    if (['case', 'cases', 'modlogs', 'modlog', 'caseinfo'].includes(invoked)) {
      const targetChan = message.mentions.channels.first();
      const firstArg = args[0]?.toLowerCase();

      // IF USER MENTIONS A CHANNEL OR TYPES .modlogs #channel / .modlog set #channel -> CONFIGURE LOG CHANNEL
      if (targetChan || firstArg === 'set' || firstArg === 'channel') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
          return message.reply(`${emojis.WARNING} Only Administrators can configure moderation log channels.`);
        }

        const chanToSet = targetChan || message.guild.channels.cache.get(args[1] || args[0]);
        if (!chanToSet) {
          return message.reply(`${emojis.WARNING} Usage: \`.modlogs #channel\` or \`.modlogs set #channel\``);
        }

        const logsetupCmd = message.client.commands.get('logsetup');
        if (logsetupCmd && logsetupCmd.loggingConfigs) {
          const cfg = logsetupCmd.loggingConfigs.get(guild.id) || { enabled: true, mode: 'specialized' };
          cfg.modLogs = chanToSet.id;
          logsetupCmd.loggingConfigs.set(guild.id, cfg);
        }

        const automod = db.getAutomod(guild.id);
        automod.modlogsChannelId = chanToSet.id;
        db.updateAutomod(guild.id, 'misc', automod.misc || {});

        const { createDynamicBox } = require('../utils/boxBuilder');
        const box = createDynamicBox('MODLOGS CHANNEL SET', [
          { key: 'Channel', value: '#' + chanToSet.name.slice(0, 14) },
          { key: 'Status ', value: 'Active [OK]' },
          { key: 'Module ', value: 'Moderation Audit Logs' }
        ]);

        const embed = createStyledEmbed({
          title: `${emojis.MOD || '🛡️'} Moderation Log Channel Configured`,
          description:
            `Successfully set **${chanToSet}** as the primary Moderation Audit Log channel for **${guild.name}**!\n\n` +
            '```\n' + box + '\n```',
          requestedBy: message.author,
          clientUser
        });

        return message.channel.send({ embeds: [embed] });
      }

      const targetUser = message.mentions.users.first();
      const caseIdInput = args[0] && !isNaN(args[0]) ? parseInt(args[0]) : null;

      if (caseIdInput) {
        const c = db.getCase(guild.id, caseIdInput);
        if (!c) return message.reply(`${emojis.WARNING} Case **#${caseIdInput}** not found in this server.`);

        const embed = createStyledEmbed({
          title: `${emojis.SHIELD} Moderation Case #${c.caseId}`,
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

      const userId = targetUser ? targetUser.id : (args[0] && args[0].length > 15 && !isNaN(args[0]) ? args[0] : null);
      if (userId) {
        const userCases = db.getUserCases(guild.id, userId);
        if (userCases.length === 0) return message.reply(`${emojis.INFO} No moderation cases found for <@${userId}>.`);

        const lines = userCases.map(c => `\`Case #${c.caseId}\` | **${c.action}** — ${c.reason.length > 40 ? c.reason.slice(0, 40) + '...' : c.reason} (By <@${c.executorId}>)`);
        const embed = createStyledEmbed({
          title: `${emojis.SHIELD} Cases for User`,
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
        title: `${emojis.SHIELD} Server Moderation Cases`,
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
