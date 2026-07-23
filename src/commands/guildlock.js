const { isBotOwner } = require('../utils/owners');

// Global Bot Owner Guild Whitelist & Private Lockdown Store
const botLockStore = {
  lockdownEnabled: true, // Default: Private Lockdown Mode (Only Owner Authorized Servers)
  whitelistedGuilds: new Set(),
  allowedOwners: new Set(['1420687548807905324', '1529362747047805029', '1514546738055348237'])
};

/**
 * Checks if a guild is authorized to host the bot.
 */
function isGuildAuthorized(guildId, ownerId) {
  if (!botLockStore.lockdownEnabled) return true;
  if (botLockStore.whitelistedGuilds.has(guildId)) return true;
  if (botLockStore.allowedOwners.has(ownerId)) return true;
  return false;
}

module.exports = {
  name: 'botlock',
  description: 'Bot Owner Private Server Whitelist & Invite Lockdown System',
  aliases: ['guildlock', 'botlockdown', 'whitelistguild', 'privatebot'],
  botLockStore,
  isGuildAuthorized,

  async execute(message, args) {
    const author = message.author;
    const client = message.client;

    // Strict Bot Owner Check (ID: 1420687548807905324 / Synn / Application Owner)
    if (!isBotOwner(author, client)) {
      return message.reply(`${emojis.WARNING} Only the **Bot Owner** can manage private server join authorizations.`);
    }

    let clientUser = client.user;
    try {
      clientUser = await client.users.fetch(client.user.id, { force: true });
    } catch (e) {}

    const sub = args[0]?.toLowerCase();

    // .botlock enable / disable
    if (sub === 'enable' || sub === 'on') {
      botLockStore.lockdownEnabled = true;
      const embed = createStyledEmbed({
        title: `🔒 Private Server Lockdown Enabled`,
        description: `The bot will now automatically leave any new server that is **NOT whitelisted** by the Bot Owner!`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    if (sub === 'disable' || sub === 'off') {
      botLockStore.lockdownEnabled = false;
      const embed = createStyledEmbed({
        title: `🔓 Public Server Access Enabled`,
        description: `Anyone can now add the bot to their server without pre-authorization.`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // .botlock add <guildID>
    if (sub === 'add' || sub === 'whitelist') {
      const gId = args[1];
      if (!gId) return message.reply(`${emojis.WARNING} Usage: \`.botlock add <serverID>\``);

      botLockStore.whitelistedGuilds.add(gId);
      return message.reply(`${emojis.SHIELD} Server ID **\`${gId}\`** has been authorized to use Naruto Bot!`);
    }

    // .botlock remove <guildID>
    if (sub === 'remove' || sub === 'unwhitelist') {
      const gId = args[1];
      if (!gId) return message.reply(`${emojis.WARNING} Usage: \`.botlock remove <serverID>\``);

      botLockStore.whitelistedGuilds.delete(gId);
      return message.reply(`${emojis.SUCCESS} Removed Server ID **\`${gId}\`** from authorized servers.`);
    }

    // .botlock list
    if (sub === 'list') {
      const list = Array.from(botLockStore.whitelistedGuilds).map((id, i) => `\`#${i + 1}\` Server ID: \`${id}\``).join('\n') || '*No server IDs explicitly whitelisted.*';

      const embed = createStyledEmbed({
        title: `📜 Authorized Whitelisted Servers`,
        description: list,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // Default Status Overview Card
    const embed = createStyledEmbed({
      title: `🔒 Private Server Join Authorization System`,
      subtitle: `Bot Owner Security & Access Control`,
      fields: [
        { name: '⚙️ Private Lockdown Status', value: botLockStore.lockdownEnabled ? '`ENABLED 🔒 (Private Mode)`' : '`DISABLED 🔓 (Public Mode)`', inline: true },
        { name: '🏠 Authorized Servers', value: `\`${botLockStore.whitelistedGuilds.size}\` Whitelisted Guilds`, inline: true },
        { name: '👑 Active Servers', value: `\`${client.guilds.cache.size}\` Servers Joined`, inline: true }
      ],
      description:
        `**Bot Owner Commands:**\n` +
        `\`.botlock add <serverID>\` — Authorize a server ID to add the bot\n` +
        `\`.botlock remove <serverID>\` — Revoke server authorization\n` +
        `\`.botlock list\` — View whitelisted server IDs\n` +
        `\`.botlock enable | disable\` — Toggle private lockdown mode`,
      requestedBy: author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
