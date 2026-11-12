const { PermissionsBitField } = require('discord.js');
const db = require('../database/db');
const emojis = require('./emojis');
const { isBotOwner } = require('./owners');

function isGuildExtraOwner(guildId, userId) {
  if (!guildId || !userId) return false;
  const anConfig = db.getAntinuke ? db.getAntinuke(guildId) : null;
  if (!anConfig || !anConfig.extraOwners) return false;
  return Array.isArray(anConfig.extraOwners)
    ? anConfig.extraOwners.includes(userId)
    : (typeof anConfig.extraOwners.has === 'function' ? anConfig.extraOwners.has(userId) : false);
}

/**
 * Modular Moderation Permit Categories (Rendered as multi-select Dropdown Menus)
 */
const PERMIT_CATEGORIES = [
  {
    id: 'chat',
    emoji: '1️⃣',
    title: '1️⃣ Chat & Utility Moderation Tiers',
    placeholder: '1️⃣ Chat & Utility Moderation Permits...',
    options: [
      {
        value: 'chat_trial',
        label: 'Tier 1: Chat Helper (Snipe & Enlarge)',
        description: 'View deleted messages & enlarge emojis (.snipe, .enlarge)',
        implies: []
      },
      {
        value: 'chat_purge_basic',
        label: 'Tier 2: Message Clearer & Slowmode',
        description: '.clear/.purge (all/bots/files/embeds) & .slowmode/.unslowmode',
        implies: ['chat_trial']
      },
      {
        value: 'chat_purge_adv',
        label: 'Tier 3: Advanced Purge & Clean',
        description: 'Tier 2 + .clear contains, .clear user & .clear reactions',
        implies: ['chat_purge_basic']
      },
      {
        value: 'chat_warn',
        label: 'Tier 4: Warning Management',
        description: 'Warn, unwarn, check warnings & clearwarns (.warn, .unwarn)',
        implies: []
      },
      {
        value: 'chat_mute',
        label: 'Tier 5: Mute / Timeout & Nickname',
        description: 'Timeout/unmute members & manage nicknames (.mute, .nick)',
        implies: []
      },
      {
        value: 'chat_all',
        label: 'All Chat & Utility Perms',
        description: 'Full access to all Chat, Purge, Warn, Mute & Nick perms',
        implies: ['chat_trial', 'chat_purge_basic', 'chat_purge_adv', 'chat_warn', 'chat_mute']
      }
    ]
  },
  {
    id: 'punish',
    emoji: '2️⃣',
    title: '2️⃣ Core Punishment & Case Permits',
    placeholder: '2️⃣ Kick, Ban & Case Registry Permits...',
    options: [
      {
        value: 'punish_kick',
        label: 'Tier 1: Kick Members',
        description: 'Kick rule-breakers from the server (.kick)',
        implies: []
      },
      {
        value: 'punish_ban',
        label: 'Tier 2: Ban, Hackban & Unban',
        description: 'Ban, Hackban & Unban users (.ban, .hackban, .unban)',
        implies: ['punish_kick']
      },
      {
        value: 'punish_mass_unban',
        label: 'Tier 3: Mass Unban (.unbanall)',
        description: 'Mass pardon all banned users in the guild (.unbanall)',
        implies: []
      },
      {
        value: 'cases_view',
        label: 'Tier 4: Cases, Audit & Server Lists',
        description: 'Inspect cases, server audit logs & lists (.case, .audit, .list)',
        implies: []
      },
      {
        value: 'cases_manage',
        label: 'Tier 5: Case Edit & Delete',
        description: 'Tier 4 + edit reasons or delete mod cases (.case edit/delete)',
        implies: ['cases_view']
      },
      {
        value: 'punish_all',
        label: 'All Punishment & Case Perms',
        description: 'Full access to Kick, Ban, Unbanall, Audit & Case Management',
        implies: ['punish_kick', 'punish_ban', 'punish_mass_unban', 'cases_view', 'cases_manage']
      }
    ]
  },
  {
    id: 'vc',
    emoji: '3️⃣',
    title: '3️⃣ Voice (VC) Moderation Permits',
    placeholder: '3️⃣ Voice (VC) Moderation Permits...',
    options: [
      {
        value: 'vc_mute_deafen',
        label: 'Tier 1: VC Mute & Deafen Only',
        description: 'Server-mute & deafen members in VC (.vcmute, .vcdeafen, .vclist)',
        implies: []
      },
      {
        value: 'vc_normal',
        label: 'Tier 2: Normal VC Perms',
        description: 'Tier 1 + .vckick, .vc lock/unlock/ghost/permit/claim',
        implies: ['vc_mute_deafen']
      },
      {
        value: 'vc_move_pull',
        label: 'Tier 3: VC Move & Pull',
        description: 'Move or pull users across VCs (.vcmove, .vcpull)',
        implies: []
      },
      {
        value: 'vc_mass_control',
        label: 'Tier 4: Mass VC & VC Bans',
        description: '.vcmuteall, .vckickall, .vcmoveall, .vcpullall & .vc ban/unban',
        implies: ['vc_normal', 'vc_move_pull']
      },
      {
        value: 'vc_all',
        label: 'All Voice Perms',
        description: 'Full access to all Voice Channel moderation commands',
        implies: ['vc_mute_deafen', 'vc_normal', 'vc_move_pull', 'vc_mass_control']
      }
    ]
  },
  {
    id: 'manage',
    emoji: '4️⃣',
    title: '4️⃣ Channel, Emoji & Role Permits',
    placeholder: '4️⃣ Channel, Emoji & Role Permits...',
    options: [
      {
        value: 'chan_lock_hide',
        label: 'Tier 1: Channel Lock & Hide',
        description: 'Lock, unlock, hide & unhide channels (.lock, .hide)',
        implies: []
      },
      {
        value: 'chan_mass_clone',
        label: 'Tier 2: Mass Channel & Clone',
        description: 'Tier 1 + lockall/hideall & .clone (No .nuke access)',
        implies: ['chan_lock_hide']
      },
      {
        value: 'expr_manage',
        label: 'Tier 3: Emoji & Sticker Manager',
        description: 'Add or delete custom emojis & stickers (.steal, .deleteemoji)',
        implies: []
      },
      {
        value: 'role_assign',
        label: 'Tier 4: Role, TempRole & RoleIcon',
        description: 'Manage roles below own rank (.role, .temprole, .roleicon)',
        implies: []
      },
      {
        value: 'role_quick_staff',
        label: 'Tier 5: Quick Roles (Staff & Perks)',
        description: 'Use .croles a<role>/r<role> for regular staff & perk roles',
        implies: []
      },
      {
        value: 'role_quick_head',
        label: 'Tier 6: Quick Roles (Head Staff)',
        description: 'Tier 5 + assign Head Mods, Ticket Admin, Verifier & Leave',
        implies: ['role_quick_staff']
      },
      {
        value: 'admin_mod_all',
        label: 'All Channel, Emoji & Role Perms',
        description: 'Full Channel, Emoji/Sticker & Role access (No .nuke)',
        implies: ['chan_lock_hide', 'chan_mass_clone', 'expr_manage', 'role_assign', 'role_quick_staff', 'role_quick_head']
      }
    ]
  }
];

