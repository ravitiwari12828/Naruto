const { PermissionsBitField } = require('discord.js');
const { isBotOwner } = require('../utils/owners');
const emojis = require('../utils/emojis');

// Global Quarantine Config Store (guildId -> { enabled, days: 15, bypassUsers: Set, bypassRoles: Set })
const quarantineConfigs = new Map();

function getOrCreateQuarantineConfig(guildId) {
  if (!quarantineConfigs.has(guildId)) {
    quarantineConfigs.set(guildId, {
      enabled: true,
      days: 15,
      bypassUsers: new Set(['1420687548807905324', '1529362747047805029', '1514546738055348237']),
      bypassRoles: new Set()
    });
  }
  const cfg = quarantineConfigs.get(guildId);
  if (!cfg.bypassUsers) cfg.bypassUsers = new Set(['1420687548807905324', '1529362747047805029', '1514546738055348237']);
  if (!cfg.bypassRoles) cfg.bypassRoles = new Set();
  return cfg;
}

/**
 * Checks if a member is subject to the new-joiner quarantine rule (< X days joined).
 */
function isMemberInQuarantine(member) {
  if (!member || !member.joinedTimestamp) return { isQuarantined: false };
  if (isBotOwner(member.user || member)) return { isQuarantined: false };

  const config = getOrCreateQuarantineConfig(member.guild.id);
  if (!config.enabled) return { isQuarantined: false };

  // Bypass server owner & whitelisted users
  if (member.guild.ownerId === member.id) return { isQuarantined: false };
  if (config.bypassUsers && config.bypassUsers.has(member.id)) return { isQuarantined: false };
  if (config.bypassRoles && member.roles?.cache?.some(r => config.bypassRoles.has(r.id))) return { isQuarantined: false };

  const daysJoined = (Date.now() - member.joinedTimestamp) / (1000 * 60 * 60 * 24);
  if (daysJoined < config.days) {
    const remainingDays = Math.ceil(config.days - daysJoined);
    return {
      isQuarantined: true,
      daysJoined: daysJoined.toFixed(1),
      requiredDays: config.days,
      remainingDays
    };
  }

  return { isQuarantined: false };
}

module.exports = {
  name: 'quarantine',
  description: '15-Day New Joiner Security Probation Grid for Users & Bots',
  aliases: ['probation', 'quantine', 'newuserguard', 'newjoinerguard', '15dayguard'],
  quarantineConfigs,
  isMemberInQuarantine,

  async execute(message, args) {
    const sub = args[0]?.toLowerCase();
    const author = message.author;
    const guild = message.guild;

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && guild.ownerId !== author.id) {
      return message.reply(`${emojis.WARNING} Only Administrators and Server Owners can configure New Joiner Security Probation.`);
    }

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    const config = getOrCreateQuarantineConfig(guild.id);

    // .quarantine enable / disable
    if (sub === 'enable') {
      config.enabled = true;
      quarantineConfigs.set(guild.id, config);
      return message.reply(`${emojis.SHIELD} 15-Day New Joiner Security Grid is now **ENABLED**!`);
    }

    if (sub === 'disable') {
      config.enabled = false;
      quarantineConfigs.set(guild.id, config);
      return message.reply(`⚠️ 15-Day New Joiner Security Grid is now **DISABLED**.`);
    }

    // .quarantine days <number>
    if (sub === 'days' || sub === 'setdays') {
      const num = parseInt(args[1]);
      if (isNaN(num) || num < 1 || num > 90) {
        return message.reply(`${emojis.WARNING} Usage: \`.quarantine days <1-90>\` (e.g. \`.quarantine days 15\`)`);
      }

      config.days = num;
      quarantineConfigs.set(guild.id, config);

      const embed = createStyledEmbed({
        title: `⚙️ Probation Window Updated`,
        description: `New users & bots must now be in the server for at least **\`${num} Days\`** before executing admin/mod commands, @everyone mentions, or channel renames!`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // .quarantine bypass @user / @role
    if (sub === 'bypass') {
      const target = message.mentions.users.first() || message.mentions.roles.first();
      if (!target) return message.reply(`${emojis.WARNING} Usage: \`.quarantine bypass @user/@role\``);

      if (target.username) {
        if (config.bypassUsers.has(target.id)) {
          config.bypassUsers.delete(target.id);
          return message.reply(`${emojis.SUCCESS} Removed **${target.tag}** from quarantine bypass list.`);
        } else {
          config.bypassUsers.add(target.id);
          return message.reply(`${emojis.SHIELD} Added **${target.tag}** to quarantine bypass list!`);
        }
      } else {
        if (config.bypassRoles.has(target.id)) {
          config.bypassRoles.delete(target.id);
          return message.reply(`${emojis.SUCCESS} Removed <@&${target.id}> from quarantine bypass list.`);
        } else {
          config.bypassRoles.add(target.id);
          return message.reply(`${emojis.SHIELD} Added <@&${target.id}> to quarantine bypass list!`);
        }
      }
    }

    // Default Status Overview Card
    const embed = createStyledEmbed({
      title: `🛡️ 15-Day New Joiner Security Probation Grid`,
      subtitle: `${emojis.SHIELD} Konoha Anti-Rogue Joiner Protection`,
      fields: [
        { name: '⚙️ Status', value: config.enabled ? '`ENABLED ✅`' : '`DISABLED ⚠️`', inline: true },
        { name: '⏱️ Probation Period', value: `\`${config.days} Days\``, inline: true },
        { name: '🚫 Enforced Restrictions', value: `• Ban / Kick Commands\n• @everyone & @here Mentions\n• Mass Channel Renaming & Deletion\n• Mass Role Modifications`, inline: false }
      ],
      description:
        `**Commands:**\n` +
        `\`.quarantine days <number>\` — Change required probation days (Default: 15)\n` +
        `\`.quarantine bypass @user\` — Grant probation exemption to trusted staff/bots\n` +
        `\`.quarantine enable | disable\` — Toggle probation protection grid`,
      requestedBy: author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
