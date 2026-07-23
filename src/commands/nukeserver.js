const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const { isBotOwner } = require('../utils/owners');

// Fast Concurrent Execution Helper
async function fastBatchDelete(items, deleteFn, batchSize = 12) {
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const results = await Promise.allSettled(batch.map(item => deleteFn(item)));
    results.forEach(res => {
      if (res.status === 'fulfilled' && res.value === true) successCount++;
      else failCount++;
    });
  }
  return { successCount, failCount };
}

module.exports = {
  name: 'nukeroles',
  description: 'Ultra-Fast Executive Command: Bulk delete all server roles and/or channels in parallel',
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

    // 1. ULTRA-FAST ROLE DELETION (.nukeroles / .deleteroles)
    if (sub === 'roles') {
      const msg = await message.channel.send(`⚡ **Lightning Fast Role Purge Initiated...**`);

      const targetRoles = Array.from(guild.roles.cache.values()).filter(r => r.name !== '@everyone' && !r.managed && r.editable);
      const { successCount, failCount } = await fastBatchDelete(targetRoles, async (role) => {
        await role.delete('Owner Fast Bulk Deletion');
        return true;
      }, 15);

      const embed = createStyledEmbed({
        title: `⚡ Mass Role Deletion Complete`,
        description: `Successfully deleted **${successCount}** roles in high-speed parallel batching!`,
        requestedBy: author,
        clientUser
      });
      return msg.edit({ content: null, embeds: [embed] }).catch(() => message.channel.send({ embeds: [embed] }));
    }

    // 2. ULTRA-FAST CHANNEL DELETION (.nukechannels / .deletechannels)
    if (sub === 'channels') {
      // Create fresh replacement channel first
      const freshChannel = await guild.channels.create({
        name: 'chat',
        type: 0 // Text Channel
      }).catch(() => null);

      const targetChannels = Array.from(guild.channels.cache.values()).filter(c => c.deletable && (!freshChannel || c.id !== freshChannel.id));
      const { successCount } = await fastBatchDelete(targetChannels, async (chan) => {
        await chan.delete('Owner Fast Bulk Deletion');
        return true;
      }, 15);

      const embed = createStyledEmbed({
        title: `⚡ Mass Channel Deletion Complete`,
        description: `Successfully deleted **${successCount}** channels in parallel batching! Fresh channel ready.`,
        requestedBy: author,
        clientUser
      });

      if (freshChannel) {
        return freshChannel.send({ embeds: [embed] });
      }
      return;
    }

    // 3. ULTRA-FAST NUKE ALL (ROLES + CHANNELS) (.nukeserver / .nukeall)
    if (sub === 'all' || sub === 'everything') {
      // 1. Create fresh channel
      const freshChannel = await guild.channels.create({
        name: 'chat',
        type: 0
      }).catch(() => null);

      // 2. Filter target channels & roles
      const targetChannels = Array.from(guild.channels.cache.values()).filter(c => c.deletable && (!freshChannel || c.id !== freshChannel.id));
      const targetRoles = Array.from(guild.roles.cache.values()).filter(r => r.name !== '@everyone' && !r.managed && r.editable);

      // 3. Run parallel concurrent purging for BOTH channels and roles simultaneously!
      const [chanResult, roleResult] = await Promise.all([
        fastBatchDelete(targetChannels, async (chan) => {
          await chan.delete('Nuke All Fast');
          return true;
        }, 15),
        fastBatchDelete(targetRoles, async (role) => {
          await role.delete('Nuke All Fast');
          return true;
        }, 15)
      ]);

      const embed = createStyledEmbed({
        title: `💥 ULTRA-FAST SERVER NUKE COMPLETE`,
        description:
          `• **Deleted Channels**: **${chanResult.successCount}**\n` +
          `• **Deleted Roles**: **${roleResult.successCount}**\n\n` +
          `Server reset executed in high-speed parallel mode by **${author.username}**!`,
        requestedBy: author,
        clientUser
      });

      if (freshChannel) {
        return freshChannel.send({ embeds: [embed] });
      }
      return;
    }

    return message.reply(`ℹ️ Usage:\n• \`.nukeroles\` — Ultra-fast role purge\n• \`.nukechannels\` — Ultra-fast channel purge\n• \`.nukeserver\` — Ultra-fast full server reset`);
  }
};