const PERMITS = {};
for (const cat of PERMIT_CATEGORIES) {
  for (const opt of cat.options) {
    PERMITS[opt.value] = {
      key: opt.value,
      label: opt.label,
      description: opt.description,
      categoryId: cat.id,
      categoryTitle: cat.title,
      implies: opt.implies || []
    };
  }
}

const ALL_BUNDLE_KEYS = ['chat_all', 'punish_all', 'vc_all', 'admin_mod_all'];

const DANGEROUS_ROLE_PERMS = [
  PermissionsBitField.Flags.Administrator,
  PermissionsBitField.Flags.BanMembers,
  PermissionsBitField.Flags.KickMembers,
  PermissionsBitField.Flags.ManageGuild,
  PermissionsBitField.Flags.ManageRoles,
  PermissionsBitField.Flags.ManageChannels
];

/**
 * Recursively expand implied permits from raw permit keys.
 */
function expandPermits(rawKeys = []) {
  const expanded = new Set();
  const queue = [...rawKeys];
  while (queue.length > 0) {
    const key = queue.shift();
    if (!key || expanded.has(key)) continue;
    expanded.add(key);
    const def = PERMITS[key];
    if (def && Array.isArray(def.implies)) {
      for (const imp of def.implies) {
        if (!expanded.has(imp)) queue.push(imp);
      }
    }
  }
  return expanded;
}

/**
 * Determine if a member bypasses mod permits (Server Owner, Extra Owner, Bot Owner, or Discord Administrator).
 */
function isPermitBypass(member) {
  if (!member || !member.guild) return false;
  if (member.guild.ownerId === member.id) return true;
  if (isBotOwner && isBotOwner(member.id)) return true;
  if (isGuildExtraOwner(member.guild.id, member.id)) return true;
  if (member.permissions?.has(PermissionsBitField.Flags.Administrator)) return true;
  return false;
}

/**
 * Collect direct user permits and role-inherited permits for a GuildMember.
 */
function getMemberPermitState(member) {
  if (!member || !member.guild) {
    return { isBypass: false, directKeys: [], roleSources: [], rawKeys: [], effectiveKeys: new Set() };
  }

  const bypass = isPermitBypass(member);
  const guildId = member.guild.id;
  const directKeys = db.getPermitsForTarget(guildId, 'user', member.id);
  const roleSources = [];

  for (const role of member.roles.cache.values()) {
    const rKeys = db.getPermitsForTarget(guildId, 'role', role.id);
    if (rKeys.length > 0) {
      roleSources.push({ roleId: role.id, roleName: role.name, keys: rKeys });
    }
  }

  const rawKeys = Array.from(new Set([
    ...directKeys,
    ...roleSources.flatMap(s => s.keys)
  ]));

  const effectiveKeys = bypass ? new Set(Object.keys(PERMITS)) : expandPermits(rawKeys);
  return { isBypass: bypass, directKeys, roleSources, rawKeys, effectiveKeys };
}

