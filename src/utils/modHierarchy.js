const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const { createStyledEmbed } = require('./embedBuilder');
const { createDynamicBox } = require('./boxBuilder');
const emojis = require('./emojis');
const db = require('../database/db');

// In-memory quota store with periodic reset windows (persisted through execution)
// guildId -> userId -> action -> { count, resetAt }
const quotaStore = new Map();

function getActionUsage(guildId, userId, action, windowMs) {
  if (!quotaStore.has(guildId)) quotaStore.set(guildId, new Map());
  const gStore = quotaStore.get(guildId);
  if (!gStore.has(userId)) gStore.set(userId, new Map());
  const uStore = gStore.get(userId);

  const now = Date.now();
  let data = uStore.get(action);
  if (!data || now > data.resetAt) {
    data = { count: 0, resetAt: now + windowMs };
    uStore.set(action, data);
  }
  return data;
}

// 10-Tier Specification matching user's exact requirements
const TIERS = {
  1: {
    level: 1,
    name: 'Trial Mods',
    roles: ['trial chat mod', 'trial hangout mod', 'trial gaming mod', 'trial singing mod'],
    commands: ['snipe', 'warn', 'unwarn', 'clear'],
    maxMuteMs: 0, // No mute
    maxClear: 15,
    maxContains: 0,
    warnLimit: 4,
    warnWindowMs: 24 * 60 * 60 * 1000 // 24 hours
  },
  2: {
    level: 2,
    name: 'Junior Mods',
    roles: ['junior chat mod', 'junior hangout mod', 'junior gaming mod', 'junior singing mod'],
    commands: ['enlarge', 'snipe', 'slowmode', 'unslowmode', 'mute', 'unmute', 'clear', 'clear contains', 'warn', 'unwarn'],
    maxMuteMs: 15 * 60 * 1000, // 15 mins
    maxClear: 50,
    maxContains: 15,
    warnLimit: 6,
    warnWindowMs: 24 * 60 * 60 * 1000 // 24 hours
  },
  3: {
    level: 3,
    name: 'Regular / Full Mods',
    roles: ['chat mod', 'hangout modz', 'gaming mod', 'singing mod'],
    commands: ['enlarge', 'snipe', 'slowmode', 'unslowmode', 'mute', 'unmute', 'clear', 'clear contains', 'clear reactions', 'clear bots', 'warn', 'unwarn'],
    maxMuteMs: 6 * 60 * 60 * 1000, // 6 hours
    maxClear: 70,
    maxContains: 30,
    warnLimit: 10,
    warnWindowMs: 12 * 60 * 60 * 1000 // 12 hours
  },
  4: {
    level: 4,
    name: 'Head Mods',
    roles: ['head chat mod', 'head hangout mod', 'head gaming mod', 'head singing mod'],
    commands: ['enlarge', 'snipe', 'slowmode', 'unslowmode', 'mute', 'unmute', 'clear', 'clear contains', 'clear reactions', 'clear bots', 'deleteemoji', 'deletesticker', 'steal', 'clear user', 'warn', 'unwarn'],
    maxMuteMs: 12 * 60 * 60 * 1000, // 12 hours
    maxClear: 100,
    maxContains: 50,
    warnLimit: 15,
    warnWindowMs: 6 * 60 * 60 * 1000 // 6 hours
  },
  5: {
    level: 5,
    name: 'Supervisors',
    roles: ['chat supervisor', 'hangout vc supervisor', 'gaming supervisor'],
    commands: ['enlarge', 'snipe', 'slowmode', 'unslowmode', 'mute', 'unmute', 'clear', 'clear contains', 'clear reactions', 'clear bots', 'deleteemoji', 'deletesticker', 'steal', 'clear user', 'clone', 'warn', 'unwarn'],
    maxMuteMs: 24 * 60 * 60 * 1000, // 24 hours
    maxClear: 100,
    maxContains: 70,
    cloneLimit: 1,
    warnLimit: 18,
    warnWindowMs: 3 * 60 * 60 * 1000 // 3 hours
  },
  6: {
    level: 6,
    name: 'Department Managers',
    roles: ['chat manager', 'hangout vc manager', 'gaming vc manager', 'singing vc manager', 'ticket admin'],
    commands: ['enlarge', 'snipe', 'slowmode', 'unslowmode', 'mute', 'unmute', 'clear', 'clear contains', 'clear reactions', 'clear bots', 'deleteemoji', 'deletesticker', 'steal', 'clear user', 'clone', 'warn', 'unwarn'],
    maxMuteMs: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxClear: 100,
    maxContains: 90,
    cloneLimit: 1,
    warnLimit: 25,
    warnWindowMs: 1 * 60 * 60 * 1000 // 1 hour
  },
  7: {
    level: 7,
    name: 'Trial Management',
    roles: ['trial management .', 'trial management'],
    commands: ['enlarge', 'snipe', 'slowmode', 'unslowmode', 'mute', 'unmute', 'clear', 'clear contains', 'clear reactions', 'clear bots', 'deleteemoji', 'deletesticker', 'steal', 'clear user', 'clone', 'warn', 'unwarn', 'audit'],
    maxMuteMs: 14 * 24 * 60 * 60 * 1000, // 14 days
    maxClear: 100,
    maxContains: 100,
    cloneLimit: 1,
    warnLimit: 25,
    warnWindowMs: 1 * 60 * 60 * 1000 // 1 hour
  },
  8: {
    level: 8,
    name: 'Management',
    roles: ['management .', 'management'],
    commands: ['enlarge', 'snipe', 'slowmode', 'unslowmode', 'mute', 'unmute', 'clear', 'clear contains', 'clear reactions', 'clear bots', 'deleteemoji', 'deletesticker', 'steal', 'clear user', 'clone', 'warn', 'unwarn', 'audit', 'role'],
    maxMuteMs: 24 * 24 * 60 * 60 * 1000, // 24 days (Discord max is 28 days)
    maxClear: 100,
    maxContains: 100,
    cloneLimit: 2,
    warnLimit: 30,
    warnWindowMs: 1 * 60 * 60 * 1000 // 1 hour
  },
  9: {
    level: 9,
    name: 'Directors',
    roles: ['director .', 'director', 'senior director .', 'senior director'],
    commands: ['enlarge', 'snipe', 'slowmode', 'unslowmode', 'mute', 'unmute', 'clear', 'clear contains', 'clear reactions', 'clear bots', 'deleteemoji', 'deletesticker', 'steal', 'clear user', 'clone', 'warn', 'unwarn', 'audit', 'role', 'kick'],
    maxMuteMs: 28 * 24 * 60 * 60 * 1000, // 28 days (Max Discord API allows)
    maxClear: 100,
    maxContains: 100,
    cloneLimit: 3,
    kickLimit: 10,
    kickWindowMs: 24 * 60 * 60 * 1000,
    warnLimit: 30,
    warnWindowMs: 1 * 60 * 60 * 1000
  },
  10: {
    level: 10,
    name: 'Executive Director & Supreme Highest Staff',
    roles: ['executive director .', 'executive director', 'holds power ?', 'holds power', 'defines authority .', 'beyond infinity .', 'dynamic supreme'],
    commands: ['enlarge', 'snipe', 'slowmode', 'unslowmode', 'mute', 'unmute', 'clear', 'clear contains', 'clear reactions', 'clear bots', 'deleteemoji', 'deletesticker', 'steal', 'clear user', 'clone', 'warn', 'unwarn', 'audit', 'role', 'kick', 'ban', 'unban'],
    maxMuteMs: 28 * 24 * 60 * 60 * 1000,
    maxClear: 100,
    maxContains: 100,
    cloneLimit: 3,
    kickLimit: 10,
    kickWindowMs: 24 * 60 * 60 * 1000,
    banLimit: 5,
    banWindowMs: 24 * 60 * 60 * 1000,
    unbanLimit: 5,
    unbanWindowMs: 24 * 60 * 60 * 1000,
    warnLimit: 30,
    warnWindowMs: 1 * 60 * 60 * 1000
  }
};

