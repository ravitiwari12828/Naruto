const { AuditLogEvent, EmbedBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const { dispatchLog } = require('../utils/logger');
const { createDynamicBox } = require('../utils/boxBuilder');
const emojis = require('../utils/emojis');

// Deduplication Cache (30 sec)
const processedEvents = new Map();

function isDuplicateEvent(eventKey) {
  const now = Date.now();
  if (processedEvents.has(eventKey)) {
    if (now - processedEvents.get(eventKey) < 30000) return true;
  }
  processedEvents.set(eventKey, now);
  if (processedEvents.size > 1000) {
    for (const [k, ts] of processedEvents.entries()) {
      if (now - ts > 30000) processedEvents.delete(k);
    }
  }
  return false;
}

async function fetchAuditLogExecutor(guild, type, targetId = null) {
  if (!guild || !guild.members?.me?.permissions?.has(PermissionsBitField.Flags.ViewAuditLog)) return null;
  try {
    const logs = await guild.fetchAuditLogs({ limit: 5, type });
    const entry = logs.entries.find(e => {
      if (targetId) return e.targetId === targetId;
      return (Date.now() - e.createdTimestamp) < 15000;
    });
    if (entry && (Date.now() - entry.createdTimestamp) < 15000) {
      return entry.executor;
    }
  } catch (e) {}
  return null;
}

module.exports = (client) => {

  // ─────────────────────────────────────────
  // 1. ⚙️ SERVER SETTINGS & FEATURES UPDATED (guildUpdate)
  // ─────────────────────────────────────────
  client.on('guildUpdate', async (oldGuild, newGuild) => {
    const key = `guildUpdate:${newGuild.id}:${Date.now().toString().slice(0, -3)}`;
    if (isDuplicateEvent(key)) return;

    const changes = [];
    if (oldGuild.name !== newGuild.name) {
      changes.push(`• **Server Name:** \`${oldGuild.name}\` ➔ **\`${newGuild.name}\`**`);
    }
    if (oldGuild.icon !== newGuild.icon) {
      changes.push(`• **Server Icon:** Updated`);
    }
    if (oldGuild.banner !== newGuild.banner) {
      changes.push(`• **Server Banner:** Updated`);
    }
    if (oldGuild.verificationLevel !== newGuild.verificationLevel) {
      changes.push(`• **Verification Level:** \`${oldGuild.verificationLevel}\` ➔ \`${newGuild.verificationLevel}\``);
    }
    if (oldGuild.explicitContentFilter !== newGuild.explicitContentFilter) {
      changes.push(`• **Explicit Filter:** \`${oldGuild.explicitContentFilter}\` ➔ \`${newGuild.explicitContentFilter}\``);
    }
    if (oldGuild.afkChannelId !== newGuild.afkChannelId) {
      changes.push(`• **AFK Channel:** ${oldGuild.afkChannelId ? '<#' + oldGuild.afkChannelId + '>' : 'None'} ➔ ${newGuild.afkChannelId ? '<#' + newGuild.afkChannelId + '>' : 'None'}`);
    }
    if (oldGuild.vanityURLCode !== newGuild.vanityURLCode) {
      changes.push(`• **Vanity URL:** \`${oldGuild.vanityURLCode || 'None'}\` ➔ \`${newGuild.vanityURLCode || 'None'}\``);
    }

    if (changes.length === 0) return;

    const executor = await fetchAuditLogExecutor(newGuild, AuditLogEvent.GuildUpdate);

    const infoBox = createDynamicBox('SERVER SETTINGS UPDATED', [
      `Server   : ${newGuild.name}`,
      `Executor : ${executor ? (executor.tag || executor.username) : 'Audit Expired'}`,
      `Changes  : ${changes.length} Property Update(s)`
    ]);

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`${emojis.GEAR || '⚙️'} Server Settings Updated`)
      .setDescription(
        '```\n' + infoBox + '\n```\n\n' +
        `**Changes:**\n${changes.join('\n')}\n\n` +
        `• **Updated By:** ${executor ? `<@${executor.id}> (\`${executor.tag}\`)` : '`Unknown`'}`
      )
      .setThumbnail(newGuild.iconURL({ dynamic: true }) || undefined)
      .setTimestamp();

    dispatchLog(newGuild, 'server', embed);
  });

  // ─────────────────────────────────────────
  // 2. 🎭 ROLE EVENTS (roleCreate, roleUpdate, roleDelete)
  // ─────────────────────────────────────────
  client.on('roleCreate', async (role) => {
    const key = `roleCreate:${role.guild.id}:${role.id}`;
    if (isDuplicateEvent(key)) return;

    const executor = await fetchAuditLogExecutor(role.guild, AuditLogEvent.RoleCreate, role.id);

    const infoBox = createDynamicBox('ROLE CREATED', [
      `Role Name : ${role.name}`,
      `Role ID   : ${role.id}`,
      `Color     : ${role.hexColor}`,
      `Executor  : ${executor ? (executor.tag || executor.username) : 'Unknown'}`
    ]);

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle(`${emojis.ROLES || '🎭'} Role Created in Server Settings`)
      .setDescription(
        '```\n' + infoBox + '\n```\n\n' +
        `• **Role:** <@&${role.id}> (**${role.name}**)\n` +
        `• **Role ID:** \`${role.id}\`\n` +
        `• **Color:** \`${role.hexColor}\`\n` +
        `• **Created By:** ${executor ? `<@${executor.id}> (\`${executor.tag}\`)` : '`Unknown`'}`
      )
      .setTimestamp();

    dispatchLog(role.guild, 'roles', embed);
  });

  client.on('roleUpdate', async (oldRole, newRole) => {
    const key = `roleUpdate:${newRole.guild.id}:${newRole.id}:${Date.now().toString().slice(0, -3)}`;
    if (isDuplicateEvent(key)) return;

    const changes = [];
    if (oldRole.name !== newRole.name) {
      changes.push(`• **Name:** \`${oldRole.name}\` ➔ **\`${newRole.name}\`**`);
    }
    if (oldRole.hexColor !== newRole.hexColor) {
      changes.push(`• **Color:** \`${oldRole.hexColor}\` ➔ **\`${newRole.hexColor}\`**`);
    }
    if (oldRole.hoist !== newRole.hoist) {
      changes.push(`• **Hoisted:** \`${oldRole.hoist}\` ➔ \`${newRole.hoist}\``);
    }
    if (oldRole.mentionable !== newRole.mentionable) {
      changes.push(`• **Mentionable:** \`${oldRole.mentionable}\` ➔ \`${newRole.mentionable}\``);
    }

    const addedPerms = newRole.permissions.missing(oldRole.permissions);
    const removedPerms = oldRole.permissions.missing(newRole.permissions);
    if (addedPerms.length > 0) {
      changes.push(`• **Permissions Added:** \`${addedPerms.join(', ')}\``);
    }
    if (removedPerms.length > 0) {
      changes.push(`• **Permissions Revoked:** \`${removedPerms.join(', ')}\``);
    }

    if (changes.length === 0) return;

    const executor = await fetchAuditLogExecutor(newRole.guild, AuditLogEvent.RoleUpdate, newRole.id);

    const infoBox = createDynamicBox('ROLE SETTINGS MODIFIED', [
      `Role Name : ${newRole.name}`,
      `Role ID   : ${newRole.id}`,
      `Executor  : ${executor ? (executor.tag || executor.username) : 'Unknown'}`
    ]);

    const embed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle(`${emojis.ROLES || '🎭'} Role Modified in Server Settings`)
      .setDescription(
        '```\n' + infoBox + '\n```\n\n' +
        `• **Role:** <@&${newRole.id}> (**${newRole.name}**)\n\n` +
        `**Changes:**\n${changes.join('\n')}\n\n` +
        `• **Modified By:** ${executor ? `<@${executor.id}> (\`${executor.tag}\`)` : '`Unknown`'}`
      )
      .setTimestamp();

    dispatchLog(newRole.guild, 'roles', embed);
  });

  client.on('roleDelete', async (role) => {
    const key = `roleDelete:${role.guild.id}:${role.id}`;
    if (isDuplicateEvent(key)) return;

    const executor = await fetchAuditLogExecutor(role.guild, AuditLogEvent.RoleDelete, role.id);

    const infoBox = createDynamicBox('ROLE DELETED', [
      `Role Name : ${role.name}`,
      `Role ID   : ${role.id}`,
      `Executor  : ${executor ? (executor.tag || executor.username) : 'Unknown'}`
    ]);

    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle(`${emojis.REMOVE || '🗑️'} Role Deleted in Server Settings`)
      .setDescription(
        '```\n' + infoBox + '\n```\n\n' +
        `• **Role Name:** \`${role.name}\`\n` +
        `• **Role ID:** \`${role.id}\`\n` +
        `• **Deleted By:** ${executor ? `<@${executor.id}> (\`${executor.tag}\`)` : '`Unknown`'}`
      )
      .setTimestamp();

    dispatchLog(role.guild, 'roles', embed);
  });

  // ─────────────────────────────────────────
  // 3. 📁 CHANNEL EVENTS (channelCreate, channelUpdate, channelDelete)
  // ─────────────────────────────────────────
  client.on('channelCreate', async (channel) => {
    if (!channel.guild) return;
    const key = `channelCreate:${channel.guild.id}:${channel.id}`;
    if (isDuplicateEvent(key)) return;

    const executor = await fetchAuditLogExecutor(channel.guild, AuditLogEvent.ChannelCreate, channel.id);
    const categoryName = channel.parent ? channel.parent.name : 'None';
    const chanType = ChannelType[channel.type] || channel.type;

    const infoBox = createDynamicBox('CHANNEL CREATED', [
      `Name     : ${channel.name}`,
      `ID       : ${channel.id}`,
      `Type     : ${chanType}`,
      `Category : ${categoryName}`,
      `Creator  : ${executor ? (executor.tag || executor.username) : 'Unknown'}`
    ]);

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle(`${emojis.SUCCESS || '📁'} Channel Created in Server Settings`)
      .setDescription(
        '```\n' + infoBox + '\n```\n\n' +
        `• **Channel:** <#${channel.id}> (\`${channel.name}\`)\n` +
        `• **Channel ID:** \`${channel.id}\`\n` +
        `• **Category:** \`${categoryName}\`\n` +
        `• **Created By:** ${executor ? `<@${executor.id}> (\`${executor.tag}\`)` : '`Unknown`'}`
      )
      .setTimestamp();

    dispatchLog(channel.guild, 'channels', embed);
    dispatchLog(channel.guild, 'server', embed);
  });

  client.on('channelUpdate', async (oldChannel, newChannel) => {
    if (!newChannel.guild) return;
    const key = `channelUpdate:${newChannel.guild.id}:${newChannel.id}:${Date.now().toString().slice(0, -3)}`;
    if (isDuplicateEvent(key)) return;

    const changes = [];
    if (oldChannel.name !== newChannel.name) {
      changes.push(`• **Name:** \`${oldChannel.name}\` ➔ **\`${newChannel.name}\`**`);
    }
    if (oldChannel.topic !== newChannel.topic) {
      changes.push(`• **Topic Changed:** \`${oldChannel.topic || 'None'}\` ➔ \`${newChannel.topic || 'None'}\``);
    }
    if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
      changes.push(`• **Slowmode:** \`${oldChannel.rateLimitPerUser}s\` ➔ \`${newChannel.rateLimitPerUser}s\``);
    }
    if (oldChannel.nsfw !== newChannel.nsfw) {
      changes.push(`• **NSFW:** \`${oldChannel.nsfw}\` ➔ \`${newChannel.nsfw}\``);
    }
    if (oldChannel.permissionOverwrites?.cache.size !== newChannel.permissionOverwrites?.cache.size) {
      changes.push(`• **Permission Overwrites Updated**`);
    }

    if (changes.length === 0) return;

    const executor = await fetchAuditLogExecutor(newChannel.guild, AuditLogEvent.ChannelUpdate, newChannel.id);

    const infoBox = createDynamicBox('CHANNEL MODIFIED / PERMISSIONS UPDATED', [
      `Name     : ${newChannel.name}`,
      `ID       : ${newChannel.id}`,
      `Category : ${newChannel.parent ? newChannel.parent.name : 'None'}`,
      `Executor : ${executor ? (executor.tag || executor.username) : 'Unknown'}`
    ]);

    const embed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle(`${emojis.GEAR || '⚙️'} Channel Modified in Server Settings`)
      .setDescription(
        '```\n' + infoBox + '\n```\n\n' +
        `• **Channel:** <#${newChannel.id}> (\`${newChannel.name}\`)\n\n` +
        `**Changes:**\n${changes.join('\n')}\n\n` +
        `• **Modified By:** ${executor ? `<@${executor.id}> (\`${executor.tag}\`)` : '`Unknown`'}`
      )
      .setTimestamp();

    dispatchLog(newChannel.guild, 'channels', embed);
    dispatchLog(newChannel.guild, 'server', embed);
  });

  client.on('channelDelete', async (channel) => {
    if (!channel.guild) return;
    const key = `channelDelete:${channel.guild.id}:${channel.id}`;
    if (isDuplicateEvent(key)) return;

    const executor = await fetchAuditLogExecutor(channel.guild, AuditLogEvent.ChannelDelete, channel.id);
    const categoryName = channel.parent ? channel.parent.name : 'None';

    const infoBox = createDynamicBox('CHANNEL DELETED', [
      `Name     : ${channel.name}`,
      `ID       : ${channel.id}`,
      `Category : ${categoryName}`,
      `Executor : ${executor ? (executor.tag || executor.username) : 'Unknown'}`
    ]);

    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle(`${emojis.REMOVE || '🗑️'} Channel Deleted in Server Settings`)
      .setDescription(
        '```\n' + infoBox + '\n```\n\n' +
        `• **Channel Name:** \`${channel.name}\`\n` +
        `• **Channel ID:** \`${channel.id}\`\n` +
        `• **Category:** \`${categoryName}\`\n` +
        `• **Deleted By:** ${executor ? `<@${executor.id}> (\`${executor.tag}\`)` : '`Unknown`'}`
      )
      .setTimestamp();

    dispatchLog(channel.guild, 'channels', embed);
    dispatchLog(channel.guild, 'server', embed);
  });

  // ─────────────────────────────────────────
  // 4. 👥 MEMBER JOIN & LEAVE LOGS (guildMemberAdd, guildMemberRemove, guildMemberUpdate)
  // ─────────────────────────────────────────
  client.on('guildMemberAdd', async (member) => {
    const guild = member.guild;
    const accountAgeMs = Date.now() - member.user.createdTimestamp;
    const accountAgeDays = Math.floor(accountAgeMs / (1000 * 60 * 60 * 24));
    const createdUnix = Math.floor(member.user.createdTimestamp / 1000);

    const infoBox = createDynamicBox('USER JOINED SERVER', [
      `User     : ${member.user.tag || member.user.username}`,
      `ID       : ${member.id}`,
      `Created  : ${accountAgeDays} days ago`,
      `Members  : ${guild.memberCount}`
    ]);

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle(`${emojis.WELCOME || '📥'} User Joined Server`)
      .setDescription(
        '```\n' + infoBox + '\n```\n\n' +
        `• **User:** <@${member.id}> (\`${member.user.tag}\`)\n` +
        `• **Account Created:** <t:${createdUnix}:R> (<t:${createdUnix}:f>)\n` +
        `• **Total Server Members:** \`${guild.memberCount}\``
      )
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .setTimestamp();

    dispatchLog(guild, 'joinleave', embed);
    dispatchLog(guild, 'members', embed);
  });

  client.on('guildMemberRemove', async (member) => {
    const guild = member.guild;
    const joinedUnix = member.joinedTimestamp ? Math.floor(member.joinedTimestamp / 1000) : null;

    const rolesList = member.roles.cache
      .filter(r => r.id !== guild.roles.everyone.id)
      .map(r => `<@&${r.id}> (**${r.name}**)`)
      .join(', ') || 'None';

    const infoBox = createDynamicBox('USER LEFT SERVER', [
      `User     : ${member.user.tag || member.user.username}`,
      `ID       : ${member.id}`,
      `Members  : ${guild.memberCount}`
    ]);

    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle(`${emojis.REMOVE || '📤'} User Left Server`)
      .setDescription(
        '```\n' + infoBox + '\n```\n\n' +
        `• **User:** <@${member.id}> (\`${member.user.tag}\`)\n` +
        (joinedUnix ? `• **Joined Server:** <t:${joinedUnix}:R> (<t:${joinedUnix}:f>)\n` : '') +
        `• **Roles:** ${rolesList}\n` +
        `• **Total Server Members:** \`${guild.memberCount}\``
      )
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .setTimestamp();

    dispatchLog(guild, 'joinleave', embed);
    dispatchLog(guild, 'members', embed);
  });

  client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const key = `guildMemberUpdate:${newMember.guild.id}:${newMember.id}:${Date.now().toString().slice(0, -3)}`;
    if (isDuplicateEvent(key)) return;

    const changes = [];
    if (oldMember.nickname !== newMember.nickname) {
      changes.push(`• **Nickname:** \`${oldMember.nickname || oldMember.user.username}\` ➔ **\`${newMember.nickname || newMember.user.username}\`**`);
    }

    const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
    const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

    if (addedRoles.size > 0) {
      changes.push(`• **Role Added:** ${addedRoles.map(r => `<@&${r.id}> (**${r.name}**)`).join(', ')}`);
    }
    if (removedRoles.size > 0) {
      changes.push(`• **Role Removed:** ${removedRoles.map(r => `<@&${r.id}> (**${r.name}**)`).join(', ')}`);
    }

    if (changes.length === 0) return;

    const executor = await fetchAuditLogExecutor(newMember.guild, AuditLogEvent.MemberRoleUpdate, newMember.id);

    if (executor) {
      const { checkAndIncrementModAction, dispatchLimitLog } = require('../commands/modlimits');
      const quota = checkAndIncrementModAction(newMember.guild.id, executor.id, 'memberUpdate', newMember.guild);
      dispatchLimitLog(newMember.guild, {
        actionTitle: 'Member Role Update',
        executor: executor,
        target: newMember.user,
        details: changes.join('\n'),
        remaining: quota.remaining !== undefined ? quota.remaining : 'Unlimited',
        resetAt: quota.resetAt
      });
    }

    const roleActionText = addedRoles.size > 0 ? `Added: ${addedRoles.map(r => r.name).join(', ')}` : (removedRoles.size > 0 ? `Removed: ${removedRoles.map(r => r.name).join(', ')}` : 'Nickname Updated');

    const infoBox = createDynamicBox('MEMBER ROLE / PROFILE UPDATE', [
      `Target   : ${newMember.user.tag || newMember.user.username}`,
      `Executor : ${executor ? (executor.tag || executor.username) : 'User / Admin'}`,
      `Action   : ${roleActionText}`
    ]);

    const embed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle(`${emojis.ROLES || '🎭'} Member Role / Profile Updated`)
      .setDescription(
        '```\n' + infoBox + '\n```\n\n' +
        `• **Member:** <@${newMember.id}> (\`${newMember.user.tag}\`)\n\n` +
        `**Changes:**\n${changes.join('\n')}\n\n` +
        `• **Updated By:** ${executor ? `<@${executor.id}> (\`${executor.tag}\`)` : '`User / Admin`'}`
      )
      .setTimestamp();

    dispatchLog(newMember.guild, 'roles', embed);
    dispatchLog(newMember.guild, 'members', embed);
  });

  // ─────────────────────────────────────────
  // 5. 🔨 BAN & UNBAN EVENTS (guildBanAdd, guildBanRemove)
  // ─────────────────────────────────────────
  client.on('guildBanAdd', async (ban) => {
    const key = `guildBanAdd:${ban.guild.id}:${ban.user.id}`;
    if (isDuplicateEvent(key)) return;

    const executor = await fetchAuditLogExecutor(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);

    const infoBox = createDynamicBox('MEMBER BANNED FROM SERVER', [
      `Target   : ${ban.user.tag || ban.user.username}`,
      `ID       : ${ban.user.id}`,
      `Executor : ${executor ? (executor.tag || executor.username) : 'Unknown'}`
    ]);

    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle(`${emojis.REMOVE || '🔨'} Member Banned in Server Settings`)
      .setDescription(
        '```\n' + infoBox + '\n```\n\n' +
        `• **Banned User:** <@${ban.user.id}> (\`${ban.user.tag}\`)\n` +
        `• **User ID:** \`${ban.user.id}\`\n` +
        `• **Reason:** \`${ban.reason || 'No reason provided'}\`\n` +
        `• **Banned By:** ${executor ? `<@${executor.id}> (\`${executor.tag}\`)` : '`Unknown`'}`
      )
      .setTimestamp();

    dispatchLog(ban.guild, 'banunban', embed);
    dispatchLog(ban.guild, 'server', embed);
  });

  client.on('guildBanRemove', async (ban) => {
    const key = `guildBanRemove:${ban.guild.id}:${ban.user.id}`;
    if (isDuplicateEvent(key)) return;

    const executor = await fetchAuditLogExecutor(ban.guild, AuditLogEvent.MemberBanRemove, ban.user.id);

    const infoBox = createDynamicBox('MEMBER UNBANNED FROM SERVER', [
      `Target   : ${ban.user.tag || ban.user.username}`,
      `ID       : ${ban.user.id}`,
      `Executor : ${executor ? (executor.tag || executor.username) : 'Unknown'}`
    ]);

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle(`${emojis.UNLOCK || '🔓'} Member Unbanned in Server Settings`)
      .setDescription(
        '```\n' + infoBox + '\n```\n\n' +
        `• **Unbanned User:** <@${ban.user.id}> (\`${ban.user.tag}\`)\n` +
        `• **User ID:** \`${ban.user.id}\`\n` +
        `• **Unbanned By:** ${executor ? `<@${executor.id}> (\`${executor.tag}\`)` : '`Unknown`'}`
      )
      .setTimestamp();

    dispatchLog(ban.guild, 'banunban', embed);
    dispatchLog(ban.guild, 'server', embed);
  });

  // ─────────────────────────────────────────
  // 6. ✉️ INVITE CREATED, DELETED & POSTED LOGS
  // ─────────────────────────────────────────
  client.on('inviteCreate', async (invite) => {
    if (!invite.guild) return;
    const key = `inviteCreate:${invite.guild.id}:${invite.code}`;
    if (isDuplicateEvent(key)) return;

    const expiryText = invite.maxAge === 0 ? 'Never' : (invite.expiresAt ? `<t:${Math.floor(invite.expiresAt.getTime()/1000)}:R>` : 'Unknown');

    const infoBox = createDynamicBox('DISCORD INVITE CREATED', [
      `Code     : ${invite.code}`,
      `Channel  : ${invite.channel ? invite.channel.name : 'Unknown'}`,
      `Creator  : ${invite.inviter ? (invite.inviter.tag || invite.inviter.username) : 'Unknown'}`,
      `Max Uses : ${invite.maxUses === 0 ? 'Unlimited' : invite.maxUses}`
    ]);

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle(`${emojis.INVITELINK || '✉️'} Invite Created in Server Settings`)
      .setDescription(
        '```\n' + infoBox + '\n```\n\n' +
        `• **Invite Link:** \`https://discord.gg/${invite.code}\`\n` +
        `• **Channel:** ${invite.channel ? '<#' + invite.channel.id + '>' : 'Unknown'}\n` +
        `• **Creator:** ${invite.inviter ? `<@${invite.inviter.id}> (\`${invite.inviter.tag}\`)` : '`Unknown`'}\n` +
        `• **Expires:** ${expiryText}\n` +
        `• **Max Uses:** \`${invite.maxUses === 0 ? 'Unlimited' : invite.maxUses}\``
      )
      .setTimestamp();

    dispatchLog(invite.guild, 'invites', embed);
    dispatchLog(invite.guild, 'server', embed);
  });

  client.on('inviteDelete', async (invite) => {
    if (!invite.guild) return;
    const key = `inviteDelete:${invite.guild.id}:${invite.code}`;
    if (isDuplicateEvent(key)) return;

    const executor = await fetchAuditLogExecutor(invite.guild, AuditLogEvent.InviteDelete);

    const infoBox = createDynamicBox('DISCORD INVITE DELETED', [
      `Code     : ${invite.code}`,
      `Channel  : ${invite.channel ? invite.channel.name : 'Unknown'}`,
      `Executor : ${executor ? (executor.tag || executor.username) : 'Unknown'}`
    ]);

    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle(`${emojis.REMOVE || '🗑️'} Invite Deleted in Server Settings`)
      .setDescription(
        '```\n' + infoBox + '\n```\n\n' +
        `• **Invite Code:** \`discord.gg/${invite.code}\`\n` +
        `• **Channel:** ${invite.channel ? '<#' + invite.channel.id + '>' : 'Unknown'}\n` +
        `• **Deleted By:** ${executor ? `<@${executor.id}> (\`${executor.tag}\`)` : '`Unknown / Expired`'}`
      )
      .setTimestamp();

    dispatchLog(invite.guild, 'invites', embed);
    dispatchLog(invite.guild, 'server', embed);
  });

  // Detect Invite Link Posted in Text Chat
  client.on('messageCreate', async (message) => {
    if (!message.guild || message.author.bot) return;

    const inviteRegex = /(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li|com\/invite))\/[a-zA-Z0-9-]+/gi;
    const matches = message.content.match(inviteRegex);
    if (!matches || matches.length === 0) return;

    const postedLink = matches[0];
    const key = `invitePosted:${message.guild.id}:${message.author.id}:${postedLink}:${Date.now().toString().slice(0, -3)}`;
    if (isDuplicateEvent(key)) return;

    const infoBox = createDynamicBox('DISCORD INVITE LINK POSTED IN CHAT', [
      `Author   : ${message.author.tag || message.author.username}`,
      `Channel  : ${message.channel.name}`,
      `Link     : ${postedLink}`
    ]);

    const embed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle(`${emojis.WARNING || '⚠️'} Invite Link Posted in Chat`)
      .setDescription(
        '```\n' + infoBox + '\n```\n\n' +
        `• **Author:** <@${message.author.id}> (\`${message.author.tag}\`)\n` +
        `• **Channel:** <#${message.channel.id}>\n` +
        `• **Invite URL:** \`${postedLink}\`\n` +
        `• **Content:** \`\`\`\n${message.content.slice(0, 500)}\n\`\`\``
      )
      .setTimestamp();

    dispatchLog(message.guild, 'invites', embed);
    dispatchLog(message.guild, 'server', embed);
  });

  // ─────────────────────────────────────────
  // 7. 🤖 AUTOMOD RULE EVENTS (autoModerationRuleCreate, autoModerationRuleUpdate, autoModerationRuleDelete)
  // ─────────────────────────────────────────
  client.on('autoModerationRuleCreate', async (rule) => {
    if (!rule.guild) return;
    const key = `autoModCreate:${rule.guild.id}:${rule.id}`;
    if (isDuplicateEvent(key)) return;

    const infoBox = createDynamicBox('AUTOMOD RULE CREATED', [
      `Rule Name : ${rule.name}`,
      `Rule ID   : ${rule.id}`,
      `Creator   : ${rule.creatorId ? rule.creatorId : 'System/Admin'}`
    ]);

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle(`${emojis.AUTOMOD || '🤖'} AutoMod Rule Created in Server Settings`)
      .setDescription(
        '```\n' + infoBox + '\n```\n\n' +
        `• **Rule Name:** \`${rule.name}\`\n` +
        `• **Rule ID:** \`${rule.id}\`\n` +
        `• **Created By:** ${rule.creatorId ? `<@${rule.creatorId}>` : '`System/Admin`'}`
      )
      .setTimestamp();

    dispatchLog(rule.guild, 'automod', embed);
  });

  client.on('autoModerationRuleUpdate', async (oldRule, newRule) => {
    if (!newRule.guild) return;
    const key = `autoModUpdate:${newRule.guild.id}:${newRule.id}:${Date.now().toString().slice(0, -3)}`;
    if (isDuplicateEvent(key)) return;

    const executor = await fetchAuditLogExecutor(newRule.guild, AuditLogEvent.AutoModerationRuleUpdate);

    const infoBox = createDynamicBox('AUTOMOD RULE CONTENT UPDATED', [
      `Rule Name : ${newRule.name}`,
      `Rule ID   : ${newRule.id}`,
      `Executor  : ${executor ? (executor.tag || executor.username) : 'System/Admin'}`
    ]);

    const embed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle(`${emojis.AUTOMOD || '🤖'} Discord AutoMod Rule Content Updated`)
      .setDescription(
        '```\n' + infoBox + '\n```\n\n' +
        `• **Rule Name:** \`${newRule.name}\`\n` +
        `• **Rule ID:** \`${newRule.id}\`\n` +
        `• **Updated By:** ${executor ? `<@${executor.id}> (\`${executor.tag}\`)` : '`Admin`'}`
      )
      .setTimestamp();

    dispatchLog(newRule.guild, 'automod', embed);
  });

  client.on('autoModerationRuleDelete', async (rule) => {
    if (!rule.guild) return;
    const key = `autoModDelete:${rule.guild.id}:${rule.id}`;
    if (isDuplicateEvent(key)) return;

    const infoBox = createDynamicBox('AUTOMOD RULE DELETED', [
      `Rule Name : ${rule.name}`,
      `Rule ID   : ${rule.id}`
    ]);

    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle(`${emojis.AUTOMOD || '🤖'} AutoMod Rule Deleted in Server Settings`)
      .setDescription(
        '```\n' + infoBox + '\n```\n\n' +
        `• **Rule Name:** \`${rule.name}\`\n` +
        `• **Rule ID:** \`${rule.id}\``
      )
      .setTimestamp();

    dispatchLog(rule.guild, 'automod', embed);
  });
};
