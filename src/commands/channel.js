const { createStyledEmbed, formatCodePills } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const { ChannelType, PermissionsBitField } = require('discord.js');

function isGuildTextChannel(ch) {
  return ch && (ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement || ch.type === 0 || ch.type === 5) && ch.permissionOverwrites;
}

async function lockChannelCompletely(ch, everyoneRole) {
  await ch.permissionOverwrites.edit(everyoneRole, {
    SendMessages: false,
    SendMessagesInThreads: false,
    CreatePublicThreads: false,
    CreatePrivateThreads: false,
    AddReactions: false
  });

  if (ch.permissionOverwrites && ch.permissionOverwrites.cache) {
    for (const [id, overwrite] of ch.permissionOverwrites.cache) {
      if (id === everyoneRole.id) continue;
      const role = ch.guild.roles.cache.get(id);
      if (role && !role.permissions.has(PermissionsBitField.Flags.Administrator)) {
        if (overwrite.allow.has(PermissionsBitField.Flags.SendMessages)) {
          await ch.permissionOverwrites.edit(role, { SendMessages: false }).catch(() => {});
        }
      }
    }
  }
}

async function unlockChannelCompletely(ch, everyoneRole) {
  await ch.permissionOverwrites.edit(everyoneRole, {
    SendMessages: null,
    SendMessagesInThreads: null,
    CreatePublicThreads: null,
    CreatePrivateThreads: null,
    AddReactions: null
  });

  if (ch.permissionOverwrites && ch.permissionOverwrites.cache) {
    for (const [id, overwrite] of ch.permissionOverwrites.cache) {
      if (id === everyoneRole.id) continue;
      const role = ch.guild.roles.cache.get(id);
      if (role && !role.permissions.has(PermissionsBitField.Flags.Administrator)) {
        if (overwrite.deny.has(PermissionsBitField.Flags.SendMessages)) {
          await ch.permissionOverwrites.edit(role, { SendMessages: null }).catch(() => {});
        }
      }
    }
  }
}

async function hideChannelCompletely(ch, everyoneRole) {
  await ch.permissionOverwrites.edit(everyoneRole, { ViewChannel: false });
}

async function unhideChannelCompletely(ch, everyoneRole) {
  await ch.permissionOverwrites.edit(everyoneRole, { ViewChannel: null });
}

