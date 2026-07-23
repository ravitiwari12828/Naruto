const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');

// Global Stores
const premiumGuilds = new Set();
const premiumUsers = new Set(['1420687548807905324', '1529362747047805029', '1514546738055348237']);

module.exports = {
  name: 'premium',
  description: 'Premium Suite: activate guild, revoke guild, add user, revoke user, status, redeem',
  aliases: [
    'vip', 'donator', 'premiumguild', 'premiumuser'
  ],
  premiumGuilds,
  premiumUsers,

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

    // 1. PREMIUM ACTIVATE GUILD (.premium activate <guildId>)
    if (sub === 'activate' || sub === 'addguild') {
      if (!isBotOwner) return message.reply(`${emojis.WARNING} Only Bot Owners & Extra Owners can activate Premium for servers.`);

      const targetGuildId = args[1] || guild.id;
      premiumGuilds.add(targetGuildId);

      const embed = createStyledEmbed({
        title: `💎 Premium Activated for Guild`,
        description: `Server ID **\`${targetGuildId}\`** is now upgraded to **Premium Tier**! ✨\n\nUnlocked high bitrate audio (450% volume), 2x XP quests, and priority features.`,
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

    // 3. PREMIUM ADD USER (.premium adduser @user)
    if (sub === 'adduser' || sub === 'add') {
      if (!isBotOwner) return message.reply(`${emojis.WARNING} Only Bot Owners & Extra Owners can grant user Premium.`);

      const user = message.mentions.users.first() || message.client.users.cache.get(args[1]);
      if (!user) return message.reply(`${emojis.WARNING} Mention a user or provide a User ID e.g. \`.premium adduser @user\``);

      premiumUsers.add(user.id);
      return message.reply(`💎 **${user.tag}** has been granted **Lifetime Premium Status**! ✨`);
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
      const isGuildPrem = premiumGuilds.has(guild.id);
      const isUserPrem = premiumUsers.has(author.id);

      const embed = createStyledEmbed({
        title: `💎 Premium Status Dashboard`,
        fields: [
          { name: '🏰 Current Server Status', value: isGuildPrem ? '`PREMIUM GUILD ✅`' : '`STANDARD TIER ⚪`', inline: true },
          { name: '👤 Your User Status', value: isUserPrem ? '`PREMIUM VIP ✅`' : '`STANDARD USER ⚪`', inline: true },
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
        `\`.premium activate [guildId]\` — Activate Premium tier for server (Owner Only)\n` +
        `\`.premium revoke [guildId]\` — Revoke Premium tier from server (Owner Only)\n` +
        `\`.premium adduser @user\` — Grant user Premium status (Owner Only)\n` +
        `\`.premium revokeuser @user\` — Revoke user Premium status (Owner Only)\n` +
        `\`.premium status\` — View server and user premium status`,
      requestedBy: author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