/**
 * Determine a member's moderation tier level (1 to 10), 11 for Server Owner, 0 for normal member.
 */
function getMemberTier(member) {
  if (!member || !member.guild) return 0;
  const guild = member.guild;

  // Server Owner & Extra Owner are Tier 11 (Full Bypass)
  const isOwner = guild.ownerId === member.id;
  const antinuke = member.client.commands?.get('antinuke');
  const isExtra = antinuke && antinuke.isExtraOwner ? antinuke.isExtraOwner(guild.id, member.id) : false;
  if (isOwner || isExtra) return 11;

  // Check roles from highest (10) down to lowest (1)
  const memberRoleNames = member.roles.cache.map(r => r.name.toLowerCase().trim());
  const memberRoleIds = member.roles.cache.map(r => r.id);

  // Check explicitly bound roles in DB first (e.g. .mod role bind <tier> @role)
  const modConfig = db.getModConfig(guild.id);
  if (modConfig.tierRoles) {
    for (let t = 10; t >= 1; t--) {
      const boundRoleIds = modConfig.tierRoles[t] || [];
      if (boundRoleIds.some(id => memberRoleIds.includes(id))) {
        return t;
      }
    }
  }

  // Fallback to name pattern matching from screenshots
  function matchesRole(roleName, pattern) {
    const cleanRole = roleName.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    const cleanPat = pattern.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleanRole === cleanPat) return true;

    // Disambiguate generic full mod names from trial / junior / head variants
    if (cleanPat === 'chat mod' && (cleanRole.includes('trial') || cleanRole.includes('junior') || cleanRole.includes('head'))) return false;
    if ((cleanPat === 'hangout modz' || cleanPat === 'hangout mod') && (cleanRole.includes('trial') || cleanRole.includes('junior') || cleanRole.includes('head'))) return false;
    if (cleanPat === 'gaming mod' && (cleanRole.includes('trial') || cleanRole.includes('junior') || cleanRole.includes('head'))) return false;
    if (cleanPat === 'singing mod' && (cleanRole.includes('trial') || cleanRole.includes('junior') || cleanRole.includes('head'))) return false;
    if (cleanPat === 'management' && cleanRole.includes('trial')) return false;

    return cleanRole.includes(cleanPat);
  }

  for (let t = 10; t >= 1; t--) {
    const tierDef = TIERS[t];
    for (const pattern of tierDef.roles) {
      if (memberRoleNames.some(rName => matchesRole(rName, pattern))) {
        return t;
      }
    }
  }

  // If user has Discord Administrator but no specific mod role, assign Tier 10
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return 10;
  }

  return 0; // Normal member (0 access)
}