module.exports = {
  name: 'channel',
  description: 'Manage channel permissions: disable, enable, hide, unhide, hideall, unhideall, lock, lockall, unlockall',
  aliases: ['disable', 'enable', 'hide', 'unhide', 'hideall', 'unhideall', 'lock', 'lockall', 'unlockall', 'chan'],

  async execute(message, args) {
    const invokedName = message.content.slice(1).split(/ +/)[0].toLowerCase();
    let sub = args[0] ? args[0].toLowerCase() : null;

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    const directAliases = ['disable', 'enable', 'hide', 'unhide', 'hideall', 'unhideall', 'lock', 'lockall', 'unlockall'];
    if (directAliases.includes(invokedName)) {
      sub = invokedName;
    }

    if (!sub || sub === 'help') {
      const commandsList = [
        'disable', 'enable', 'hide', 'unhide',
        'lock', 'lockall', 'unlockall',
        'hideall', 'unhideall'
      ];

      const embed = createStyledEmbed({
        title: 'Naruto Help Menu',
        subtitle: `${emojis.TOOLS} Channel Commands`,
        description: formatCodePills(commandsList),
        requestedBy: message.author,
        clientUser,
        footerText: `Total ${commandsList.length} commands`
      });

      return message.channel.send({ embeds: [embed] });
    }

    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return message.reply(`${emojis.DISABLED} You need **Manage Channels** permission to run channel moderation commands.`);
    }

    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels) && !message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return message.reply(`${emojis.WARNING} I need **Manage Channels** & **Manage Roles** permissions to lock/hide channel permissions!`);
    }

    const targetChannel = message.mentions.channels.first() || message.channel;
    const everyoneRole = message.guild.roles.everyone;

    // 1. Disable / Lock Single Channel
    if (sub === 'disable' || sub === 'lock') {
      try {
        await lockChannelCompletely(targetChannel, everyoneRole);
        const embed = createStyledEmbed({
          title: `${emojis.LOCK} Channel Locked`,
          subtitle: `Channel: ${targetChannel}`,
          description: `Successfully locked channel & thread permissions for **@everyone** and all member roles.`,
          requestedBy: message.author,
          clientUser
        });
        return message.channel.send({ embeds: [embed] });
      } catch (err) {
        return message.reply(`${emojis.DISABLED} Failed to lock channel: ${err.message}`);
      }
    }

    // 2. Enable / Unlock Single Channel
    if (sub === 'enable' || sub === 'unlock') {
      try {
        await unlockChannelCompletely(targetChannel, everyoneRole);
        const embed = createStyledEmbed({
          title: `${emojis.UNLOCK} Channel Enabled`,
          subtitle: `Channel: ${targetChannel}`,
          description: `Successfully unlocked and re-enabled messaging permissions for **@everyone**.`,
          requestedBy: message.author,
          clientUser
        });
        return message.channel.send({ embeds: [embed] });
      } catch (err) {
        return message.reply(`${emojis.DISABLED} Failed to enable channel: ${err.message}`);
      }
    }

    // 3. Hide Single Channel
    if (sub === 'hide') {
      try {
        await hideChannelCompletely(targetChannel, everyoneRole);
        const embed = createStyledEmbed({
          title: `${emojis.HIDE} Channel Hidden`,
          subtitle: `Channel: ${targetChannel}`,
          description: `Channel view permissions hidden for **@everyone**.`,
          requestedBy: message.author,
          clientUser
        });
        return message.channel.send({ embeds: [embed] });
      } catch (err) {
        return message.reply(`${emojis.DISABLED} Failed to hide channel: ${err.message}`);
      }
    }

    // 4. Unhide Single Channel
    if (sub === 'unhide') {
      try {
        await unhideChannelCompletely(targetChannel, everyoneRole);
        const embed = createStyledEmbed({
          title: `${emojis.SUCCESS} Channel Unhidden`,
          subtitle: `Channel: ${targetChannel}`,
          description: `Successfully made channel visible for **@everyone**.`,
          requestedBy: message.author,
          clientUser
        });
        return message.channel.send({ embeds: [embed] });
      } catch (err) {
        return message.reply(`${emojis.DISABLED} Failed to unhide channel: ${err.message}`);
      }
    }

    // 5. Lock All Channels
    if (sub === 'lockall') {
      const statusMsg = await message.reply(`${emojis.LOADING} Locking all text channels across the server...`);
      let count = 0;
      const textChannels = message.guild.channels.cache.filter(isGuildTextChannel);

      for (const [_, ch] of textChannels) {
        try {
          await lockChannelCompletely(ch, everyoneRole);
          count++;
        } catch (e) {}
      }

      const embed = createStyledEmbed({
        title: `${emojis.LOCK} Mass Server Lockdown`,
        subtitle: `${emojis.WARNING} Emergency Lockdown Active`,
        description: `Successfully locked **${count}** text channels across **${message.guild.name}**.`,
        requestedBy: message.author,
        clientUser
      });

      return statusMsg.edit({ content: ' ', embeds: [embed] });
    }

    // 6. Unlock All Channels
    if (sub === 'unlockall') {
      const statusMsg = await message.reply(`${emojis.LOADING} Unlocking all text channels across the server...`);
      let count = 0;
      const textChannels = message.guild.channels.cache.filter(isGuildTextChannel);

      for (const [_, ch] of textChannels) {
        try {
          await unlockChannelCompletely(ch, everyoneRole);
          count++;
        } catch (e) {}
      }

      const embed = createStyledEmbed({
        title: `${emojis.UNLOCK} Mass Server Unlock`,
        subtitle: `${emojis.SUCCESS} Lockdown Ended`,
        description: `Successfully unlocked **${count}** text channels across **${message.guild.name}**.`,
        requestedBy: message.author,
        clientUser
      });

      return statusMsg.edit({ content: ' ', embeds: [embed] });
    }

    // 7. Hide All Channels
    if (sub === 'hideall') {
      const statusMsg = await message.reply(`${emojis.LOADING} Hiding all text channels across the server...`);
      let count = 0;
      const textChannels = message.guild.channels.cache.filter(isGuildTextChannel);

      for (const [_, ch] of textChannels) {
        try {
          await hideChannelCompletely(ch, everyoneRole);
          count++;
        } catch (e) {}
      }

      const embed = createStyledEmbed({
        title: `${emojis.HIDE} Mass Channel Concealment`,
        subtitle: `${emojis.WARNING} Hide All Active`,
        description: `Successfully hidden **${count}** text channels for **@everyone**.`,
        requestedBy: message.author,
        clientUser
      });

      return statusMsg.edit({ content: ' ', embeds: [embed] });
    }

    // 8. Unhide All Channels
    if (sub === 'unhideall') {
      const statusMsg = await message.reply(`${emojis.LOADING} Unhiding all text channels across the server...`);
      let count = 0;
      const textChannels = message.guild.channels.cache.filter(isGuildTextChannel);

      for (const [_, ch] of textChannels) {
        try {
          await unhideChannelCompletely(ch, everyoneRole);
          count++;
        } catch (e) {}
      }

      const embed = createStyledEmbed({
        title: `${emojis.SUCCESS} Mass Channel Reveal`,
        subtitle: `${emojis.ENABLED} Unhide All Active`,
        description: `Successfully unhidden **${count}** text channels for **@everyone**.`,
        requestedBy: message.author,
        clientUser
      });

      return statusMsg.edit({ content: ' ', embeds: [embed] });
    }
  }
};
