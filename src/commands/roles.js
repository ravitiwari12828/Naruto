const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');

// Global Server Special Roles Config Map (guildId -> { friend, girl, guest, official, vip, invcrole })
const serverRoleConfigs = new Map();

function getOrCreateRoleConfig(guildId) {
  if (!serverRoleConfigs.has(guildId)) {
    serverRoleConfigs.set(guildId, {
      friend: null,
      girl: null,
      guest: null,
      official: null,
      vip: null,
      invcrole: null,
      autonick: null
    });
  }
  return serverRoleConfigs.get(guildId);
}

const { PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'roles',
  description: 'Role Commands: autonick, cleanuproles, friend, girl, guest, invcrole, official, rolesetup, vip',
  aliases: [
    'rolesetup', 'friend', 'girl', 'guest',
    'invcrole', 'official', 'vip', 'autonick',
    'cleanuproles', 'deduplicateroles', 'removeroleduplicates', 'fixduplicateroles', 'cleanroles'
  ],

  async execute(message, args) {
    const rawFirstWord = message.content.trim().split(/ +/)[0] || '';
    const invoked = rawFirstWord.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();
    const author = message.author;
    const guildId = message.guild.id;
    const config = getOrCreateRoleConfig(guildId);

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // .cleanuproles / .deduplicateroles
    if (['cleanuproles', 'deduplicateroles', 'removeroleduplicates', 'fixduplicateroles', 'cleanroles'].includes(invoked) || (invoked === 'roles' && args[0] === 'cleanup')) {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && message.guild.ownerId !== author.id) {
        return message.reply(`${emojis.WARNING} Only Administrators and Server Owners can clean up duplicate roles.`);
      }

      const statusMsg = await message.channel.send(`⏳ **Scanning server roles and merging duplicate roles...**`);

      try {
        await message.guild.roles.fetch();
        const roleGroups = new Map();

        message.guild.roles.cache.forEach(role => {
          if (role.name === '@everyone' || role.managed) return;
          const key = role.name.trim().toLowerCase();
          if (!roleGroups.has(key)) roleGroups.set(key, []);
          roleGroups.get(key).push(role);
        });

        let deletedCount = 0;
        let mergedMembersCount = 0;
        const cleanedNames = [];

        for (const [name, roles] of roleGroups.entries()) {
          if (roles.length <= 1) continue;

          // Sort roles by position descending (keep highest role in hierarchy)
          roles.sort((a, b) => b.position - a.position);
          const keeperRole = roles[0];
          const duplicates = roles.slice(1);

          cleanedNames.push(keeperRole.name);

          for (const dup of duplicates) {
            // Re-assign members to keeperRole before deleting
            const membersWithDup = dup.members;
            for (const [memId, member] of membersWithDup.entries()) {
              if (!member.roles.cache.has(keeperRole.id)) {
                await member.roles.add(keeperRole.id).catch(() => {});
                mergedMembersCount++;
              }
            }
            await dup.delete('Merged duplicate role via .cleanuproles command').catch(() => {});
            deletedCount++;
          }
        }

        const { createDynamicBox } = require('../utils/boxBuilder');
        const boxPanel = createDynamicBox('ROLE DEDUPLICATION CLEANUP', [
          `Server     : ${message.guild.name}`,
          `Role Names : ${cleanedNames.length} Unique Roles Merged`,
          `Deleted    : ${deletedCount} Duplicate Roles`,
          `Re-assigned: ${mergedMembersCount} Member Roles`
        ]);

        const embed = createStyledEmbed({
          title: `🧹 Server Role Cleanup Complete`,
          description: '```\n' + boxPanel + '\n```\n\n' +
            (cleanedNames.length > 0
              ? `• **Cleaned Role Names:** \`${cleanedNames.join('`, `')}\`\n` +
                `• **Deleted Duplicates:** \`${deletedCount}\` roles removed\n` +
                `• **Members Re-assigned:** \`${mergedMembersCount}\` role assignments preserved`
              : `• **No Duplicate Roles Found!** All server roles are unique and clean.`),
          requestedBy: author,
          clientUser
        });

        return statusMsg.edit({ content: null, embeds: [embed] });
      } catch (err) {
        return statusMsg.edit(`❌ Error during role cleanup: ${err.message}`);
      }
    }

    // .rolesetup <type> <@role>
    if (invoked === 'rolesetup' || (invoked === 'roles' && args[0] === 'setup')) {
      const type = (invoked === 'rolesetup' ? args[0] : args[1])?.toLowerCase();
      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1] || args[2]);

      const validTypes = ['friend', 'girl', 'guest', 'official', 'vip', 'invcrole'];
      if (!type || !validTypes.includes(type) || !role) {
        return message.reply(`${emojis.WARNING} Usage: \`.rolesetup <friend|girl|guest|official|vip|invcrole> <@role>\``);
      }

      config[type] = role.id;
      serverRoleConfigs.set(guildId, config);

      const embed = createStyledEmbed({
        title: `🎭 Role Setup Saved`,
        description: `Successfully configured special role for **${type.toUpperCase()}** ➔ <@&${role.id}>!`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // .autonick <template>
    if (invoked === 'autonick' || (invoked === 'roles' && args[0] === 'autonick')) {
      const nickTemplate = (invoked === 'autonick' ? args : args.slice(1)).join(' ');
      if (!nickTemplate) {
        return message.reply(`${emojis.WARNING} Usage: \`.autonick <template>\` (Example: \`[Shinobi] {user}\`)`);
      }

      config.autonick = nickTemplate;
      serverRoleConfigs.set(guildId, config);

      const embed = createStyledEmbed({
        title: `🏷️ Auto Nickname Configured`,
        description: `New member auto nickname set to: \`${nickTemplate}\`\nUse \`{user}\` placeholder for member username.`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // .invcrole <@role>
    if (invoked === 'invcrole' || (invoked === 'roles' && args[0] === 'invcrole')) {
      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0] === 'invcrole' ? args[1] : args[0]);
      if (!role) {
        return message.reply(`${emojis.WARNING} Usage: \`.invcrole <@role>\` (Role automatically given when joining Voice Channel)`);
      }

      config.invcrole = role.id;
      serverRoleConfigs.set(guildId, config);

      const embed = createStyledEmbed({
        title: `🔊 In-VC Role Configured`,
        description: `Members joining Voice Channels will automatically receive <@&${role.id}>!`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // Direct role assign shortcuts: .friend, .girl, .guest, .official, .vip
    if (['friend', 'girl', 'guest', 'official', 'vip'].includes(invoked)) {
      const roleId = config[invoked];
      if (!roleId) {
        return message.reply(`${emojis.WARNING} The **${invoked}** role has not been setup yet! Run \`.rolesetup ${invoked} <@role>\` first.`);
      }

      const targetMember = message.mentions.members.first();
      if (!targetMember) {
        return message.reply(`${emojis.WARNING} Usage: \`.${invoked} <@user>\``);
      }

      try {
        if (targetMember.roles.cache.has(roleId)) {
          await targetMember.roles.remove(roleId);
          return message.reply({ content: `${emojis.SUCCESS} Removed <@&${roleId}> from **${targetMember.user.tag}**.`, allowedMentions: { parse: [], repliedUser: false } });
        } else {
          await targetMember.roles.add(roleId);
          return message.reply({ content: `${emojis.SUCCESS} Added <@&${roleId}> to **${targetMember.user.tag}**!`, allowedMentions: { parse: [], repliedUser: false } });
        }
      } catch (err) {
        return message.reply(`${emojis.WARNING} Failed to update role. Make sure the bot role is higher than the assigned role.`);
      }
    }

    // Default Roles Help
    const { createDynamicBox } = require('../utils/boxBuilder');

    const cmdBox = createDynamicBox('SPECIAL ROLE COMMANDS', [
      '.rolesetup <type> <@role>',
      '.friend <@user>',
      '.girl <@user>',
      '.guest <@user>',
      '.official <@user>',
      '.vip <@user>',
      '.invcrole <@role>',
      '.autonick <template>'
    ]);

    const typeBox = createDynamicBox('SYSTEM ROLE TYPES', [
      'friend, girl, guest,',
      'official, vip, invcrole'
    ]);

    const embed = createStyledEmbed({
      title: `${emojis.ROLES || '🎭'} Special Role System Suite`,
      subtitle: `Automated Special Roles & In-VC Role Management`,
      description:
        `Welcome **${author.username}**! Below is your executive **Special Role Control Panel**.\n\n` +
        `**📜 Command Suite**\n` +
        '```\n' + cmdBox + '\n```\n\n' +
        `**🏷️ Supported Role Types**\n` +
        '```\n' + typeBox + '\n```',
      requestedBy: author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
