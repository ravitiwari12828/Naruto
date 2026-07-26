const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const { PermissionsBitField } = require('discord.js');
const { createDynamicBox } = require('../utils/boxBuilder');

// Global Daily / 10-Min Mod Limits Store
const modLimitsStore = new Map();

function getOrCreateModLimits(guildId) {
  if (!modLimitsStore.has(guildId)) {
    modLimitsStore.set(guildId, {
      enabled: true,
      logChannelId: null,
      timeWindowMin: 10,
      limits: {
        memberUpdate: 6,
        channelCreate: 3,
        channelDelete: 3,
        channelUpdate: 4,
        roleCreate: 3,
        roleDelete: 2,
        roleUpdate: 3,
        ban: 3,
        kick: 3,
        guildUpdate: 0,
        timeout: 6,
        mention: 3,
        webhookCreate: 3,
        webhookDelete: 3,
        webhookUpdate: 2
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
  if (config.bypasses.has(moderatorId)) return { allowed: true };

  const limit = config.limits[actionType];
  if (limit === undefined || limit === 0) return { allowed: true };

  const now = Date.now();
  let userUsage = config.usage.get(moderatorId);

  if (!userUsage || now > userUsage.resetAt) {
    userUsage = {
      memberUpdate: 0, channelCreate: 0, channelDelete: 0, channelUpdate: 0,
      roleCreate: 0, roleDelete: 0, roleUpdate: 0, ban: 0, kick: 0,
      guildUpdate: 0, timeout: 0, mention: 0, webhookCreate: 0,
      webhookDelete: 0, webhookUpdate: 0,
      resetAt: now + (config.timeWindowMin * 60 * 1000)
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
  description: 'AntiNuke Action Rate Limits & Audit Protection System',
  aliases: ['limit', 'limits', 'actionlimits', 'modquota', 'limitmod', 'rate-limit'],
  modLimitsStore,
  checkAndIncrementModAction,

  async execute(message, args) {
    const invoked = message.content.slice(1).split(/ +/)[0].toLowerCase();
    let sub = args[0]?.toLowerCase();

    // Shift sub if 'modlimits' or 'limit' was used as sub
    if (['modlimits', 'limit', 'limits'].includes(sub)) {
      sub = args[1]?.toLowerCase();
      args = args.slice(1);
    }

    const author = message.author;
    const guild = message.guild;

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && guild.ownerId !== author.id) {
      return message.reply(`${emojis.WARNING} Only Administrators and Server Owners can configure AntiNuke action limits.`);
    }

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    const config = getOrCreateModLimits(guild.id);

    // .limit enable / disable
    if (sub === 'enable' || sub === 'on') {
      config.enabled = true;
      modLimitsStore.set(guild.id, config);
      return message.reply(`${emojis.SHIELD} AntiNuke Action Rate Limits are now **ENABLED**!`);
    }

    if (sub === 'disable' || sub === 'off') {
      config.enabled = false;
      modLimitsStore.set(guild.id, config);
      return message.reply(`${emojis.WARNING} AntiNuke Action Rate Limits are now **DISABLED**.`);
    }

    // .limit log #channel
    if (sub === 'log' || sub === 'logs' || sub === 'channel') {
      const chan = message.mentions.channels.first() || guild.channels.cache.get(args[1]);
      if (!chan) return message.reply(`${emojis.WARNING} Usage: \`.limit log #channel\``);

      config.logChannelId = chan.id;
      modLimitsStore.set(guild.id, config);
      return message.reply(`${emojis.SUCCESS} AntiNuke Limit Logging channel set to ${chan}.`);
    }

    // .limit set <action> <limit> (e.g. .limit set ban 3)
    if (sub === 'set') {
      const action = args[1]?.toLowerCase();
      const newLimit = parseInt(args[2]);

      const keyMap = {
        'memberupdate': 'memberUpdate', 'channelcreate': 'channelCreate',
        'channeldelete': 'channelDelete', 'channelupdate': 'channelUpdate',
        'rolecreate': 'roleCreate', 'roledelete': 'roleDelete',
        'roleupdate': 'roleUpdate', 'ban': 'ban', 'kick': 'kick',
        'guildupdate': 'guildUpdate', 'timeout': 'timeout', 'mention': 'mention',
        'webhookcreate': 'webhookCreate', 'webhookdelete': 'webhookDelete',
        'webhookupdate': 'webhookUpdate'
      };

      const matchedKey = keyMap[action];
      if (!matchedKey || isNaN(newLimit) || newLimit < 0) {
        return message.reply(`${emojis.WARNING} Usage: \`.limit set <action> <count>\` (e.g. \`.limit set ban 3\`)`);
      }

      config.limits[matchedKey] = newLimit;
      modLimitsStore.set(guild.id, config);

      const embed = createStyledEmbed({
        title: `${emojis.GEAR} AntiNuke Limit Updated`,
        description: `Set **${matchedKey}** limit to **\`${newLimit} actions / 10 Minutes\`**.`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // .limit reset
    if (sub === 'reset') {
      config.limits = {
        memberUpdate: 6, channelCreate: 3, channelDelete: 3, channelUpdate: 4,
        roleCreate: 3, roleDelete: 2, roleUpdate: 3, ban: 3, kick: 3,
        guildUpdate: 0, timeout: 6, mention: 3, webhookCreate: 3,
        webhookDelete: 3, webhookUpdate: 2
      };
      config.usage.clear();
      modLimitsStore.set(guild.id, config);

      return message.reply(`${emojis.SUCCESS} Reset all AntiNuke rate limits back to default settings!`);
    }

    // Default: Executive Monospaced Limits Panel
    const logChan = config.logChannelId ? `<#${config.logChannelId}>` : '`Not Set`';

    const limitsBox = createDynamicBox('CURRENT ANTINUKE LIMITS', [
      { key: 'Member Update', value: config.limits.memberUpdate },
      { key: 'Channel Create', value: config.limits.channelCreate },
      { key: 'Channel Delete', value: config.limits.channelDelete },
      { key: 'Channel Update', value: config.limits.channelUpdate },
      { key: 'Role Create', value: config.limits.roleCreate },
      { key: 'Role Delete', value: config.limits.roleDelete },
      { key: 'Role Update', value: config.limits.roleUpdate },
      { key: 'Ban', value: config.limits.ban },
      { key: 'Kick', value: config.limits.kick },
      { key: 'Guild Update', value: config.limits.guildUpdate },
      { key: 'Timeout', value: config.limits.timeout },
      { key: 'Mention', value: config.limits.mention },
      { key: 'Webhook Create', value: config.limits.webhookCreate },
      { key: 'Webhook Delete', value: config.limits.webhookDelete },
      { key: 'Webhook Update', value: config.limits.webhookUpdate }
    ]);

    const cmdBox = createDynamicBox('LIMIT COMMANDS', [
      '.limit set <action> <count>',
      '.limit log #channel',
      '.limit reset',
      '.limit status'
    ]);

    const description =
      `Welcome **${author.username}**! Below is your server **AntiNuke Action Rate Limits Grid**.\n\n` +
      '```\n' + limitsBox + '\n```\n' +
      '```\n' + cmdBox + '\n```\n\n' +
      `**📜 Configuration Mappings:**\n` +
      `• **Logging Channel**: ${logChan}\n` +
      `• **Time Window**: \`${config.timeWindowMin} Minutes\` *(Fixed Security Window)*\n\n` +
      `*💡 You can customize these limits using the \`.limit set <action> <count>\` command!*`;

    const embed = createStyledEmbed({
      title: `${emojis.SHIELD} AntiNuke Action Rate Limits & Quota Grid`,
      subtitle: `Realtime Server Action Audit Protection`,
      description,
      requestedBy: author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