/**
 * Check whether a GuildMember holds the given permit (either directly, via any role, or Admin/Owner bypass).
 */
function hasPermit(member, requiredPermit) {
  if (!member || !member.guild) return { allowed: false, reason: 'NO_GUILD' };
  if (isPermitBypass(member)) return { allowed: true, source: 'Admin / Owner' };

  const state = getMemberPermitState(member);
  const requiredList = Array.isArray(requiredPermit) ? requiredPermit : [requiredPermit];
  const matched = requiredList.some(k => state.effectiveKeys.has(k));

  if (!matched) {
    return { allowed: false, reason: 'MISSING_PERMIT', missing: requiredList[0] };
  }

  return {
    allowed: true,
    source: state.directKeys.some(k => {
      const exp = expandPermits([k]);
      return requiredList.some(req => exp.has(req));
    }) ? 'User Permit' : 'Role Permit'
  };
}

/**
 * Verify permit inside a command execution and reply cleanly if denied.
 */
async function verifyPermit(message, requiredPermit, cmdLabel = '') {
  const res = hasPermit(message.member, requiredPermit);
  if (res.allowed) return res;

  const missingKey = Array.isArray(requiredPermit) ? requiredPermit[0] : requiredPermit;
  const def = PERMITS[missingKey];
  const permitName = def ? def.label : missingKey;
  const cmdName = cmdLabel || message.content.trim().split(/ +/)[0]?.replace(/^[^a-zA-Z0-9]+/, '') || 'command';

  await message.reply(
    `${emojis.WARNING || '⚠️'} **Permit Required!** You do not have permission to use \`.${cmdName}\`.\n` +
    `• **Required Permit:** \`${permitName}\`\n` +
    `> Ask an Administrator to grant it via \`.permit mod add @user\` or \`.permit mod add @role\`.`
  ).catch(() => {});

  return res;
}

/**
 * Enforce Discord Role Hierarchy between executor and target member for punishments/nicknames.
 */
async function checkTargetHierarchy(message, targetMember, actionLabel = 'moderate') {
  if (!targetMember || !message.member || !message.guild) return true;
  if (isPermitBypass(message.member)) return true;

  if (targetMember.id === message.guild.ownerId) {
    await message.reply(`${emojis.WARNING || '⚠️'} You cannot ${actionLabel} the **Server Owner**!`);
    return false;
  }
  if (targetMember.id === message.author.id) {
    await message.reply(`${emojis.WARNING || '⚠️'} You cannot ${actionLabel} **yourself**!`);
    return false;
  }
  if (targetMember.roles.highest.position >= message.member.roles.highest.position) {
    await message.reply(`${emojis.WARNING || '⚠️'} **Hierarchy Violation:** You cannot ${actionLabel} <@${targetMember.id}> because their highest role is equal to or above yours.`);
    return false;
  }
  return true;
}

/**
 * Enforce role safety checks when assigning/removing roles via .role, .temprole, .roleicon, or quick roles.
 */
async function validateRoleSafety(message, targetRole, actionType = 'modify') {
  const guild = message.guild;
  const authorMember = message.member;
  const botMember = guild.members.me;
  const isOwner = guild.ownerId === authorMember.id || (isBotOwner && isBotOwner(authorMember.id)) || isGuildExtraOwner(guild.id, authorMember.id);
  const isAdmin = authorMember.permissions.has(PermissionsBitField.Flags.Administrator);

  if (!targetRole || targetRole.id === guild.id) {
    await message.reply(`${emojis.WARNING || '⚠️'} Invalid role selected.`);
    return false;
  }

  if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles) || targetRole.position >= botMember.roles.highest.position) {
    await message.reply(`${emojis.WARNING || '⚠️'} **Bot Role Hierarchy Error:** I cannot ${actionType} **@${targetRole.name}** because it is equal to or higher than my highest role.`);
    return false;
  }

  if (!isOwner && !isAdmin) {
    if (targetRole.position >= authorMember.roles.highest.position) {
      await message.reply(`${emojis.WARNING || '⚠️'} **Hierarchy Violation:** You can only ${actionType} roles that are **strictly below** your highest role (<@&${authorMember.roles.highest.id}>).`);
      return false;
    }

    if (DANGEROUS_ROLE_PERMS.some(p => targetRole.permissions.has(p))) {
      await message.reply(`${emojis.WARNING || '⚠️'} **Security Block:** Role **@${targetRole.name}** carries elevated administrative privileges and cannot be modified via mod permits.`);
      return false;
    }
  }

  return true;
}

/**
 * Format permit keys cleanly into backticked labels.
 */
function formatPermitLabels(keys = []) {
  if (!keys || keys.length === 0) return '`None`';
  return keys.map(k => `\`${PERMITS[k]?.label || k}\``).join(', ');
}

module.exports = {
  PERMIT_CATEGORIES,
  PERMITS,
  ALL_BUNDLE_KEYS,
  DANGEROUS_ROLE_PERMS,
  expandPermits,
  isGuildExtraOwner,
  isPermitBypass,
  getMemberPermitState,
  hasPermit,
  verifyPermit,
  checkTargetHierarchy,
  validateRoleSafety,
  formatPermitLabels
};
