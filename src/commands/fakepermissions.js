const {
  PermissionsBitField,
  EmbedBuilder
} = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const { createDynamicBox } = require('../utils/boxBuilder');
const emojis = require('../utils/emojis');

// ─────────────────────────────────────────
// FAKE PERMISSIONS STORE
// Stored in-memory (persists during session)
// Structure: guildId → { roles: { roleId: [perms...] }, users: { userId: [perms...] } }
// ─────────────────────────────────────────
const fakePermsStore = new Map();

function getGuildData(guildId) {
  if (!fakePermsStore.has(guildId)) {
    fakePermsStore.set(guildId, { roles: {}, users: {} });
  }
  return fakePermsStore.get(guildId);
}

// All valid fake permission names (subset of ProBot's permissions)
const VALID_FAKE_PERMS = [
  'administrator', 'manage_guild', 'manage_roles', 'manage_channels',
  'manage_messages', 'manage_nicknames', 'manage_webhooks', 'manage_emojis',
  'kick_members', 'ban_members', 'mute_members', 'deafen_members',
  'move_members', 'moderate_members', 'view_audit_log',
  'send_messages', 'embed_links', 'attach_files', 'add_reactions',
  'mention_everyone', 'read_message_history', 'use_application_commands'
];

function normalizePerm(str) {
  return str?.toLowerCase().replace(/ /g, '_').replace(/-/g, '_') || '';
}

function isValidPerm(perm) {
  return VALID_FAKE_PERMS.includes(normalizePerm(perm));
}

function buildPermsList(perms) {
  if (!perms || perms.length === 0) return '*(none)*';
  return perms.map(p => `\`${p}\``).join(', ');
}

