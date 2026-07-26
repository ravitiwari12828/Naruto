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
      enabled: true,
      panicmode: false,
      panicLevel: 1, // 1: Low, 2: Medium, 3: High Lockdown
      whitelistedUsers: new Map([
        ['1529362747047805029', new Set(['all'])],
        ['1420687548807905324', new Set(['all'])],
        ['1514546738055348237', new Set(['all'])]
      ]),
      extraOwners: new Set(['1529362747047805029', '1420687548807905324', '1514546738055348237']),
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
        quarantineWhitelist: new Set(['1529362747047805029', '1420687548807905324', '1514546738055348237'])
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
      quarantineWhitelist: new Set(['1529362747047805029', '1420687548807905324', '1514546738055348237'])
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
  if (config.extraOwners.has(userId) || ['1420687548807905324', '1529362747047805029', '1514546738055348237'].includes(userId)) {
    return true;
  }
  if (!config.whitelistedUsers || !config.whitelistedUsers.has(userId)) {
    return false;
  }

  const perms = config.whitelistedUsers.get(userId);
  if (!perms) return false;
  if (perms.has('all')) return true;

  const fname = featureName.toLowerCase();
  if (fname.includes('ban') && perms.has('ban')) return true;
  if (fname.includes('kick') && perms.has('kick')) return true;
  if (fname.includes('bot') && perms.has('bot')) return true;
  if (fname.includes('channel') && perms.has('channel')) return true;
  if (fname.includes('role') && perms.has('role')) return true;
  if (fname.includes('webhook') && perms.has('webhook')) return true;
  if (fname.includes('guild') && perms.has('guild')) return true;

  return false;
}

