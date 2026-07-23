const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const { parseDurationMs, formatExpiryText } = require('./noprefix');

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

      const embed = createStyledEmbed({
        title: `💎 Premium Activated for Guild`,
        description:
          `Server ID **\`${targetGuildId}\`** is now upgraded to **Premium Tier**! ✨\n\n` +
          `• **Duration**: \`${expiryText}\`\n` +
          `• **Perks**: High bitrate audio (450% volume limit), 2x XP boost, priority AI & temp voice channels.`,
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

      const embed = createStyledEmbed({
        title: `⚠️ Premium Revoked from Guild`,
        description: `Server ID **\`${targetGuildId}\`** premium tier has been revoked.`,
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
      return message.reply(`💎 **${user.tag}** has been granted **Premium VIP Status**!\n• **Duration**: \`${expiryText}\` ✨`);
    }

    // 4. PREMIUM REVOKE USER (.premium revokeuser @user)
    if (sub === 'revokeuser' || sub === 'removeuser') {
      if (!isBotOwner) return message.reply(`${emojis.WARNING} Only Bot Owners & Extra Owners can revoke user Premium.`);

      const user = message.mentions.users.first() || message.client.users.cache.get(args[1]);
      if (!user) return message.reply(`${emojis.WARNING} Mention a user or provide a User ID e.g. \`.premium revokeuser @user\``);

      premiumUsers.delete(user.id);
      return message.reply(`⚠️ **${user.tag}** premium status has been revoked.`);
    }

    // 5. PREMIUM STATUS / CHECK (.premium status)
    if (sub === 'status' || sub === 'check') {
      const isGuildPrem = isGuildPremium(guild.id);
      const isUserPrem = isUserPremium(author.id);

      const guildExp = premiumGuilds.get(guild.id);
      const userExp = premiumUsers.get(author.id);

      const embed = createStyledEmbed({
        title: `💎 Premium Status Dashboard`,
        fields: [
          { name: '🏰 Current Server Status', value: isGuildPrem ? `\`PREMIUM GUILD ✅\`\n(${formatExpiryText(guildExp)})` : '`STANDARD TIER ⚪`', inline: true },
          { name: '👤 Your User Status', value: isUserPrem ? `\`PREMIUM VIP ✅\`\n(${formatExpiryText(userExp)})` : '`STANDARD USER ⚪`', inline: true },
          { name: '💎 Total Premium Guilds', value: `\`${premiumGuilds.size}\` servers`, inline: true },
          { name: '👤 Total Premium Users', value: `\`${premiumUsers.size}\` users`, inline: true }
        ],
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // Default Help
    const embed = createStyledEmbed({
      title: `💎 Premium Commands`,
      description:
        `\`.premium activate [guildId] [30d / infinite]\` — Grant server Premium\n` +
        `\`.premium revoke [guildId]\` — Revoke server Premium\n` +
        `\`.premium adduser @user [30d / infinite]\` — Grant user VIP Premium\n` +
        `\`.premium revokeuser @user\` — Revoke user VIP Premium\n` +
        `\`.premium status\` — View active Premium status`,
      requestedBy: author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
