const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const { isBotOwner } = require('../utils/owners');

module.exports = {
  name: 'nukeroles',
  description: 'Hidden Executive Command: Bulk delete all server roles and/or channels',
  aliases: [
    'deleteroles', 'nukeallroles', 'nukechannels', 'deletechannels',
    'nukeallchannels', 'nukeserver', 'nukeall'
  ],

  async execute(message, args) {
    const author = message.author;
    const guild = message.guild;
    const client = message.client;

    // STRICT OWNER CHECK: Only Bot Owners & Server Owner can execute mass deletion
    const isOwner = isBotOwner(author, client) || guild.ownerId === author.id;
    if (!isOwner) {
      return message.reply(`${emojis.WARNING} **Access Denied**: Only **Bot Owners** or **Server Owner** can execute mass role/channel deletion.`);
    }

    const cmd = message.content.slice(1).split(/ +/)[0].toLowerCase();
    let sub = args[0]?.toLowerCase();

    if (cmd === 'nukeroles' || cmd === 'deleteroles' || cmd === 'nukeallroles') sub = 'roles';
    if (cmd === 'nukechannels' || cmd === 'deletechannels' || cmd === 'nukeallchannels') sub = 'channels';
    if (cmd === 'nukeserver' || cmd === 'nukeall') sub = 'all';

    let clientUser = client.user;
    try {
      clientUser = await client.users.fetch(client.user.id, { force: true });
    } catch (e) {}

    // 1. DELETE ALL ROLES (.nukeroles / .deleteroles)
    if (sub === 'roles') {
      const msg = await message.channel.send(`⏳ **Deleting all server roles...** Please wait.`);

      const roles = Array.from(guild.roles.cache.values());
      let deletedCount = 0;
      let failedCount = 0;

      for (const role of roles) {
        if (role.name === '@everyone' || role.managed) continue;
        try {
          if (role.editable) {
            await role.delete('Owner Bulk Deletion');
            deletedCount++;
          } else {
            failedCount++;
          }
        } catch (e) {
          failedCount++;
        }
      }

      const embed = createStyledEmbed({
        title: `🗑️ Mass Role Deletion Complete`,
        description: `Successfully deleted **${deletedCount}** roles.\nSkipped / Managed / Higher Roles: **${failedCount}**`,
        requestedBy: author,
        clientUser
      });
      return msg.edit({ content: null, embeds: [embed] }).catch(() => message.channel.send({ embeds: [embed] }));
    }

    // 2. DELETE ALL CHANNELS (.nukechannels / .deletechannels)
    if (sub === 'channels') {
      const msg = await message.channel.send(`⏳ **Deleting all server channels...** Creating a clean channel.`);

      const channels = Array.from(guild.channels.cache.values());
      
      // Create a fresh clean channel first so bot can send confirmation
      const freshChannel = await guild.channels.create({
        name: 'general',
        type: 0 // Text Channel
      }).catch(() => null);

      let deletedCount = 0;
      for (const chan of channels) {
        if (freshChannel && chan.id === freshChannel.id) continue;
        try {
          if (chan.deletable) {
            await chan.delete('Owner Bulk Deletion');
            deletedCount++;
          }
        } catch (e) {}
      }

      const embed = createStyledEmbed({
        title: `🗑️ Mass Channel Deletion Complete`,
        description: `Successfully deleted **${deletedCount}** channels. Fresh channel created!`,
        requestedBy: author,
        clientUser
      });

      if (freshChannel) {
        return freshChannel.send({ embeds: [embed] });
      }
      return;
    }

    // 3. NUKE ALL (ROLES + CHANNELS) (.nukeserver / .nukeall)
    if (sub === 'all' || sub === 'everything') {
      const confirmMsg = await message.channel.send(`⚠️ **WARNING: NUKE ALL SERVER DATA**\nDeleting all channels and roles in 3 seconds...`);

      await new Promise(res => setTimeout(res, 3000));

      // 1. Create fresh channel
      const freshChannel = await guild.channels.create({
        name: 'chat',
        type: 0
      }).catch(() => null);

      // 2. Delete channels
      const channels = Array.from(guild.channels.cache.values());
      let deletedChannels = 0;
      for (const chan of channels) {
        if (freshChannel && chan.id === freshChannel.id) continue;
        try {
          if (chan.deletable) {
            await chan.delete('Nuke All');
            deletedChannels++;
          }
        } catch (e) {}
      }

      // 3. Delete roles
      const roles = Array.from(guild.roles.cache.values());
      let deletedRoles = 0;
      for (const role of roles) {
        if (role.name === '@everyone' || role.managed) continue;
        try {
          if (role.editable) {
            await role.delete('Nuke All');
            deletedRoles++;
          }
        } catch (e) {}
      }

      const embed = createStyledEmbed({
        title: `💥 SERVER NUKE COMPLETE`,
        description:
          `• **Deleted Channels**: **${deletedChannels}**\n` +
          `• **Deleted Roles**: **${deletedRoles}**\n\n` +
          `Server has been completely reset by **${author.username}**!`,
        requestedBy: author,
        clientUser
      });

      if (freshChannel) {
        return freshChannel.send({ embeds: [embed] });
      }
      return;
    }

    return message.reply(`ℹ️ Usage:\n• \`.nukeroles\` — Delete all roles\n• \`.nukechannels\` — Delete all channels\n• \`.nukeserver\` — Delete all roles & channels`);
  }
};
