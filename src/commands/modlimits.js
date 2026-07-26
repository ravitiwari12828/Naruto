const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const { PermissionsBitField } = require('discord.js');

// Global Daily Mod Limits Store (guildId -> { enabled, limits: { ban, kick, mute, purge, channelDelete }, usage: Map(userId -> { ban, kick, mute, purge, channelDelete, resetAt }) })
const modLimitsStore = new Map();

function getOrCreateModLimits(guildId) {
  if (!modLimitsStore.has(guildId)) {
    modLimitsStore.set(guildId, {
      enabled: true,
      limits: {
        ban: 5,
        kick: 10,
        mute: 15,
        purge: 10,
        channelDelete: 3
      },
      bypasses: new Set(),
      usage: new Map()
    });
  }
  return modLimitsStore.get(guildId);
}

function checkAndIncrementModAction(guildId, moderatorId, actionType) {
  const config = getOrCreateModLimits(guildId);
  if (!config.enabled) return { allowed: true };

  // Bypass server owner & whitelisted bypass users
  if (config.bypasses.has(moderatorId)) return { allowed: true };

  const limit = config.limits[actionType];
  if (limit === undefined || limit === 0) return { allowed: true };

  const now = Date.now();
  let userUsage = config.usage.get(moderatorId);

  if (!userUsage || now > userUsage.resetAt) {
    userUsage = {
      ban: 0,
      kick: 0,
      mute: 0,
      purge: 0,
      channelDelete: 0,
      resetAt: now + 86400000 // 24 Hours Reset
    };
  }

  const currentCount = userUsage[actionType] || 0;
  if (currentCount >= limit) {
    return {
      allowed: false,
      current: currentCount,
      limit,
      resetAt: userUsage.resetAt
    };
  }

  userUsage[actionType] = currentCount + 1;
  config.usage.set(moderatorId, userUsage);
  modLimitsStore.set(guildId, config);

  return {
    allowed: true,
    current: currentCount + 1,
    limit,
    remaining: limit - (currentCount + 1)
  };
}

module.exports = {
  name: 'modlimits',
  description: 'Daily Moderation Action Quota & Anti-Rogue Moderator Protection System',
  aliases: ['actionlimits', 'modquota', 'limitmod', 'dailyquota'],
  modLimitsStore,
  checkAndIncrementModAction,

  async execute(message, args) {
    const invoked = message.content.slice(1).split(/ +/)[0].toLowerCase();
    const sub = args[0]?.toLowerCase();

    const author = message.author;
    const guild = message.guild;

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && guild.ownerId !== author.id) {
      return message.reply(`${emojis.WARNING} Only Administrators and Server Owners can configure daily moderation limits.`);
    }

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    const config = getOrCreateModLimits(guild.id);

    // .modlimits enable / disable
    if (sub === 'enable') {
      config.enabled = true;
      modLimitsStore.set(guild.id, config);
      return message.reply(`${emojis.SHIELD} Daily Moderation Action Limits are now **ENABLED**!`);
    }

    if (sub === 'disable') {
      config.enabled = false;
      modLimitsStore.set(guild.id, config);
      return message.reply(`⚠️ Daily Moderation Action Limits are now **DISABLED**.`);
    }

    // .modlimits set <action> <limit> (e.g. .modlimits set ban 5)
    if (sub === 'set') {
      const action = args[1]?.toLowerCase();
      const newLimit = parseInt(args[2]);

      const validActions = ['ban', 'kick', 'mute', 'purge', 'channelDelete'];
      if (!validActions.includes(action) || isNaN(newLimit) || newLimit < 0) {
        return message.reply(`${emojis.WARNING} Usage: \`.modlimits set <ban|kick|mute|purge|channelDelete> <limit>\``);
      }

      config.limits[action] = newLimit;
      modLimitsStore.set(guild.id, config);

      const embed = createStyledEmbed({
        title: `⚙️ Daily Moderation Quota Updated`,
        description: `Set daily **${action.toUpperCase()}** limit per moderator to **\`${newLimit} actions / 24hrs\`**.`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // .modlimits reset @user
    if (sub === 'reset') {
      const target = message.mentions.users.first();
      if (!target) return message.reply(`${emojis.WARNING} Usage: \`.modlimits reset @moderator\``);

      config.usage.delete(target.id);
      modLimitsStore.set(guild.id, config);

      return message.reply(`${emojis.SUCCESS} Reset daily moderation action counters for **${target.tag}**.`);
    }

    // .modlimits bypass @role / @user
    if (sub === 'bypass') {
      const target = message.mentions.users.first() || message.mentions.roles.first();
      if (!target) return message.reply(`${emojis.WARNING} Usage: \`.modlimits bypass @user/@role\``);

      if (config.bypasses.has(target.id)) {
        config.bypasses.delete(target.id);
        return message.reply(`${emojis.SUCCESS} Removed **${target.name || target.tag}** from moderation quota bypass list.`);
      } else {
        config.bypasses.add(target.id);
        return message.reply(`${emojis.SHIELD} Added **${target.name || target.tag}** to moderation quota bypass list!`);
      }
    }

    // Default: View Mod Limits & Usage Status Dashboard
    const boxMain = [
      '╭──────────────────────────╮',
      '│   MODERATION QUOTA HUB   │',
      '├──────────────────────────┤',
      '│ Protection : ' + (config.enabled ? 'ENABLED [OK]' : 'DISABLED[X]'),
      '│ Ban Quota  : ' + (config.limits.ban + ' / 24h').padEnd(12, ' '),
      '│ Kick Quota : ' + (config.limits.kick + ' / 24h').padEnd(12, ' '),
      '│ Mute Quota : ' + (config.limits.mute + ' / 24h').padEnd(12, ' '),
      '│ Purge Quota: ' + (config.limits.purge + ' / 24h').padEnd(12, ' '),
      '│ ChanDelete : ' + (config.limits.channelDelete + ' / 24h').padEnd(12, ' '),
      '╰──────────────────────────╯'
    ];

    const description =
      `Welcome **${author.username}**! Below is your **Daily Moderation Action Quota Grid**.\n\n` +
      '```\n' + boxMain.join('\n') + '\n```';

    const embed = createStyledEmbed({
      title: `🛡️ Daily Moderation Action Quotas & Rate Limits`,
      subtitle: `Anti-Rogue Moderator Protection Grid`,
      description,
      requestedBy: author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
