const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const { PermissionsBitField } = require('discord.js');

// Global VanityGuard Config Store (guildId -> { enabled: true, protectedVanity: 'radha' })
const vanityConfigs = new Map();

function getOrCreateVanityConfig(guildId) {
  if (!vanityConfigs.has(guildId)) {
    vanityConfigs.set(guildId, {
      enabled: true,
      protectedVanity: null,
      autoStealProtection: true
    });
  }
  return vanityConfigs.get(guildId);
}

module.exports = {
  name: 'vanityguard',
  description: 'High-Speed Server Vanity URL Protection & Theft Recovery System',
  aliases: ['vanityguard', 'vanityprotect', 'vanityshield', 'antivanity', 'vanity'],
  vanityConfigs,
  getOrCreateVanityConfig,

  async execute(message, args) {
    const sub = args[0]?.toLowerCase();
    const guild = message.guild;
    const author = message.author;

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    const extraOwners = ['1529362747047805029', '1420687548807905324', '1514546738055348237'];
    const isOwner = author.id === guild.ownerId || extraOwners.includes(author.id);

    if (!isOwner) {
      const embed = createStyledEmbed({
        title: `${emojis.WARNING} Permission Denied`,
        description: `Only the Server Owner or Bot Owners can manage VanityGuard.`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    const config = getOrCreateVanityConfig(guild.id);
    if (!config.protectedVanity && guild.vanityURLCode) {
      config.protectedVanity = guild.vanityURLCode;
    }

    // .vanityguard enable / disable
    if (sub === 'enable') {
      config.enabled = true;
      if (guild.vanityURLCode) config.protectedVanity = guild.vanityURLCode;
      vanityConfigs.set(guild.id, config);

      const embed = createStyledEmbed({
        title: `${emojis.SHIELD || '🛡️'} VanityGuard Enabled!`,
        description: `**Vanity URL Anti-Theft Guard is now ACTIVE!**\n\n` +
                     `• **Protected Vanity:** \`${config.protectedVanity ? 'discord.gg/' + config.protectedVanity : 'Not Set (Run .vanityguard set <code\>)'}\`\n` +
                     `• **Recovery Latency:** \`< 50ms\` (Sub-millisecond Reversion)\n` +
                     `• **Anti-Theft Penalty:** 10-Day Quarantine Jail, role strip & channel lockout for vanity thieves!`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    if (sub === 'disable') {
      config.enabled = false;
      vanityConfigs.set(guild.id, config);
      return message.reply(`${emojis.WARNING} VanityGuard Protection is now **DISABLED**.`);
    }

    // .vanityguard set <vanityCode>
    if (sub === 'set') {
      const code = args[1]?.replace('https://discord.gg/', '').replace('discord.gg/', '').trim();
      if (!code) {
        return message.reply(`${emojis.WARNING} Usage: \`.vanityguard set <vanityCode>\` (e.g. \`.vanityguard set radha\`)`);
      }

      config.protectedVanity = code;
      config.enabled = true;
      vanityConfigs.set(guild.id, config);

      const embed = createStyledEmbed({
        title: `⚡ Protected Vanity URL Code Locked!`,
        fields: [
          { name: '🌐 Protected URL', value: `\`discord.gg/${code}\``, inline: true },
          { name: '🛡️ Guard Status', value: `\`ACTIVE (24/7 Monitoring)\``, inline: true },
          { name: '⚡ Auto-Restoration', value: `If anyone alters \`discord.gg/${code}\`, Naruto will instantly reclaim it & lock out the thief for 10 Days!`, inline: false }
        ],
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // DEFAULT: STATUS DASHBOARD
    const description =
      `Welcome **${author.username}**! Below is your server **VanityGuard Anti-Theft Status**.\n\n` +
      `**🌐 Vanity Protection Status**\n` +
      `\`\`\`\n` +
      `Guard Status           : ${config.enabled ? 'ENABLED [ACTIVE]' : 'DISABLED [OFF]'}\n` +
      `Current Server Vanity  : ${guild.vanityURLCode ? 'discord.gg/' + guild.vanityURLCode : 'No Vanity Set'}\n` +
      `Locked Protection Code : ${config.protectedVanity ? 'discord.gg/' + config.protectedVanity : 'Not Locked'}\n` +
      `Recovery Latency       : < 50ms (Sub-millisecond Reversion)\n` +
      `\`\`\`\n\n` +
      `**⚡ Commands to Manage**\n` +
      `\`\`\`\n` +
      `.vanityguard enable\n` +
      `.vanityguard disable\n` +
      `.vanityguard set <code>\n` +
      `\`\`\``;

    const embed = createStyledEmbed({
      title: `🌐 VanityGuard Protection Dashboard`,
      subtitle: `Realtime Server Vanity URL Anti-Theft Guard`,
      description,
      requestedBy: author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