/**
 * Validates whether a member has permission to run a moderation command and checks quotas.
 */
async function verifyTierPermission(message, commandName, options = {}) {
  const member = message.member;
  const guild = message.guild;
  const tierLevel = getMemberTier(member);

  // 1. Tier 11 (Server Owner / Extra Owner) has complete bypass
  if (tierLevel === 11) {
    return { allowed: true, isOwner: true, tier: 11 };
  }

  // 2. Normal members (Tier 0) have 0 access
  if (tierLevel === 0) {
    await message.reply(`${emojis.WARNING || '⚠️'} **Access Denied!** You do not hold an authorized staff role to use moderation commands.`);
    return { allowed: false, reason: 'NOT_STAFF' };
  }

  // 3. Admin-only command check (.nuke is strictly for Server Owner & Discord Administrators)
  if (commandName === 'nuke') {
    if (!member.permissions.has(PermissionsBitField.Flags.Administrator) && guild.ownerId !== member.id) {
      await message.reply(`${emojis.WARNING || '⚠️'} **Admin Reserved!** The \`.nuke\` command is strictly reserved for **Server Owner & Discord Administrators** only.`);
      return { allowed: false, reason: 'ADMIN_ONLY' };
    }
    return { allowed: true, tier: tierLevel };
  }

  const tierDef = TIERS[tierLevel];

  // 4. Check if command is in tier's command list
  const baseCmd = commandName.toLowerCase();
  const allowedCmds = tierDef.commands || [];
  if (!allowedCmds.includes(baseCmd)) {
    await message.reply(
      `${emojis.WARNING || '⚠️'} **Permission Denied!** The \`.${baseCmd}\` command is not unlocked for your tier (**${tierDef.name}**).\n` +
      (baseCmd === 'ban' || baseCmd === 'unban' ? `🔒 **Note:** \`.${baseCmd}\` is strictly reserved for **Tier 10 (Executive Director / Holds Power)**.` :
       baseCmd === 'kick' ? `🔒 **Note:** \`.kick\` requires **Tier 9 (Directors)** or higher.` :
       `🔒 Requires a higher staff rank.`)
    );
    return { allowed: false, reason: 'TIER_TOO_LOW' };
  }

  // 5. Parameter Limits Checks
  // A. MUTE DURATION LIMIT
  if ((baseCmd === 'mute' || baseCmd === 'timeout') && options.durationMs) {
    if (tierDef.maxMuteMs <= 0) {
      await message.reply(`${emojis.WARNING || '⚠️'} **Access Denied!** Staff in **${tierDef.name}** cannot issue timeouts.`);
      return { allowed: false, reason: 'MUTE_NOT_ALLOWED' };
    }
    if (options.durationMs > tierDef.maxMuteMs) {
      const maxMins = Math.round(tierDef.maxMuteMs / 60000);
      const maxHours = Math.round(tierDef.maxMuteMs / 3600000);
      const maxDays = Math.round(tierDef.maxMuteMs / 86400000);
      const maxStr = maxDays >= 1 ? `${maxDays} Days` : maxHours >= 1 ? `${maxHours} Hours` : `${maxMins} Minutes`;
      await message.reply(`${emojis.WARNING || '⚠️'} **Duration Exceeded!** Staff in **${tierDef.name}** can only mute for a maximum of **${maxStr}**.`);
      return { allowed: false, reason: 'DURATION_EXCEEDED' };
    }
  }

  // B. CLEAR / PURGE LIMIT
  if (baseCmd === 'clear' && options.clearCount) {
    if (options.clearCount > tierDef.maxClear) {
      await message.reply(`${emojis.WARNING || '⚠️'} **Purge Limit Exceeded!** Staff in **${tierDef.name}** can clear up to **${tierDef.maxClear} messages** at a time.`);
      return { allowed: false, reason: 'CLEAR_LIMIT_EXCEEDED' };
    }
  }

  // C. CLEAR CONTAINS LIMIT
  if (baseCmd === 'clear contains' && options.clearCount) {
    if (options.clearCount > tierDef.maxContains) {
      await message.reply(`${emojis.WARNING || '⚠️'} **Contains Purge Limit Exceeded!** Staff in **${tierDef.name}** can clear contains up to **${tierDef.maxContains} messages**.`);
      return { allowed: false, reason: 'CONTAINS_LIMIT_EXCEEDED' };
    }
  }

  // 6. ACTION QUOTAS & ANTI-ABUSE AUTOMATIC 2-HOUR TIMEOUT
  let quotaCheck = null;

  if (baseCmd === 'warn' || baseCmd === 'unwarn') {
    quotaCheck = {
      action: 'warn',
      limit: tierDef.warnLimit,
      windowMs: tierDef.warnWindowMs,
      label: `${tierDef.warnLimit} warns in ${Math.round(tierDef.warnWindowMs / 3600000)}h`
    };
  } else if (baseCmd === 'kick' && tierDef.kickLimit) {
    quotaCheck = {
      action: 'kick',
      limit: tierDef.kickLimit,
      windowMs: tierDef.kickWindowMs,
      label: `${tierDef.kickLimit} kicks in 24h`
    };
  } else if (baseCmd === 'ban' && tierDef.banLimit) {
    quotaCheck = {
      action: 'ban',
      limit: tierDef.banLimit,
      windowMs: tierDef.banWindowMs,
      label: `${tierDef.banLimit} bans in 24h`
    };
  } else if (baseCmd === 'unban' && tierDef.unbanLimit) {
    quotaCheck = {
      action: 'unban',
      limit: tierDef.unbanLimit,
      windowMs: tierDef.unbanWindowMs,
      label: `${tierDef.unbanLimit} unbans in 24h`
    };
  } else if (baseCmd === 'clone' && tierDef.cloneLimit) {
    quotaCheck = {
      action: 'clone',
      limit: tierDef.cloneLimit,
      windowMs: 24 * 60 * 60 * 1000,
      label: `${tierDef.cloneLimit} channel clone in 24h`
    };
  }

  if (quotaCheck) {
    const usage = getActionUsage(guild.id, member.id, quotaCheck.action, quotaCheck.windowMs);
    if (usage.count >= quotaCheck.limit) {
      // Automatic 2-hour timeout!
      try {
        if (member.moderatable) {
          await member.timeout(2 * 60 * 60 * 1000, `Anti-Abuse: Exceeded quota of ${quotaCheck.label}`);
        }
      } catch (err) {
        console.warn('[AntiAbuse Timeout Error]', err.message);
      }

      const alertEmbed = createStyledEmbed({
        title: `🚨 Anti-Abuse Protection Triggered!`,
        description:
          `**Staff Member:** <@${member.id}> (\`${member.user.tag}\`)\n` +
          `• **Rank:** \`${tierDef.name}\` (Tier ${tierLevel})\n` +
          `• **Allowed Quota:** \`${quotaCheck.label}\`\n` +
          `• **Actions Attempted:** \`${usage.count + 1}\`\n\n` +
          `⛔ **Action Blocked!** You have exceeded your staff action quota.\n` +
          `⏳ **Automatic Penalty:** You have been automatically **timed out for 2 Hours** to safeguard the server!`,
        requestedBy: member.user
      });
      await message.channel.send({ embeds: [alertEmbed] });
      return { allowed: false, reason: 'QUOTA_EXCEEDED' };
    }

    // Increment usage
    usage.count += 1;
  }

  return { allowed: true, tier: tierLevel, tierDef };
}

