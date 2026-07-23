const { createStyledEmbed, formatCodePills } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');

module.exports = {
  name: 'channel',
  description: 'Manage channel permissions (disable, enable, hide, unhide, hideall, unhideall, lock, lockall, unlockall)',
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

    if (!message.member.permissions.has('ManageChannels')) {
      return message.reply(`${emojis.DISABLED} You need **Manage Channels** permission to run channel moderation commands.`);
    }

    const targetChannel = message.mentions.channels.first() || message.channel;
    const everyoneRole = message.guild.roles.everyone;

    // 1. Disable / Lock Single Channel
    if (sub === 'disable' || sub === 'lock') {
      try {
        await targetChannel.permissionOverwrites.edit(everyoneRole, { SendMessages: false });
        const embed = createStyledEmbed({
          title: `${emojis.LOCK} Channel Locked`,
          subtitle: `Channel: ${targetChannel}`,
          description: `Successfully locked channel permissions for **@everyone**.`,
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
        await targetChannel.permissionOverwrites.edit(everyoneRole, { SendMessages: null });
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
        await targetChannel.permissionOverwrites.edit(everyoneRole, { ViewChannel: false });
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
        await targetChannel.permissionOverwrites.edit(everyoneRole, { ViewChannel: null });
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
      const textChannels = message.guild.channels.cache.filter(c => c.isTextBased());

      for (const [_, ch] of textChannels) {
        try {
          await ch.permissionOverwrites.edit(everyoneRole, { SendMessages: false });
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
      const textChannels = message.guild.channels.cache.filter(c => c.isTextBased());

      for (const [_, ch] of textChannels) {
        try {
          await ch.permissionOverwrites.edit(everyoneRole, { SendMessages: null });
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
      const textChannels = message.guild.channels.cache.filter(c => c.isTextBased());

      for (const [_, ch] of textChannels) {
        try {
          await ch.permissionOverwrites.edit(everyoneRole, { ViewChannel: false });
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
      const textChannels = message.guild.channels.cache.filter(c => c.isTextBased());

      for (const [_, ch] of textChannels) {
        try {
          await ch.permissionOverwrites.edit(everyoneRole, { ViewChannel: null });
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
