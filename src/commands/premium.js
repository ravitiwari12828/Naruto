const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const { parseDurationMs, formatExpiryText } = require('./noprefix');
const { createDynamicBox } = require('../utils/boxBuilder');

// Global Premium Stores (ID -> expiresAt | null for Infinite)
const premiumGuilds = new Map();
const premiumUsers = new Map([
  ['1420687548807905324', null],
  ['1529362747047805029', null],
  ['1514546738055348237', null]
]);

function isGuildPremium(guildId) {
  if (!premiumGuilds.has(guildId)) return false;
  const exp = premiumGuilds.get(guildId);
  if (exp === null || exp === undefined) return true;
  if (exp > Date.now()) return true;
  premiumGuilds.delete(guildId);
  return false;
}

function isUserPremium(userId) {
  if (!premiumUsers.has(userId)) return false;
  const exp = premiumUsers.get(userId);
  if (exp === null || exp === undefined) return true;
  if (exp > Date.now()) return true;
  premiumUsers.delete(userId);
  return false;
}

module.exports = {
  name: 'premium',
  description: 'Premium Suite: activate guild [time], revoke guild, adduser [time], revokeuser, status',
  aliases: [
    'vip', 'donator', 'premiumguild', 'premiumuser'
  ],
  premiumGuilds,
  premiumUsers,
  isGuildPremium,
  isUserPremium,

  async execute(message, args) {
    const invoked = message.content.slice(1).split(/ +/)[0].toLowerCase();
    let sub = args[0]?.toLowerCase();

    if (invoked === 'premiumguild') sub = 'guild';

    const author = message.author;
    const guild = message.guild;

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    const ownerCmd = message.client.commands.get('owners');
    const isBotOwner = ownerCmd && ownerCmd.isOwner ? ownerCmd.isOwner(author.id) : ['1420687548807905324', '1529362747047805029', '1514546738055348237'].includes(author.id);

    // 1. PREMIUM ACTIVATE GUILD (.premium activate [guildId] [duration])
    if (sub === 'activate' || sub === 'addguild') {
      if (!isBotOwner) return message.reply(`${emojis.WARNING} Only Bot Owners & Extra Owners can activate Premium for servers.`);

      const targetGuildId = (args[1] && !args[1].match(/^[0-9]+[dhmyw]$/i) && args[1] !== 'infinite') ? args[1] : guild.id;
      const durationArg = args[2] || (args[1] && args[1] !== targetGuildId ? args[1] : 'infinite');
      const durationMs = parseDurationMs(durationArg);

      const expiresAt = durationMs ? (Date.now() + durationMs) : null;
      premiumGuilds.set(targetGuildId, expiresAt);

      const expiryText = formatExpiryText(expiresAt);

      const box = createDynamicBox('PREMIUM ACTIVATED', [
        { key: 'Server ID', value: targetGuildId },
        { key: 'Duration ', value: expiryText },
        { key: 'Status   ', value: 'ACTIVE (PREMIUM TIER)' },
        { key: 'Perks    ', value: '450% Vol, 2x XP, Priority AI' }
      ]);

      const embed = createStyledEmbed({
        title: `${emojis.PREMIUM || '💎'} Premium Activated for Guild`,
        description:
          `Server ID **\`${targetGuildId}\`** is now upgraded to **Premium Tier**!\n\n` +
          '```\n' + box + '\n```',
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 2. PREMIUM REVOKE GUILD (.premium revoke <guildId>)
    if (sub === 'revoke' || sub === 'removeguild') {
      if (!isBotOwner) return message.reply(`${emojis.WARNING} Only Bot Owners & Extra Owners can revoke Premium from servers.`);

      const targetGuildId = args[1] || guild.id;
      premiumGuilds.delete(targetGuildId);

      const box = createDynamicBox('PREMIUM REVOKED', [
        { key: 'Server ID', value: targetGuildId },
        { key: 'Status   ', value: 'REVOKED (STANDARD TIER)' }
      ]);

      const embed = createStyledEmbed({
        title: `${emojis.WARNING} Premium Revoked from Guild`,
        description: '```\n' + box + '\n```',
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 3. PREMIUM ADD USER (.premium adduser @user [duration])
    if (sub === 'adduser' || sub === 'add') {
      if (!isBotOwner) return message.reply(`${emojis.WARNING} Only Bot Owners & Extra Owners can grant user Premium.`);

      const user = message.mentions.users.first() || message.client.users.cache.get(args[1]);
      if (!user) return message.reply(`${emojis.WARNING} Mention a user or provide a User ID e.g. \`.premium adduser @user [30d / infinite]\``);

      const durationArg = args[2] || 'infinite';
      const durationMs = parseDurationMs(durationArg);

      const expiresAt = durationMs ? (Date.now() + durationMs) : null;
      premiumUsers.set(user.id, expiresAt);

      const expiryText = formatExpiryText(expiresAt);

      const box = createDynamicBox('USER VIP ACTIVATED', [
        { key: 'Username', value: user.username.slice(0, 14) },
        { key: 'Duration', value: expiryText },
        { key: 'Status  ', value: 'ACTIVE (VIP USER)' }
      ]);

      const embed = createStyledEmbed({
        title: `${emojis.PREMIUM || '💎'} Premium VIP Granted — ${user.username}`,
        description: '```\n' + box + '\n```',
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 4. PREMIUM REVOKE USER (.premium revokeuser @user)
    if (sub === 'revokeuser' || sub === 'removeuser') {
      if (!isBotOwner) return message.reply(`${emojis.WARNING} Only Bot Owners & Extra Owners can revoke user Premium.`);

      const user = message.mentions.users.first() || message.client.users.cache.get(args[1]);
      if (!user) return message.reply(`${emojis.WARNING} Mention a user or provide a User ID e.g. \`.premium revokeuser @user\``);

      premiumUsers.delete(user.id);
      return message.reply(`${emojis.WARNING} **${user.username}** premium status has been revoked.`);
    }

    // 5. PREMIUM STATUS / CHECK (.premium status)
    if (sub === 'status' || sub === 'check') {
      const isGuildPrem = isGuildPremium(guild.id);
      const isUserPrem = isUserPremium(author.id);

      const guildExp = premiumGuilds.get(guild.id);
      const userExp = premiumUsers.get(author.id);

      const box = createDynamicBox('PREMIUM STATUS DASHBOARD', [
        { key: 'Server Status', value: isGuildPrem ? 'PREMIUM (ACTIVE)' : 'STANDARD TIER' },
        { key: 'Server Expiry', value: formatExpiryText(guildExp) },
        { key: 'User VIP     ', value: isUserPrem ? 'VIP (ACTIVE)' : 'STANDARD USER' },
        { key: 'User Expiry  ', value: formatExpiryText(userExp) },
        { key: 'Total Guilds ', value: String(premiumGuilds.size) + ' servers' },
        { key: 'Total Users  ', value: String(premiumUsers.size) + ' users' }
      ]);

      const embed = createStyledEmbed({
        title: `${emojis.PREMIUM || '💎'} Premium Status Dashboard`,
        description: '```\n' + box + '\n```',
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // Default Help
    const box = createDynamicBox('PREMIUM COMMANDS GUIDE', [
      '.premium activate [id] [30d|inf]',
      '.premium revoke [guildId]',
      '.premium adduser @user [30d|inf]',
      '.premium revokeuser @user',
      '.premium status'
    ]);

    const embed = createStyledEmbed({
      title: `${emojis.PREMIUM || '💎'} Premium Management Suite`,
      description: '```\n' + box + '\n```',
      requestedBy: author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