function renderAntinukeDashboard(config, author, clientUser) {
  const f = config.filters;
  const jg = config.joinGate;
  const aq = config.autoQuarantine;
  const rl = config.rateLimits;

  const extraOwnersList = Array.from(config.extraOwners).map(id => `<@${id}>`).join(', ') || 'None';
  const whitelistCount = config.whitelistedUsers.size;

  const boxMain = [
    '╭────────────────────────────────────╮',
    '│   ANTINUKE SYSTEM HUB    │',
    '├────────────────────────────────────┤',
    '│ AntiNuke   : ' + (config.enabled ? 'ENABLED [OK]' : 'DISABLED[X]'),
    '│ Panic Mode : ' + (config.panicmode ? `ACTIVE  L${config.panicLevel}` : 'NORMAL [OFF]'),
    '│ ExtraOwner : ' + (config.extraOwners.size + ' Users').padEnd(12, ' '),
    '│ Whitelist  : ' + (whitelistCount + ' Users').padEnd(12, ' '),
    '╰────────────────────────────────────╯'
  ];

  const boxGate = [
    '╭────────────────────────────────────╮',
    '│    JOINGATE SECURITY     │',
    '├────────────────────────────────────┤',
    '│ AntiBotAdd : ' + (jg.antiBotAdd ? 'ENABLED [OK]' : 'DISABLED[X]'),
    '│ Unverified : ' + (jg.antiUnverifiedBot ? 'ENABLED [OK]' : 'DISABLED[X]'),
    '│ No Avatar  : ' + (jg.antiNoAvatar ? 'ENABLED [OK]' : 'DISABLED[X]'),
    '│ AccountAge : ' + (jg.antiAccountAge ? `${jg.minAccountAgeDays} Days [OK]` : 'DISABLED[X]'),
    '╰────────────────────────────────────╯'
  ];

  const boxQuarantine = [
    '╭────────────────────────────────────╮',
    '│     AUTO QUARANTINE      │',
    '├────────────────────────────────────┤',
    '│ Quarantine : ' + (aq.enabled ? 'ACTIVE  [OK]' : 'DISABLED[X]'),
    '│ AdminGuard : ' + (aq.strictMode ? 'ON      [OK]' : 'OFF     [X]'),
    '│ MemberRole : ' + (aq.strictMemberRole ? 'ON      [OK]' : 'OFF     [X]'),
    '│ PublicRole : ' + (aq.monitorPublicRoles ? 'ACTIVE  [OK]' : 'OFF     [X]'),
    '╰────────────────────────────────────╯'
  ];

  const description =
    `Welcome **${author.username}**! Below is your executive **AntiNuke & Security Control Suite**.\n\n` +
    `**${emojis.SHIELD} Main System Status**\n` +
    '```\n' + boxMain.join('\n') + '\n```\n\n' +
    `**🚪 Join Gate Security**\n` +
    '```\n' + boxGate.join('\n') + '\n```\n\n' +
    `**☣️ Auto Quarantine Guard**\n` +
    '```\n' + boxQuarantine.join('\n') + '\n```\n\n' +
    `**👑 Registered Extra Owners**\n` +
    `${extraOwnersList}`;

  return createStyledEmbed({
    title: `${emojis.SHIELD || emojis.SHIELD} AntiNuke & Security Control Suite`,
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

  // Row 1: Executive Master Controls (Compact Emoji-Only Square Buttons)
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('toggle_shield')
      .setEmoji(config.enabled ? (emojis.OBJ_SHIELD || emojis.SHIELD || '🛡️') : (emojis.OBJ_ERROR || emojis.ERROR || '❌'))
      .setStyle(config.enabled ? ButtonStyle.Success : ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('toggle_panic')
      .setEmoji(config.panicmode ? '🚨' : '🟢')
      .setStyle(config.panicmode ? ButtonStyle.Danger : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('toggle_joingate')
      .setEmoji('🚪')
      .setStyle(jg.enabled ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('toggle_quarantine')
      .setEmoji('☣️')
      .setStyle(aq.enabled ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('an_whitelist_mgr')
      .setEmoji('👥')
      .setStyle(ButtonStyle.Primary)
  );

  // Row 2: Filter Perms Group 1
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('toggle_ban').setEmoji(emojis.OBJ_MOD || emojis.MOD || '🛡️').setStyle(f.antiBan ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('toggle_kick').setEmoji('👢').setStyle(f.antiKick ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('toggle_bot').setEmoji('🤖').setStyle(f.antiBotAdd ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('toggle_channel').setEmoji('📁').setStyle(f.antiChannelCreate ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('toggle_role').setEmoji('🎭').setStyle(f.antiRoleCreate ? ButtonStyle.Success : ButtonStyle.Secondary)
  );

  // Row 3: Filter Perms Group 2
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('toggle_webhook').setEmoji('🔗').setStyle(f.antiWebhookCreate ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('toggle_spam').setEmoji('💬').setStyle(f.antiSpam ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('toggle_everyone').setEmoji('📢').setStyle(f.antiEveryone ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('toggle_raid').setEmoji('⚔️').setStyle(f.antiRaid ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('toggle_guild').setEmoji('🌐').setStyle(f.antiGuildUpdate ? ButtonStyle.Success : ButtonStyle.Secondary)
  );

  return [row1, row2, row3];
}

module.exports = {
  name: 'antinuke',
  description: 'Shinobi-Grade AntiNuke, JoinGate, Auto-Quarantine, Rate Limits, Whitelist & Extra Owner Suite',
  aliases: [
    'panicmode', 'whitelist', 'extraowner', 'bypassrole', 'security', 'protection',
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
    const isExtraOwner = config.extraOwners.has(author.id) || ['1420687548807905324', '1529362747047805029', '1514546738055348237'].includes(author.id);

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
        return message.reply(`🚪 **JoinGate No Avatar Gate** is now **${jg.antiNoAvatar ? 'ENABLED' : 'DISABLED'}**.`);
      }
      if (toggle === 'unverifiedbot' || toggle === 'unverified') {
        jg.antiUnverifiedBot = !jg.antiUnverifiedBot;
        antinukeConfigs.set(guild.id, config);
        return message.reply(`🚪 **JoinGate Anti-Unverified Bot** is now **${jg.antiUnverifiedBot ? 'ENABLED' : 'DISABLED'}**.`);
      }
      if (toggle === 'adname' || toggle === 'advertising') {
        jg.antiAdvertisingName = !jg.antiAdvertisingName;
        antinukeConfigs.set(guild.id, config);
        return message.reply(`🚪 **JoinGate Advertising Name Gate** is now **${jg.antiAdvertisingName ? 'ENABLED' : 'DISABLED'}**.`);
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
        `**🚪 Join Gate Status**\n` +
        `\`\`\`\n` +
        `Bot Additions Protection: ${jg.antiBotAdd ? 'ENABLED [OK]' : 'DISABLED [OFF]'}\n` +
        `Unverified Bot Gate     : ${jg.antiUnverifiedBot ? 'ENABLED [OK]' : 'DISABLED [OFF]'}\n` +
        `No Avatar Gate          : ${jg.antiNoAvatar ? 'ENABLED [OK]' : 'DISABLED [OFF]'}\n` +
        `Advertising Name Gate   : ${jg.antiAdvertisingName ? 'ENABLED [OK]' : 'DISABLED [OFF]'}\n` +
        `Minimum Account Age     : ${jg.antiAccountAge ? `ENABLED (${jg.minAccountAgeDays} Days)` : 'DISABLED [OFF]'}\n` +
        `\`\`\`\n\n` +
        `**⚡ Commands to Toggle**\n` +
        `\`\`\`\n` +
        `.antinuke joingate noavatar\n` +
        `.antinuke joingate unverified\n` +
        `.antinuke joingate adname\n` +
        `.antinuke joingate accage <days>\n` +
        `\`\`\``;

      const embed = createStyledEmbed({
        title: `🚪 Join Gate Security Controls`,
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
        `**⚡ Commands to Toggle**\n` +
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
    // DEDICATED WHITELIST PANEL & GRANULAR PERMS (.whitelist)
    // ─────────────────────────────────────────
    if (invoked === 'whitelist' || sub === 'whitelist') {
      const action = (invoked === 'whitelist' ? args[0] : args[1])?.toLowerCase();
      const user = message.mentions.users.first() || (args[1] && args[1].match(/^\d{17,20}$/) ? await message.client.users.fetch(args[1]).catch(() => null) : null) || (args[2] && args[2].match(/^\d{17,20}$/) ? await message.client.users.fetch(args[2]).catch(() => null) : null);

      // .whitelist add @user [perms]
      if (action === 'add' && (user || args[1])) {
        const targetUser = user || await message.client.users.fetch(args[1]).catch(() => null);
        if (!targetUser) return message.reply(`👥 Usage: \`.whitelist add @user [perms]\``);

        const permArgs = args.slice(2).map(p => p.toLowerCase()).filter(p => ALL_PERMS.includes(p));
        const grantedPerms = permArgs.length > 0 ? new Set(permArgs) : new Set(['all']);

        config.whitelistedUsers.set(targetUser.id, grantedPerms);
        antinukeConfigs.set(guild.id, config);

        const embed = createStyledEmbed({
          title: `👥 Member Whitelisted with Granular Perms`,
          description:
            `**User:** <@${targetUser.id}> (\`${targetUser.tag}\`)\n` +
            `**Granted Permissions:** ${formatUserPerms(grantedPerms)}\n\n` +
            `**Management Commands:**\n` +
            `\`\`\`\n` +
            `.whitelist perms @user +ban -role\n` +
            `\`\`\``,
          requestedBy: author,
          clientUser
        });
        return message.channel.send({ embeds: [embed] });
      }

      // .whitelist perms @user <+perm / -perm>
      if (action === 'perms' || action === 'config' || action === 'edit') {
        const targetUser = user || await message.client.users.fetch(args[1]).catch(() => null);
        if (!targetUser) return message.reply(`${emojis.WARNING} Usage: \`.whitelist perms @user +ban -role +channel\``);

        let permsSet = config.whitelistedUsers.get(targetUser.id);
        if (!permsSet) {
          permsSet = new Set(['all']);
          config.whitelistedUsers.set(targetUser.id, permsSet);
        }

        const changes = args.slice(2);
        if (changes.length === 0) {
          const embed = createStyledEmbed({
            title: `${emojis.GEAR} Whitelist Permissions — ${targetUser.username}`,
            description:
              `**Current Granted Permissions:**\n${formatUserPerms(permsSet)}\n\n` +
              `**Available Permissions:**\n` +
              `\`ban\`, \`kick\`, \`bot\`, \`channel\`, \`role\`, \`webhook\`, \`guild\`, \`all\`\n\n` +
              `**To Toggle Permissions:**\n` +
              `\`.whitelist perms @user +ban -role\` (Turn ON ban, Turn OFF role)\n` +
              `\`.whitelist perms @user +all\` (Grant all bypasses)\n` +
              `\`.whitelist perms @user -all\` (Revoke all bypasses)`,
            requestedBy: author,
            clientUser
          });
          return message.channel.send({ embeds: [embed] });
        }

        changes.forEach(change => {
          const sign = change[0];
          const permName = change.slice(1).toLowerCase();

          if (sign === '+' && ALL_PERMS.includes(permName)) {
            if (permName === 'all') {
              permsSet.clear();
              permsSet.add('all');
            } else {
              permsSet.delete('all');
              permsSet.add(permName);
            }
          } else if (sign === '-' && ALL_PERMS.includes(permName)) {
            permsSet.delete('all');
            permsSet.delete(permName);
          }
        });

        config.whitelistedUsers.set(targetUser.id, permsSet);
        antinukeConfigs.set(guild.id, config);

        return message.reply(`${emojis.SUCCESS} Updated whitelist perms for **${targetUser.tag}**: ${formatUserPerms(permsSet)}`);
      }

      // .whitelist remove @user
      if (action === 'remove' && (user || args[1])) {
        const targetUser = user || await message.client.users.fetch(args[1]).catch(() => null);
        if (targetUser) {
          config.whitelistedUsers.delete(targetUser.id);
          antinukeConfigs.set(guild.id, config);
          return message.reply(`${emojis.SUCCESS} Removed **${targetUser.tag}** from AntiNuke Whitelist.`);
        }
      }

      // Default DEDICATED WHITELIST DASHBOARD PANEL
      const entries = [];
      for (const [id, permsSet] of config.whitelistedUsers.entries()) {
        entries.push(`• <@${id}> (\`${id}\`)\n  └ **Perms**: ${formatUserPerms(permsSet)}`);
      }

      const listText = entries.join('\n\n') || '*No users currently whitelisted.*';

      const embed = createStyledEmbed({
        title: `${emojis.SHIELD} AntiNuke Whitelist & Permission Panel`,
        subtitle: `Granular Security Bypass Management`,
        description:
          `Below is your server whitelist delegation status.\n\n` +
          `**Whitelisted Members & Granted Permissions:**\n${listText}\n\n` +
          `**Whitelist Management Commands:**\n` +
          `\`\`\`\n` +
          `.whitelist add @user [perms]\n` +
          `.whitelist perms @user +ban -role\n` +
          `.whitelist remove @user\n` +
          `\`\`\``,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 1. .antinuke enable [feature/all]
    if (sub === 'enable' || sub === 'on') {
      const target = args[1]?.toLowerCase();

      if (!target || target === 'all') {
        config.enabled = true;
        Object.keys(config.filters).forEach(k => config.filters[k] = true);
        antinukeConfigs.set(guild.id, config);
        return message.reply(`${emojis.SHIELD} AntiNuke Security System & ALL protection filters are now **ENABLED**!`);
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
        antinukeConfigs.set(guild.id, config);
        return message.reply(`${emojis.WARNING} AntiNuke Security System is now **DISABLED**.`);
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
        return message.reply(`👑 Added **${user.tag}** as Extra Owner with full security bypass permissions!`);
      }

      if (action === 'remove' && user) {
        config.extraOwners.delete(user.id);
        antinukeConfigs.set(guild.id, config);
        return message.reply(`👑 Removed **${user.tag}** from Extra Owners.`);
      }

      const list = Array.from(config.extraOwners).map(id => `• <@${id}> (\`${id}\`)`).join('\n') || '*No Extra Owners assigned.*';
      return message.reply({
        embeds: [
          createStyledEmbed({
            title: `👑 Server Extra Owners`,
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
      // PERMISSION CHECK for button clicks
      const isOwnerBtn = guild.ownerId === interaction.user.id;
      const isExtraOwnerBtn = config.extraOwners.has(interaction.user.id) || ['1420687548807905324', '1529362747047805029', '1514546738055348237'].includes(interaction.user.id);

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
          content: `👥 **Whitelist Permissions Panel**\n${entries.join('\n') || 'No members whitelisted.'}\n\nUse \`.whitelist perms @user +ban -role\` to edit granular perms!`,
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


