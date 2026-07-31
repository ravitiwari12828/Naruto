const { AuditLogEvent, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { dispatchLog } = require('../utils/logger');

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

  // 1. ⚙️ SERVER PROFILE & SETTINGS UPDATE (guildUpdate)
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
    if (oldGuild.systemChannelId !== newGuild.systemChannelId) {
      changes.push(`• **System Channel:** ${oldGuild.systemChannelId ? '<#' + oldGuild.systemChannelId + '>' : 'None'} ➔ ${newGuild.systemChannelId ? '<#' + newGuild.systemChannelId + '>' : 'None'}`);
    }
    if (oldGuild.vanityURLCode !== newGuild.vanityURLCode) {
      changes.push(`• **Vanity URL:** \`${oldGuild.vanityURLCode || 'None'}\` ➔ \`${newGuild.vanityURLCode || 'None'}\``);
    }

    if (changes.length === 0) return;

    const executor = await fetchAuditLogExecutor(newGuild, AuditLogEvent.GuildUpdate);

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('⚙️ Server Settings Updated')
      .setDescription(
        `**Changes Made in Server Settings:**\n${changes.join('\n')}\n\n` +
        `• **Updated By:** ${executor ? `<@${executor.id}> (\`${executor.tag}\`)` : '`Unknown / Audit Log Expired`'}`
      )
      .setThumbnail(newGuild.iconURL({ dynamic: true }) || undefined)
      .setTimestamp();

    dispatchLog(newGuild, 'server', embed);
  });

  // 2. 🎭 ROLES (roleCreate, roleUpdate, roleDelete)
  client.on('roleCreate', async (role) => {
    const key = `roleCreate:${role.guild.id}:${role.id}`;
    if (isDuplicateEvent(key)) return;

    const executor = await fetchAuditLogExecutor(role.guild, AuditLogEvent.RoleCreate, role.id);

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('🎭 Role Created in Server Settings')
      .setDescription(
        `• **Role:** <@&${role.id}> (\`${role.name}\`)\n` +
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

    const embed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle('🎭 Role Modified in Server Settings')
      .setDescription(
        `• **Role:** <@&${newRole.id}>\n\n` +
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

    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle('🗑️ Role Deleted in Server Settings')
      .setDescription(
        `• **Role Name:** \`${role.name}\`\n` +
        `• **Role ID:** \`${role.id}\`\n` +
        `• **Deleted By:** ${executor ? `<@${executor.id}> (\`${executor.tag}\`)` : '`Unknown`'}`
      )
      .setTimestamp();

    dispatchLog(role.guild, 'roles', embed);
  });

  // 3. 📁 CHANNELS (channelCreate, channelUpdate, channelDelete)
  client.on('channelCreate', async (channel) => {
    if (!channel.guild) return;
    const key = `channelCreate:${channel.guild.id}:${channel.id}`;
    if (isDuplicateEvent(key)) return;

    const executor = await fetchAuditLogExecutor(channel.guild, AuditLogEvent.ChannelCreate, channel.id);

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('📁 Channel Created in Server Settings')
      .setDescription(
        `• **Channel:** <#${channel.id}> (\`${channel.name}\`)\n` +
        `• **Type:** \`${channel.type}\`\n` +
        `• **Category:** ${channel.parent ? channel.parent.name : 'None'}\n` +
        `• **Created By:** ${executor ? `<@${executor.id}> (\`${executor.tag}\`)` : '`Unknown`'}`
      )
      .setTimestamp();

    dispatchLog(channel.guild, 'channels', embed);
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
      changes.push(`• **Topic:** \`${oldChannel.topic || 'None'}\` ➔ \`${newChannel.topic || 'None'}\``);
    }
    if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
      changes.push(`• **Slowmode:** \`${oldChannel.rateLimitPerUser}s\` ➔ \`${newChannel.rateLimitPerUser}s\``);
    }

    if (changes.length === 0) return;

    const executor = await fetchAuditLogExecutor(newChannel.guild, AuditLogEvent.ChannelUpdate, newChannel.id);

    const embed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle('📁 Channel Modified in Server Settings')
      .setDescription(
        `• **Channel:** <#${newChannel.id}>\n\n` +
        `**Changes:**\n${changes.join('\n')}\n\n` +
        `• **Modified By:** ${executor ? `<@${executor.id}> (\`${executor.tag}\`)` : '`Unknown`'}`
      )
      .setTimestamp();

    dispatchLog(newChannel.guild, 'channels', embed);
  });

  client.on('channelDelete', async (channel) => {
    if (!channel.guild) return;
    const key = `channelDelete:${channel.guild.id}:${channel.id}`;
    if (isDuplicateEvent(key)) return;

    const executor = await fetchAuditLogExecutor(channel.guild, AuditLogEvent.ChannelDelete, channel.id);

    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle('🗑️ Channel Deleted in Server Settings')
      .setDescription(
        `• **Channel Name:** \`${channel.name}\`\n` +
        `• **Channel ID:** \`${channel.id}\`\n` +
        `• **Type:** \`${channel.type}\`\n` +
        `• **Deleted By:** ${executor ? `<@${executor.id}> (\`${executor.tag}\`)` : '`Unknown`'}`
      )
      .setTimestamp();

    dispatchLog(channel.guild, 'channels', embed);
  });

  // 4. 👥 MEMBERS / PEOPLE (guildMemberUpdate)
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
      changes.push(`• **Role Added:** ${addedRoles.map(r => `<@&${r.id}>`).join(', ')}`);
    }
    if (removedRoles.size > 0) {
      changes.push(`• **Role Removed:** ${removedRoles.map(r => `<@&${r.id}>`).join(', ')}`);
    }

    if (changes.length === 0) return;

    const executor = await fetchAuditLogExecutor(newMember.guild, AuditLogEvent.MemberRoleUpdate, newMember.id);

    if (executor) {
      const { checkAndIncrementModAction, dispatchLimitLog } = require('../commands/modlimits');
      const quota = checkAndIncrementModAction(newMember.guild.id, executor.id, 'memberUpdate');
      dispatchLimitLog(newMember.guild, {
        actionTitle: 'Member Role Update',
        executor: executor,
        target: newMember.user,
        details: changes.join('\n'),
        remaining: quota.remaining !== undefined ? quota.remaining : 'Unlimited',
        resetAt: quota.resetAt
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle('👥 Member Roles / Nickname Changed in Server Settings')
      .setDescription(
        `• **Member:** <@${newMember.id}> (\`${newMember.user.tag}\`)\n\n` +
        `**Changes:**\n${changes.join('\n')}\n\n` +
        `• **Updated By:** ${executor ? `<@${executor.id}> (\`${executor.tag}\`)` : '`User / Admin`'}`
      )
      .setTimestamp();

    dispatchLog(newMember.guild, 'members', embed);
  });

  // 5. 🔨 BANS (guildBanAdd, guildBanRemove)
  client.on('guildBanAdd', async (ban) => {
    const key = `guildBanAdd:${ban.guild.id}:${ban.user.id}`;
    if (isDuplicateEvent(key)) return;

    const executor = await fetchAuditLogExecutor(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);

    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle('🔨 Member Banned in Server Settings')
      .setDescription(
        `• **Banned User:** <@${ban.user.id}> (\`${ban.user.tag}\`)\n` +
        `• **User ID:** \`${ban.user.id}\`\n` +
        `• **Reason:** \`${ban.reason || 'No reason provided'}\`\n` +
        `• **Banned By:** ${executor ? `<@${executor.id}> (\`${executor.tag}\`)` : '`Unknown`'}`
      )
      .setTimestamp();

    dispatchLog(ban.guild, 'banunban', embed);
  });

  client.on('guildBanRemove', async (ban) => {
    const key = `guildBanRemove:${ban.guild.id}:${ban.user.id}`;
    if (isDuplicateEvent(key)) return;

    const executor = await fetchAuditLogExecutor(ban.guild, AuditLogEvent.MemberBanRemove, ban.user.id);

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('🔓 Member Unbanned in Server Settings')
      .setDescription(
        `• **Unbanned User:** <@${ban.user.id}> (\`${ban.user.tag}\`)\n` +
        `• **User ID:** \`${ban.user.id}\`\n` +
        `• **Unbanned By:** ${executor ? `<@${executor.id}> (\`${executor.tag}\`)` : '`Unknown`'}`
      )
      .setTimestamp();

    dispatchLog(ban.guild, 'banunban', embed);
  });

  // 6. ✉️ INVITES (inviteCreate, inviteDelete)
  client.on('inviteCreate', async (invite) => {
    if (!invite.guild) return;
    const key = `inviteCreate:${invite.guild.id}:${invite.code}`;
    if (isDuplicateEvent(key)) return;

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('✉️ Server Invite Created in Server Settings')
      .setDescription(
        `• **Invite Code:** \`discord.gg/${invite.code}\`\n` +
        `• **Channel:** ${invite.channel ? '<#' + invite.channel.id + '>' : 'Unknown'}\n` +
        `• **Creator:** ${invite.inviter ? `<@${invite.inviter.id}> (\`${invite.inviter.tag}\`)` : '`Unknown`'}\n` +
        `• **Max Uses:** \`${invite.maxUses === 0 ? 'Infinite' : invite.maxUses}\``
      )
      .setTimestamp();

    dispatchLog(invite.guild, 'invites', embed);
  });

  client.on('inviteDelete', async (invite) => {
    if (!invite.guild) return;
    const key = `inviteDelete:${invite.guild.id}:${invite.code}`;
    if (isDuplicateEvent(key)) return;

    const executor = await fetchAuditLogExecutor(invite.guild, AuditLogEvent.InviteDelete);

    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle('🗑️ Server Invite Deleted in Server Settings')
      .setDescription(
        `• **Invite Code:** \`discord.gg/${invite.code}\`\n` +
        `• **Channel:** ${invite.channel ? '<#' + invite.channel.id + '>' : 'Unknown'}\n` +
        `• **Deleted By:** ${executor ? `<@${executor.id}> (\`${executor.tag}\`)` : '`Unknown / Expired`'}`
      )
      .setTimestamp();

    dispatchLog(invite.guild, 'invites', embed);
  });
};