module.exports = {
  name: 'fakepermissions',
  description: 'Assign fake display permissions to roles or users (cosmetic only, no real Discord perms changed)',
  aliases: [
    'fakeperm', 'fakeperms', 'fp',
    'fakepermissionslist', 'fakepermissionsreset',
    'fakepermissionsremove', 'fakepermissionsuser'
  ],

  async execute(message, args) {
    // Require Manage Guild permission to use fake permissions
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ManageGuild) &&
      message.guild.ownerId !== message.author.id
    ) {
      return message.reply(`<a:wrong_animated:1537179702928875631> You need **Manage Server** permission to use fake permissions.`);
    }

    const rawFirstWord = message.content.trim().split(/ +/)[0] || '';
    const invoked = rawFirstWord.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();

    // Normalize subcommand
    let sub = args[0]?.toLowerCase();
    let sub2 = args[1]?.toLowerCase();

    // Handle .fakepermissionsuser → user branch
    if (invoked === 'fakepermissionsuser') {
      sub = 'user';
      sub2 = args[0]?.toLowerCase();
    }

    const guild = message.guild;
    const author = message.author;
    const data = getGuildData(guild.id);

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // ─────────────────────────────────────────
    // ROLE BRANCH: add / remove / reset / list
    // ─────────────────────────────────────────

    // .fakepermissions add <@role> <permission>
    if (sub === 'add') {
      const role = message.mentions.roles.first() || guild.roles.cache.get(args[1]);
      const perm = normalizePerm(args[2] || args[1]);

      if (!role) return message.reply(`<a:wrong_animated:1537179702928875631> Usage: \`.fakepermissions add <@role> <permission>\``);
      if (!perm || !isValidPerm(perm)) {
        return message.reply(
          `<a:wrong_animated:1537179702928875631> Invalid permission \`${perm}\`. Use \`.fakepermissions list\` to see valid permissions.\n` +
          `> Valid: ${VALID_FAKE_PERMS.slice(0, 8).map(p => `\`${p}\``).join(', ')} *...and more*`
        );
      }

      if (!data.roles[role.id]) data.roles[role.id] = [];
      if (!data.roles[role.id].includes(perm)) data.roles[role.id].push(perm);

      return message.reply(
        `${emojis.SUCCESS || '<a:accept_animated:1537177319603703969>'} Added fake permission \`${perm}\` to role **${role.name}**!\n` +
        `> *This is cosmetic only — no real Discord permissions were changed.*`
      );
    }

    // .fakepermissions remove <@role> <permission>
    if (sub === 'remove' && sub2 !== 'user') {
      const role = message.mentions.roles.first() || guild.roles.cache.get(args[1]);
      const perm = normalizePerm(args[2] || args[1]);

      if (!role || !perm) return message.reply(`<a:wrong_animated:1537179702928875631> Usage: \`.fakepermissions remove <@role> <permission>\``);

      if (data.roles[role.id]) {
        data.roles[role.id] = data.roles[role.id].filter(p => p !== perm);
      }

      return message.reply(`${emojis.SUCCESS || '<a:accept_animated:1537177319603703969>'} Removed fake permission \`${perm}\` from role **${role.name}**.`);
    }

    // .fakepermissions reset <@role>
    if (sub === 'reset' && sub2 !== 'user') {
      const role = message.mentions.roles.first() || guild.roles.cache.get(args[1]);
      if (!role) return message.reply(`<a:wrong_animated:1537179702928875631> Usage: \`.fakepermissions reset <@role>\``);

      delete data.roles[role.id];
      return message.reply(`${emojis.SUCCESS || '<a:accept_animated:1537177319603703969>'} Reset all fake permissions for role **${role.name}**.`);
    }

    // .fakepermissions list [<@role>]
    if (sub === 'list' && sub2 !== 'user') {
      const role = message.mentions.roles.first() || guild.roles.cache.get(args[1]);

      if (role) {
        // List for a specific role
        const perms = data.roles[role.id] || [];
        const embed = createStyledEmbed({
          title: `🔐 Fake Permissions — ${role.name}`,
          description:
            `**Role:** ${role}\n\n` +
            `**Assigned Fake Permissions (${perms.length}):**\n` +
            (perms.length > 0
              ? perms.map((p, i) => `\`${i + 1}.\` \`${p}\``).join('\n')
              : '*No fake permissions assigned to this role.*'),
          requestedBy: author,
          clientUser
        });
        return message.channel.send({ embeds: [embed] });
      }

      // List ALL roles with fake perms
      const roleEntries = Object.entries(data.roles).filter(([, v]) => v.length > 0);
      const userEntries = Object.entries(data.users).filter(([, v]) => v.length > 0);

      if (roleEntries.length === 0 && userEntries.length === 0) {
        return message.reply(`📭 No fake permissions have been assigned in **${guild.name}** yet.`);
      }

      let desc = '';
      if (roleEntries.length > 0) {
        desc += `**📋 Roles with Fake Permissions:**\n`;
        roleEntries.forEach(([roleId, perms]) => {
          const r = guild.roles.cache.get(roleId);
          desc += `${r ? r.toString() : `\`${roleId}\``} — ${buildPermsList(perms)}\n`;
        });
      }
      if (userEntries.length > 0) {
        desc += `\n**<a:membercard_animated:1537177436146638993> Users with Fake Permissions:**\n`;
        userEntries.forEach(([userId, perms]) => {
          desc += `<@${userId}> — ${buildPermsList(perms)}\n`;
        });
      }

      const embed = createStyledEmbed({
        title: `🔐 Fake Permissions — ${guild.name}`,
        description: desc,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // ─────────────────────────────────────────
    // USER BRANCH: user add / user list / user remove / user reset
    // ─────────────────────────────────────────
    if (sub === 'user') {
      const action = sub2; // add / list / remove / reset

      // .fakepermissions user add <@user> <permission>
      if (action === 'add') {
        const user = message.mentions.users.first();
        const perm = normalizePerm(args[3] || args[2]);

        if (!user || !perm || !isValidPerm(perm)) {
          return message.reply(
            `<a:wrong_animated:1537179702928875631> Usage: \`.fakepermissions user add <@user> <permission>\`\n` +
            `> Example: \`.fakepermissions user add @User manage_messages\``
          );
        }

        if (!data.users[user.id]) data.users[user.id] = [];
        if (!data.users[user.id].includes(perm)) data.users[user.id].push(perm);

        return message.reply(
          `${emojis.SUCCESS || '<a:accept_animated:1537177319603703969>'} Added fake permission \`${perm}\` to user **${user.username}**!\n` +
          `> *This is cosmetic only — no real Discord permissions were changed.*`
        );
      }

      // .fakepermissions user list [<@user>]
      if (action === 'list') {
        const user = message.mentions.users.first() || (args[2] ? await message.client.users.fetch(args[2]).catch(() => null) : null);

        if (user) {
          const perms = data.users[user.id] || [];
          const embed = createStyledEmbed({
            title: `🔐 Fake Permissions — ${user.username}`,
            description:
              `**User:** <@${user.id}>\n\n` +
              `**Assigned Fake Permissions (${perms.length}):**\n` +
              (perms.length > 0
                ? perms.map((p, i) => `\`${i + 1}.\` \`${p}\``).join('\n')
                : '*No fake permissions assigned to this user.*'),
            requestedBy: author,
            clientUser
          });
          return message.channel.send({ embeds: [embed] });
        }

        return message.reply(`<a:wrong_animated:1537179702928875631> Usage: \`.fakepermissions user list <@user>\``);
      }

      // .fakepermissions user remove <@user> <permission>
      if (action === 'remove') {
        const user = message.mentions.users.first();
        const perm = normalizePerm(args[3] || args[2]);

        if (!user || !perm) {
          return message.reply(`<a:wrong_animated:1537179702928875631> Usage: \`.fakepermissions user remove <@user> <permission>\``);
        }

        if (data.users[user.id]) {
          data.users[user.id] = data.users[user.id].filter(p => p !== perm);
        }

        return message.reply(`${emojis.SUCCESS || '<a:accept_animated:1537177319603703969>'} Removed fake permission \`${perm}\` from user **${user.username}**.`);
      }

      // .fakepermissions user reset <@user>
      if (action === 'reset') {
        const user = message.mentions.users.first() || (args[2] ? await message.client.users.fetch(args[2]).catch(() => null) : null);
        if (!user) return message.reply(`<a:wrong_animated:1537179702928875631> Usage: \`.fakepermissions user reset <@user>\``);

        delete data.users[user.id];
        return message.reply(`${emojis.SUCCESS || '<a:accept_animated:1537177319603703969>'} Reset all fake permissions for user **${user.username}**.`);
      }

      // .fakepermissions user (no action) — show user help
    }

    // ─────────────────────────────────────────
    // DEFAULT: Help Dashboard
    // ─────────────────────────────────────────
    const validPermsBox = createDynamicBox('VALID PERMISSIONS', VALID_FAKE_PERMS.slice(0, 12).map(p => p), 20, 26);

    const roleBox = createDynamicBox('ROLE COMMANDS', [
      { key: 'add    ', value: '<@role> <perm>' },
      { key: 'remove ', value: '<@role> <perm>' },
      { key: 'reset  ', value: '<@role>' },
      { key: 'list   ', value: '[<@role>]' }
    ], 20, 22);

    const userBox = createDynamicBox('USER COMMANDS', [
      { key: 'user add   ', value: '<@user> <perm>' },
      { key: 'user list  ', value: '<@user>' },
      { key: 'user remove', value: '<@user> <perm>' },
      { key: 'user reset ', value: '<@user>' }
    ], 20, 22);

    const embed = createStyledEmbed({
      title: `🔐 Fake Permissions Manager`,
      subtitle: `${guild.name} — Cosmetic Role & User Permissions`,
      description:
        `> *Fake permissions are **cosmetic only** — they appear in \`.fakepermissions list\` but do NOT grant real Discord permissions.*\n\n` +
        `🎭 **Role Commands**\n` +
        '```\n' + roleBox + '\n```\n\n' +
        `<a:membercard_animated:1537177436146638993> **User Commands**\n` +
        '```\n' + userBox + '\n```\n\n' +
        `📋 **Valid Permissions** *(partial list)*\n` +
        '```\n' + validPermsBox + '\n```',
      requestedBy: author,
      clientUser
    });

    return message.channel.send({ embeds: [embed] });
  }
};