// ==========================================
// QUICK ROLE COMMANDS DEFINITION (a<role> / r<role>)
// ==========================================
const QUICK_ROLES = {
  // --- STAFF ROLES (Management to Higher - Tier 8+) ---
  trialchat: { key: 'trialchat', name: 'Trial Chat Mod .', minTier: 8, aliases: ['tchat', 'trialchatmod', 'tchatmod'] },
  jrchat: { key: 'jrchat', name: 'Junior Chat Mod .', minTier: 8, aliases: ['jchat', 'juniortchat', 'jrchatmod', 'jchatmod'] },
  trialhangout: { key: 'trialhangout', name: 'Trial Hangout Mod .', minTier: 8, aliases: ['thangout', 'thangoutmod'] },
  jrhangout: { key: 'jrhangout', name: 'Junior Hangout Mod .', minTier: 8, aliases: ['jhangout', 'jrhangoutmod', 'jhangoutmod'] },
  trialgaming: { key: 'trialgaming', name: 'Trial Gaming Mod .', minTier: 8, aliases: ['tgaming', 'tgamingmod'] },
  jrgaming: { key: 'jrgaming', name: 'Junior Gaming Mod .', minTier: 8, aliases: ['jgaming', 'jrgamingmod', 'jgamingmod'] },
  jrsinging: { key: 'jrsinging', name: 'Junior Singing Mod .', minTier: 8, aliases: ['jsinging', 'jrsingingmod', 'jsingingmod'] },
  chatmod: { key: 'chatmod', name: 'Chat Mod .', minTier: 8, aliases: ['nchatmod'] },
  hangoutmod: { key: 'hangoutmod', name: 'Hangout Modz .', minTier: 8, aliases: ['nhangoutmod'] },
  gamingmod: { key: 'gamingmod', name: 'Gaming mod .', minTier: 8, aliases: ['ngamingmod'] },
  singingmod: { key: 'singingmod', name: 'Singing Mod .', minTier: 8, aliases: ['singing'] },

  // --- SENIOR / HEAD STAFF ROLES (Director to Higher - Tier 9+) ---
  headchat: { key: 'headchat', name: 'Head Chat Mod .', minTier: 9, aliases: ['hchat', 'headchatmod', 'dhchatmod'] },
  headhangout: { key: 'headhangout', name: 'Head Hangout Mod .', minTier: 9, aliases: ['hhangout', 'headhangoutmod', 'dhhangoutmod'] },
  headgaming: { key: 'headgaming', name: 'Head Gaming Mod .', minTier: 9, aliases: ['hgaming', 'headgamingmod', 'dhgamingmod'] },
  headsinging: { key: 'headsinging', name: 'Head Singing Mod .', minTier: 9, aliases: ['hsinging', 'headsingingmod', 'dhsingingmod'] },
  ticket: { key: 'ticket', name: 'Ticket Admin', minTier: 9, aliases: ['ticketadmin', 'dticket'] },
  verifier: { key: 'verifier', name: 'Veriifiers', minTier: 9, aliases: ['verifiers', 'dverifier'] },
  leave: { key: 'leave', name: 'Staff on Leave', minTier: 9, aliases: ['dleave', 'staffleave', 'onleave'] },

  // --- SPECIAL & PERK ROLES (Management to Higher - Tier 8+) ---
  girl: { key: 'girl', name: 'Girl', minTier: 8, aliases: ['dgirl', 'girls'] },
  artist: { key: 'artist', name: 'Artist', minTier: 8, aliases: ['dartist'] },
  regular: { key: 'regular', name: 'Radha Regulars .', minTier: 8, aliases: ['dregular', 'radharegulars'] },
  sovereign: { key: 'sovereign', name: 'Sovereigns .', minTier: 8, aliases: ['dsovereign', 'sovereigns'] },
  crew: { key: 'crew', name: 'Crew Leader .', minTier: 8, aliases: ['dcrew', 'crewleader'] },
  empress: { key: 'empress', name: 'Empresses .', minTier: 8, aliases: ['dempress', 'empresses'] },
  crownprincess: { key: 'crownprincess', name: 'Crown Princess .', minTier: 8, aliases: ['dcrownprincess'] },
  overseer: { key: 'overseer', name: 'Overseer .', minTier: 8, aliases: ['doverseer'] },
  angel: { key: 'angel', name: 'Fallen Angel .', minTier: 8, aliases: ['dangel', 'fallenangel'] },
  enough: { key: 'enough', name: 'Name Is Enough .', minTier: 8, aliases: ['denough'] },
  hot: { key: 'hot', name: 'Too Hot to Handle .', minTier: 8, aliases: ['dhot'] },
  mystics: { key: 'mystics', name: 'Mystics .', minTier: 8, aliases: ['dmystics'] },
  apsara: { key: 'apsara', name: 'Apsara .', minTier: 8, aliases: ['dapsara'] },
  vchelp: { key: 'vchelp', name: 'Vc Help .', minTier: 8, aliases: ['dvchelp'] },
  pfp: { key: 'pfp', name: 'pfp mod .', minTier: 8, aliases: ['dpfp', 'pfpmod'] },
  fm: { key: 'fm', name: 'FM', minTier: 8, aliases: ['dfm'] },
  vouch: { key: 'vouch', name: 'Vouched <3', minTier: 8, aliases: ['dvouch'] },
  vip: { key: 'vip', name: 'VIPs .', minTier: 8, aliases: ['dvip', 'vips'] },
  vvip: { key: 'vvip', name: 'VVIP .', minTier: 8, aliases: ['dvvip'] },
  guest: { key: 'guest', name: 'Distinguished Guest .', minTier: 8, aliases: ['dguest'] },
  star: { key: 'star', name: 'Star Of The Week .', minTier: 8, aliases: ['dstar', 'dstarofweek', 'starofweek'] }
};

