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

module.exports = {
  name: 'roles',
  description: 'Role Commands: autonick, friend, girl, guest, invcrole, official, rolesetup, vip',
  aliases: [
    'rolesetup', 'friend', 'girl', 'guest',
    'invcrole', 'official', 'vip', 'autonick'
  ],

  async execute(message, args) {
    const invoked = message.content.slice(1).split(/ +/)[0].toLowerCase();
    const author = message.author;
    const guildId = message.guild.id;
    const config = getOrCreateRoleConfig(guildId);

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

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
          return message.reply(`${emojis.SUCCESS} Removed <@&${roleId}> from **${targetMember.user.tag}**.`);
        } else {
          await targetMember.roles.add(roleId);
          return message.reply(`${emojis.SUCCESS} Added <@&${roleId}> to **${targetMember.user.tag}**!`);
        }
      } catch (err) {
        return message.reply(`${emojis.WARNING} Failed to update role. Make sure the bot role is higher than the assigned role.`);
      }
    }

    // Default Roles Help
    const embed = createStyledEmbed({
      title: `🎭 Special Role System Commands`,
      description:
        `\`.rolesetup <type> <@role>\` — Setup special roles (\`friend\`, \`girl\`, \`guest\`, \`official\`, \`vip\`, \`invcrole\`)\n` +
        `\`.friend <@user>\` — Toggle Friend role\n` +
        `\`.girl <@user>\` — Toggle Girl role\n` +
        `\`.guest <@user>\` — Toggle Guest role\n` +
        `\`.official <@user>\` — Toggle Official role\n` +
        `\`.vip <@user>\` — Toggle VIP role\n` +
        `\`.invcrole <@role>\` — Auto role given when user joins Voice Channel\n` +
        `\`.autonick <template>\` — Auto nickname assigned to new members`,
      requestedBy: author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
