const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');

// Global No-Prefix Authorized Users Store (userId -> expiresAt | null for Infinite)
const noPrefixStore = new Map([
  ['1420687548807905324', null],
  ['1529362747047805029', null],
  ['1514546738055348237', null]
]);

function parseDurationMs(durationStr) {
  if (!durationStr) return null; // Default: Infinite
  const s = durationStr.toLowerCase().trim();

  if (['infinite', 'infinity', 'lifetime', 'perm', 'permanent', '0', 'inf', 'never'].includes(s)) {
    return null; // Null means Infinite / Permanent
  }

  const match = s.match(/^(\d+)([dhmyw])?$/);
  if (!match) return null;

  const count = parseInt(match[1]);
  const unit = match[2] || 'd';

  if (unit === 'm') return count * 60 * 1000;
  if (unit === 'h') return count * 3600 * 1000;
  if (unit === 'd') return count * 86400 * 1000;
  if (unit === 'w') return count * 7 * 86400 * 1000;
  if (unit === 'y') return count * 365 * 86400 * 1000;

  return count * 86400 * 1000;
}

function formatExpiryText(expiresAt) {
  if (expiresAt === null || expiresAt === undefined) return '∞ Infinite (Lifetime)';
  const diff = expiresAt - Date.now();
  if (diff <= 0) return 'Expired ❌';
  const days = Math.floor(diff / (86400 * 1000));
  const hrs = Math.floor((diff % (86400 * 1000)) / (3600 * 1000));
  if (days > 0) return `${days}d ${hrs}h remaining`;
  return `${hrs}h remaining`;
}

function isNoPrefixUser(userId) {
  if (!noPrefixStore.has(userId)) return false;
  const expiresAt = noPrefixStore.get(userId);
  if (expiresAt === null || expiresAt === undefined) return true; // Infinite
  if (expiresAt > Date.now()) return true;
  noPrefixStore.delete(userId); // Expired
  return false;
}

module.exports = {
  name: 'noprefix',
  description: 'No-Prefix Management Suite: noprefix add @user [time/infinite], noprefix remove, noprefix list',
  aliases: ['npuser', 'noprefixadd', 'noprefixremove'],
  noPrefixStore,
  isNoPrefixUser,
  parseDurationMs,
  formatExpiryText,

  async execute(message, args) {
    const invoked = message.content.slice(1).split(/ +/)[0].toLowerCase();
    let sub = args[0]?.toLowerCase();

    if (invoked === 'noprefixadd') sub = 'add';
    if (invoked === 'noprefixremove') sub = 'remove';

    const author = message.author;

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    const ownerCmd = message.client.commands.get('owners');
    const isBotOwner = ownerCmd && ownerCmd.isOwner ? ownerCmd.isOwner(author.id) : ['1420687548807905324', '1529362747047805029', '1514546738055348237'].includes(author.id);

    if (!isBotOwner) {
      return message.reply(`${emojis.WARNING} Only Bot Owners & Extra Owners can manage No-Prefix access.`);
    }

    // 1. .noprefix add @user [time/infinite]
    if (sub === 'add') {
      const user = message.mentions.users.first() || message.client.users.cache.get(args[1]);
      if (!user) return message.reply(`${emojis.WARNING} Usage: \`.noprefix add @user [7d / 30d / infinite]\``);

      const timeArg = args[2] || args[1];
      const durationMs = parseDurationMs(timeArg);

      const expiresAt = durationMs ? (Date.now() + durationMs) : null;
      noPrefixStore.set(user.id, expiresAt);

      const expiryText = formatExpiryText(expiresAt);
      return message.reply(`⚡ **${user.tag}** (\`${user.id}\`) has been granted **No-Prefix Access**!\n• **Duration**: \`${expiryText}\``);
    }

    // 2. .noprefix remove @user
    if (sub === 'remove') {
      const user = message.mentions.users.first() || message.client.users.cache.get(args[1]);
      if (!user) return message.reply(`${emojis.WARNING} Usage: \`.noprefix remove @user\``);

      noPrefixStore.delete(user.id);
      return message.reply(`⚠️ **${user.tag}** (\`${user.id}\`) has been removed from No-Prefix access.`);
    }

    // 3. .noprefix list / status
    const activeEntries = [];
    for (const [id, exp] of noPrefixStore.entries()) {
      if (exp === null || exp > Date.now()) {
        activeEntries.push(`<@${id}> (\`${id}\`) — \`${formatExpiryText(exp)}\``);
      }
    }

    const listText = activeEntries.join('\n') || '*No active No-Prefix users.*';
    const embed = createStyledEmbed({
      title: `⚡ No-Prefix Authorized Users`,
      description: `**Users with No-Prefix Access:**\n${listText}\n\n**Usage:**\n\`.noprefix add @user 30d\` (Specific duration)\n\`.noprefix add @user infinite\` (Infinite / Lifetime)`,
      requestedBy: author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
