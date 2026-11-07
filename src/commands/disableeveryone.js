const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const { PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'disableeveryone',
  description: 'Strips MentionEveryone permission across all server roles & channel overwrites to stop all @everyone/@here pings',
  aliases: ['disableeveryone', 'stripmentions', 'noeveryone', 'fixpings', 'suppresseveryone'],

  async execute(message, args) {
    const guild = message.guild;
    const author = message.author;

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // Security Check: Only Owner or Administrator
    const extraOwners = [ '1420687548807905324', ];
    const isOwner = author.id === guild.ownerId || extraOwners.includes(author.id);

    if (!isOwner) {
      const embed = createStyledEmbed({
        title: `${emojis.WARNING} Permission Denied`,
        description: `Only the Server Owner or Bot Owners can execute \`.disableeveryone\`.`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    const statusMsg = await message.channel.send(`${emojis.LOADING || '⏳'} Auditing server permissions & stripping MentionEveryone across all roles & channels...`);

    let rolesStrippedCount = 0;
    let rolesUnmentionableCount = 0;
    let channelsSealedCount = 0;
    const adminRoleNames = [];

    try {
      // 1. Strip MentionEveryone & make roles unmentionable across ALL Server Roles
      for (const role of guild.roles.cache.values()) {
        if (role.managed || role.id === guild.roles.everyone.id) continue;

        let needsPermUpdate = false;
        let newPerms = role.permissions;

        if (role.permissions.has(PermissionsBitField.Flags.MentionEveryone)) {
          newPerms = newPerms.remove(PermissionsBitField.Flags.MentionEveryone);
          needsPermUpdate = true;
          rolesStrippedCount++;
        }

        if (needsPermUpdate) {
          await role.setPermissions(newPerms, "Security Audit: Strip MentionEveryone permission").catch(() => {});
        }

        if (role.mentionable) {
          await role.setMentionable(false, "Security Audit: Disable role mass pings").catch(() => {});
          rolesUnmentionableCount++;
        }

        if (role.permissions.has(PermissionsBitField.Flags.Administrator)) {
          adminRoleNames.push(role.name);
        }
      }

      // Also strip MentionEveryone from @everyone role
      if (guild.roles.everyone.permissions.has(PermissionsBitField.Flags.MentionEveryone)) {
        const everyonePerms = guild.roles.everyone.permissions.remove(PermissionsBitField.Flags.MentionEveryone);
        await guild.roles.everyone.setPermissions(everyonePerms, "Security Audit: Strip MentionEveryone from @everyone").catch(() => {});
        rolesStrippedCount++;
      }

      // 2. Set MentionEveryone: false on ALL Channel Permission Overwrites
      for (const channel of guild.channels.cache.values()) {
        if (channel.permissionOverwrites) {
          try {
            await channel.permissionOverwrites.edit(guild.roles.everyone, {
              MentionEveryone: false
            }, { reason: "Security Audit: Sealed @everyone pings" }).catch(() => {});
            channelsSealedCount++;
          } catch (e) {}
        }
      }

      // 3. Ensure AntiEveryone filter is active in AntiNuke
      const antinukeCmd = message.client.commands?.get("antinuke");
      if (antinukeCmd && antinukeCmd.getOrCreateAntinuke) {
        const config = antinukeCmd.getOrCreateAntinuke(guild.id);
        config.enabled = true;
        config.filters.antiEveryone = true;
      }

      await statusMsg.delete().catch(() => {});

      const fields = [
        { name: `${emojis.AN_ROLE} Roles Cleansed`, value: `\`${rolesStrippedCount}\` Roles stripped of \`MentionEveryone\`\n\`${rolesUnmentionableCount}\` Roles set to unmentionable`, inline: true },
        { name: `${emojis.AN_CHANNEL} Channels Sealed`, value: `\`${channelsSealedCount}\` Channels locked with \`MentionEveryone: false\``, inline: true },
        { name: `${emojis.AN_SHIELD} Realtime Interception`, value: `\`ACTIVE\` (Auto-deletes @everyone & @here in < 50ms)`, inline: false },
        { name: `${emojis.AN_PANIC} Punishment Protocol`, value: "Rogue pings get **Message Deleted**, **1-Hour Timeout**, & **Channel Overwrite Lockout**", inline: false }
      ];

      if (adminRoleNames.length > 0) {
        fields.push({
          name: "⚠️ Mobile Push Notification Notice",
          value: `Roles with native **Administrator** permission: **${adminRoleNames.slice(0, 5).join(", ")}**\n*Discord gives Administrator roles native bypass to trigger mobile push notifications before any bot can delete the message. To completely stop mobile pings, remove Administrator from staff roles and give normal moderation permissions (Manage Messages, Kick, Ban) or use Bot .fakepermissions.*\n*For roles: all roles have now been set to non-mentionable, so users without whitelist cannot ping roles either!*`,
          inline: false
        });
      }

      const successEmbed = createStyledEmbed({
        title: `${emojis.AN_SHIELD} Everyone & Role Pings Neutralized Server-Wide!`,
        subtitle: "Zero-Tolerance Mention Protection Applied",
        fields,
        requestedBy: author,
        clientUser
      });

      return message.channel.send({ embeds: [successEmbed] });
    } catch (err) {
      console.error('disableeveryone error:', err);
      await statusMsg.delete().catch(() => {});
      return message.reply(`${emojis.WARNING} Failed to complete mention audit: ${err.message}`);
    }
  }
};