/**
 * Handle quick role addition (`a<role> @user`) and removal (`r<role> @user`)
 */
async function handleQuickRole(message, isAdd, roleKey, args) {
  const authorMember = message.member;
  const guild = message.guild;
  const authorTier = getMemberTier(authorMember);

  // Find role definition
  let roleDef = QUICK_ROLES[roleKey];
  if (!roleDef) {
    for (const def of Object.values(QUICK_ROLES)) {
      if (def.aliases && def.aliases.includes(roleKey)) {
        roleDef = def;
        break;
      }
    }
  }

  if (!roleDef) return false;

  // 1. Minimum Tier Check (Must be at least minTier, e.g. Tier 8 Management or Tier 9 Director)
  if (authorTier < roleDef.minTier && authorTier !== 11) {
    const requiredName = TIERS[roleDef.minTier]?.name || `Tier ${roleDef.minTier}`;
    await message.reply(`${emojis.WARNING || '⚠️'} **Authority Required!** You must be **${requiredName}** or higher to assign/remove the **${roleDef.name}** role.`);
    return true;
  }

  // 2. Target Member Validation
  const targetUser = message.mentions.members.first() || guild.members.cache.get(args[0]);
  if (!targetUser) {
    const prefix = isAdd ? 'a' : 'r';
    await message.reply(`${emojis.WARNING || '⚠️'} **Usage:** \`.${prefix}${roleKey} @user\` (Please mention a valid member or provide user ID).`);
    return true;
  }

  // 3. Self-Assignment Guard (KHUD KO ROLES NA DE PAE)
  if (targetUser.id === authorMember.id && authorTier !== 11) {
    await message.reply(`${emojis.WARNING || '⚠️'} **Security Violation:** You cannot assign or remove roles from **yourself**!`);
    return true;
  }

  // 4. Resolve Target Role in Server
  const targetRole = guild.roles.cache.find(
    r => r.name.toLowerCase() === roleDef.name.toLowerCase() ||
         r.name.toLowerCase().includes(roleDef.name.toLowerCase()) ||
         r.name.toLowerCase().replace(/[^a-z0-9]/g, '') === roleDef.name.toLowerCase().replace(/[^a-z0-9]/g, '')
  );

  if (!targetRole) {
    await message.reply(`${emojis.WARNING || '⚠️'} Role **@${roleDef.name}** was not found in this server. Please create it first.`);
    return true;
  }

  // 5. Discord Hierarchy Position Check (Must be strictly BELOW staff's highest role)
  if (authorTier !== 11) {
    if (targetRole.position >= authorMember.roles.highest.position) {
      await message.reply(`${emojis.WARNING || '⚠️'} **Hierarchy Violation:** You can only assign/remove roles that are **strictly below** your highest role (<@&${authorMember.roles.highest.id}>).`);
      return true;
    }
  }

  // 6. Dangerous Power Roles Guard (Never grant Admin, Ban, Kick, Manage Roles via quick commands)
  const DANGEROUS_PERMS = [
    PermissionsBitField.Flags.Administrator,
    PermissionsBitField.Flags.BanMembers,
    PermissionsBitField.Flags.KickMembers,
    PermissionsBitField.Flags.ManageGuild,
    PermissionsBitField.Flags.ManageRoles,
    PermissionsBitField.Flags.ManageChannels
  ];
  if (DANGEROUS_PERMS.some(p => targetRole.permissions.has(p)) && authorTier !== 11) {
    await message.reply(`${emojis.WARNING || '⚠️'} **Security Block:** Role **@${targetRole.name}** carries elevated administrative privileges and cannot be managed via quick role commands.`);
    return true;
  }

  // 7. Bot Permissions Check
  const botMember = guild.members.me;
  if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles) || targetRole.position >= botMember.roles.highest.position) {
    await message.reply(`${emojis.WARNING || '⚠️'} **Bot Role Hierarchy Error:** I cannot manage the role **@${targetRole.name}** because it is positioned higher than my bot role.`);
    return true;
  }

  // 8. Execute Role Modification
  try {
    if (isAdd) {
      if (targetUser.roles.cache.has(targetRole.id)) {
        await message.reply(`${emojis.INFO || 'ℹ️'} <@${targetUser.id}> already has the **@${targetRole.name}** role.`);
        return true;
      }
      await targetUser.roles.add(targetRole, `Quick Role added by ${authorMember.user.tag}`);
      const embed = createStyledEmbed({
        title: `✅ Role Added Successfully`,
        description:
          `• **Member:** <@${targetUser.id}> (\`${targetUser.user.tag}\`)\n` +
          `• **Role Added:** <@&${targetRole.id}>\n` +
          `• **Action By:** <@${authorMember.id}> (\`${authorMember.user.tag}\`)`,
        requestedBy: authorMember.user
      });
      await message.channel.send({ embeds: [embed] });
    } else {
      if (!targetUser.roles.cache.has(targetRole.id)) {
        await message.reply(`${emojis.INFO || 'ℹ️'} <@${targetUser.id}> does not have the **@${targetRole.name}** role.`);
        return true;
      }
      await targetUser.roles.remove(targetRole, `Quick Role removed by ${authorMember.user.tag}`);
      const embed = createStyledEmbed({
        title: `🧹 Role Removed Successfully`,
        description:
          `• **Member:** <@${targetUser.id}> (\`${targetUser.user.tag}\`)\n` +
          `• **Role Removed:** <@&${targetRole.id}>\n` +
          `• **Action By:** <@${authorMember.id}> (\`${authorMember.user.tag}\`)`,
        requestedBy: authorMember.user
      });
      await message.channel.send({ embeds: [embed] });
    }
  } catch (err) {
    console.error('[Quick Role Error]', err);
    await message.reply(`${emojis.WARNING || '⚠️'} Failed to modify role: ${err.message}`);
  }

  return true;
}

/**
 * Render the Custom Roles panel showing all a<role> and r<role> commands
 */
function renderCustomRolesPanel(message, clientUser) {
  const mgmtBox = createDynamicBox('MANAGEMENT TO HIGHER (TIER 8+)', [
    '.atrialchat / .rtrialchat    -> @Trial Chat Mod',
    '.ajrchat / .rjrchat          -> @Junior Chat Mod',
    '.achatmod / .rchatmod        -> @Chat Mod',
    '.atrialhangout / .rtrialh... -> @Trial Hangout Mod',
    '.ajrhangout / .rjrhangout    -> @Junior Hangout Mod',
    '.ahangoutmod / .rhangoutmod  -> @Hangout Modz',
    '.atrialgaming / .rtrialg...  -> @Trial Gaming Mod',
    '.ajrgaming / .rjrgaming      -> @Junior Gaming Mod',
    '.agamingmod / .rgamingmod    -> @Gaming mod',
    '.ajrsinging / .rjrsinging    -> @Junior Singing Mod',
    '.asingingmod / .rsingingmod  -> @Singing Mod'
  ]);

  const directorBox = createDynamicBox('DIRECTOR TO HIGHER (TIER 9+)', [
    '.aheadchat / .rheadchat      -> @Head Chat Mod',
    '.aheadhangout / .rheadh...   -> @Head Hangout Mod',
    '.aheadgaming / .rheadgaming  -> @Head Gaming Mod',
    '.aheadsinging / .rheads...   -> @Head Singing Mod',
    '.aticket / .rticket          -> @Ticket Admin',
    '.averifier / .rverifier      -> @Veriifiers',
    '.aleave / .rleave            -> @Staff on Leave'
  ]);

  const perksBox = createDynamicBox('SPECIAL & PERK ROLES (TIER 8+)', [
    '.agirl / .rgirl              -> @Girl',
    '.aartist / .rartist          -> @Artist',
    '.avip / .rvip                -> @VIPs',
    '.avvip / .rvvip              -> @VVIP',
    '.aguest / .rguest            -> @Distinguished Guest',
    '.astar / .rstar              -> @Star Of The Week',
    '.avouch / .rvouch            -> @Vouched <3',
    '.aregular / .rregular        -> @Radha Regulars',
    '.acrew / .rcrew              -> @Crew Leader',
    '.aempress / .rempress        -> @Empresses',
    '.aoverseer / .roverseer      -> @Overseer',
    '.aangel / .rangel            -> @Fallen Angel'
  ]);

  return createStyledEmbed({
    title: `🎭 Custom Role Management Panel`,
    subtitle: 'Hierarchy-Safe Role Assignment & Removal Engine',
    description:
      `Welcome **${message.author.username}**! Below is the instant role assignment suite.\n\n` +
      `• **\`a<role> @user\`** ➔ Assign role to member\n` +
      `• **\`r<role> @user\`** ➔ Remove role from member\n\n` +
      '```\n' + mgmtBox + '\n```\n' +
      '```\n' + directorBox + '\n```\n' +
      '```\n' + perksBox + '\n```\n\n' +
      `🔒 **Security Protocols:**\n` +
      `• **Hierarchy Enforcement:** Staff can ONLY assign roles strictly lower than their own rank.\n` +
      `• **Anti-Self-Grant:** Staff members cannot assign or remove roles from themselves.\n` +
      `• **Power Role Immunity:** Roles with Administrator or dangerous permissions cannot be granted.`,
    requestedBy: message.author,
    clientUser
  });
}

module.exports = {
  TIERS,
  QUICK_ROLES,
  getMemberTier,
  verifyTierPermission,
  handleQuickRole,
  renderCustomRolesPanel
};
