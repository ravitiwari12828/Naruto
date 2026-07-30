const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const db = require('../database/db');
const { PermissionsBitField } = require('discord.js');
const { createDynamicBox } = require('../utils/boxBuilder');

// Global Leveling Config per guild
const levelConfigs = new Map();

function getOrCreateLevelConfig(guildId) {
  if (!levelConfigs.has(guildId)) {
    levelConfigs.set(guildId, {
      enabled: true,
      channelId: null,
      leaderboardMsgId: null,
      levelRoles: new Map()
    });
  }
  const cfg = levelConfigs.get(guildId);
  if (!cfg.levelRoles) cfg.levelRoles = new Map();
  return cfg;
}

async function ensureShinobiRolesAndPerks(guild) {
  const rankRolesDef = [
    { name: 'Student', color: 0x95A5A6, rankKey: 'Academy Student' },
    { name: 'Genin', color: 0x2ECC71, rankKey: 'Genin' },
    { name: 'Chunin', color: 0x3498DB, rankKey: 'Chunin' },
    { name: 'Special Jounin', color: 0x9B59B6, rankKey: 'Special Jounin' },
    { name: 'Jounin', color: 0xE67E22, rankKey: 'Jounin' },
    { name: 'ANBU Black Ops', color: 0xE74C3C, rankKey: 'ANBU Black Ops' },
    { name: 'Hokage', color: 0xF1C40F, rankKey: 'Hokage' }
  ];

  const perkRolesDef = [
    { name: 'Genin Trainee [Lvl 5]', color: 0x00FFBB, minLevel: 5, permissions: [PermissionsBitField.Flags.UseExternalEmojis, PermissionsBitField.Flags.UseExternalStickers, PermissionsBitField.Flags.AttachFiles] },
    { name: 'Chunin Captain [Lvl 15]', color: 0x3498DB, minLevel: 15, permissions: [PermissionsBitField.Flags.ChangeNickname, PermissionsBitField.Flags.AddReactions] },
    { name: 'Special Jounin Operative [Lvl 25]', color: 0x9B59B6, minLevel: 25, permissions: [PermissionsBitField.Flags.EmbedLinks, PermissionsBitField.Flags.AttachFiles] },
    { name: 'Jounin Master [Lvl 40]', color: 0xE67E22, minLevel: 40, permissions: [PermissionsBitField.Flags.EmbedLinks] },
    { name: 'ANBU Commander [Lvl 60]', color: 0xE74C3C, minLevel: 60, permissions: [PermissionsBitField.Flags.SendVoiceMessages] },
    { name: 'Sannin Legend [Lvl 75]', color: 0x8E44AD, minLevel: 75, permissions: [PermissionsBitField.Flags.CreatePolls] },
    { name: 'Hokage Sovereign [Lvl 100]', color: 0xF1C40F, minLevel: 100, permissions: [] }
  ];

  const roleMap = new Map();
  const createdRoles = [];

  for (const def of rankRolesDef) {
    let role = guild.roles.cache.find(r => r.name.toLowerCase() === def.name.toLowerCase() || (def.name === 'Student' && r.name.toLowerCase().includes('student')));

    if (!role) {
      try {
        role = await guild.roles.create({
          name: def.name,
          color: def.color,
          reason: 'Naruto Shinobi Rank Auto-Setup'
        });
        createdRoles.push(def.name);
      } catch (e) {
        console.error(`Failed to create rank role ${def.name}:`, e.message);
      }
    }

    if (role) {
      roleMap.set(def.rankKey, role.id);
      roleMap.set(def.name, role.id);
    }
  }

  for (const def of perkRolesDef) {
    let role = guild.roles.cache.find(r => r.name.toLowerCase().includes(def.name.split(' ')[0].toLowerCase()));

    if (!role) {
      try {
        role = await guild.roles.create({
          name: def.name,
          color: def.color,
          permissions: def.permissions,
          reason: `Naruto Level ${def.minLevel} Perk Role Auto-Setup`
        });
        createdRoles.push(def.name);
      } catch (e) {
        console.error(`Failed to create perk role ${def.name}:`, e.message);
      }
    }

    if (role) {
      roleMap.set(`lvl_${def.minLevel}`, role.id);
    }
  }

  try {
    const meRole = guild.members.me?.roles.highest;
    if (meRole && guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      const basePos = Math.max(1, meRole.position - 15);
      const positionsToSet = [];

      const orderedRanks = ['Student', 'Genin', 'Chunin', 'Special Jounin', 'Jounin', 'ANBU Black Ops', 'Hokage'];
      orderedRanks.forEach((rankName, index) => {
        const roleId = roleMap.get(rankName);
        if (roleId) {
          positionsToSet.push({ role: roleId, position: basePos + index });
        }
      });

      const orderedPerks = ['lvl_5', 'lvl_15', 'lvl_25', 'lvl_40', 'lvl_60', 'lvl_75', 'lvl_100'];
      orderedPerks.forEach((perkKey, index) => {
        const roleId = roleMap.get(perkKey);
        if (roleId) {
          positionsToSet.push({ role: roleId, position: basePos + 10 + index });
        }
      });

      if (positionsToSet.length > 0) {
        await guild.roles.setPositions(positionsToSet).catch(e => console.error('Failed to set role positions:', e.message));
      }
    }
  } catch (err) {}

  return { roleMap, createdRoles };
}

module.exports = {
  name: 'level',
  description: 'Level System & Shinobi Chakra Perks: level rank, level leaderboard, level setup, level perks, level disable, level status',
  aliases: [
    'levels', 'lvl', 'xp',
    'rank', 'perks', 'rewards'
  ],
  levelConfigs,
  getOrCreateLevelConfig,
  ensureShinobiRolesAndPerks,

  async execute(message, args) {
    const rawFirstWord = message.content.trim().split(/ +/)[0] || '';
    const invoked = rawFirstWord.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();
    let sub = args[0]?.toLowerCase();

    if (invoked === 'rank') sub = 'rank';
    if (invoked === 'perks' || invoked === 'rewards') sub = 'perks';

    const author = message.author;
    const guild = message.guild;
    const guildId = guild.id;
    const config = getOrCreateLevelConfig(guildId);

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // 1. .level setup <#channel>
    if (sub === 'setup') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(`${emojis.WARNING} Only Administrators can run level setup.`);
      }

      const chan = message.mentions.channels.first() || message.channel;
      config.channelId = chan.id;
      config.enabled = true;

      const { roleMap, createdRoles } = await ensureShinobiRolesAndPerks(guild);
      config.levelRoles = roleMap;
      levelConfigs.set(guildId, config);

      const createdSummary = createdRoles.length > 0
        ? `Created Roles (${createdRoles.length}): ${createdRoles.map(r => r).join(', ')}`
        : 'All Shinobi Rank & Perk roles organized!';

      const box = createDynamicBox('LEVEL SETUP COMPLETE', [
        { key: 'Announce', value: '#' + chan.name },
        { key: 'Status  ', value: 'ENABLED' },
        { key: 'Roles   ', value: createdSummary.slice(0, 18) }
      ]);

      const embed = createStyledEmbed({
        title: `${emojis.LEVEL || '📈'} Shinobi Leveling & Role Hierarchy Configured`,
        description:
          `Successfully configured Naruto Leveling Engine & Role Hierarchy for **${guild.name}**!\n\n` +
          '```\n' + box + '\n```\n' +
          `*Run \`.level perks\` to view full Level Perk rewards guide!*`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 2. .level perks / .perks / .rewards
    if (sub === 'perks' || sub === 'rewards' || sub === 'benefits') {
      const userData = db.getUser(author.id);
      const userLvl = userData.level || 1;

      const box1 = createDynamicBox('PHASE 1: TRAINEE (LVL 5-25)', [
        'Lvl 5  : Genin (Emojis)',
        'Lvl 15 : Chunin (Nicknames)',
        'Lvl 25 : Spec Jounin (Media)'
      ]);

      const box2 = createDynamicBox('PHASE 2: ELITE (LVL 40-75)', [
        'Lvl 40 : Jounin (Send GIFs)',
        'Lvl 60 : ANBU (Voice Notes)',
        'Lvl 75 : Sannin (Polls)'
      ]);

      const box3 = createDynamicBox('PHASE 3: SOVEREIGN (LVL 100)', [
        'Lvl 100: Hokage (Grid Bypass)'
      ]);

      const embed = createStyledEmbed({
        title: `${emojis.LEVEL || '📈'} Shinobi Level Perks & Unlockable Rewards`,
        subtitle: `Your Current Level: Level ${userLvl} (${userData.rank || 'Student'})`,
        description:
          `Chat in text channels and hang out in VC to earn XP, level up, and unlock exclusive Shinobi Clan perks!\n\n` +
          '```\n' + box1 + '\n```\n' +
          '```\n' + box2 + '\n```\n' +
          '```\n' + box3 + '\n```',
        requestedBy: author,
        clientUser
      });

      return message.channel.send({ embeds: [embed] });
    }

    // 3. .level disable
    if (sub === 'disable') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(`${emojis.WARNING} Only Administrators can disable leveling.`);
      }

      config.enabled = false;
      levelConfigs.set(guildId, config);

      return message.reply(`${emojis.SUCCESS} Leveling system disabled on this server.`);
    }

    // 4. .level status
    if (sub === 'status') {
      const box = createDynamicBox('LEVELING SYSTEM STATUS', [
        { key: 'Status   ', value: config.enabled ? 'ENABLED' : 'DISABLED' },
        { key: 'Announce ', value: config.channelId ? '<#channel>' : 'Current Channel' },
        { key: 'PerkRoles', value: String(config.levelRoles ? config.levelRoles.size : 0) + ' configured' }
      ]);

      const embed = createStyledEmbed({
        title: `${emojis.LEVEL || '📈'} Leveling System Status`,
        description: '```\n' + box + '\n```',
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 5. .level leaderboard / .lb
    if (sub === 'leaderboard' || sub === 'lb' || sub === 'top') {
      const top10 = db.getTopUsersByXP(10);
      const items = top10.map((u, i) => `#${i + 1} Lvl ${u.level} - ${u.rank.slice(0, 10)} (${u.xp} XP)`);

      const box = createDynamicBox('SHINOBI LEADERBOARD TOP 10', items.length ? items : ['No data available']);

      const embed = createStyledEmbed({
        title: `${emojis.RANK || emojis.LEVEL || '⭐'} Shinobi Level Leaderboard — Top Chatters`,
        description: '```\n' + box + '\n```',
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 6. .level addxp @user <amount>
    if (sub === 'addxp' || sub === 'givexp') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(`${emojis.WARNING} Only Administrators can add XP.`);
      }

      const target = message.mentions.members?.first();
      const amount = parseInt(args[2] || args[1]);
      if (!target || isNaN(amount)) {
        return message.reply(`${emojis.WARNING} Usage: \`.level addxp @user <amount>\``);
      }

      db.updateUser(target.id, (u) => { u.xp += amount; });
      return message.reply(`${emojis.SUCCESS} Added \`+${amount} XP\` to ${target.user.username}.`);
    }

    // 7. .level setlevel @user <level>
    if (sub === 'setlevel' || sub === 'setlvl') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(`${emojis.WARNING} Only Administrators can set levels.`);
      }

      const target = message.mentions.members?.first();
      const newLvl = parseInt(args[2] || args[1]);
      if (!target || isNaN(newLvl) || newLvl < 1) {
        return message.reply(`${emojis.WARNING} Usage: \`.level setlevel @user <level>\``);
      }

      db.updateUser(target.id, (u) => { u.level = newLvl; });
      return message.reply(`${emojis.SUCCESS} Set ${target.user.username}'s level to **Level ${newLvl}**.`);
    }

    // 8. .level rank [@user]
    if (!sub || sub === 'rank' || sub === 'card') {
      const targetUser = message.mentions.users.first() || author;
      const userData = db.getUser(targetUser.id);
      const nextLvlXp = userData.level * 75;
      const progress = Math.min(100, Math.floor((userData.xp / nextLvlXp) * 100));
      const filledCount = Math.floor(progress / 10);
      const bar = '#'.repeat(filledCount) + '-'.repeat(10 - filledCount);

      const box = createDynamicBox('SHINOBI RANK PROFILE', [
        { key: 'Username', value: targetUser.username.slice(0, 12) },
        { key: 'Rank    ', value: userData.rank.slice(0, 12) },
        { key: 'Level   ', value: 'Level ' + userData.level },
        { key: 'Total XP', value: userData.xp + ' XP' },
        { key: 'Progress', value: '[' + bar + ']' }
      ]);

      const embed = createStyledEmbed({
        title: `${emojis.RANK || emojis.LEVEL || '📈'} Shinobi Rank Card — ${targetUser.username}`,
        subtitle: `${userData.rank}`,
        description: '```\n' + box + '\n```',
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    const { renderModuleHelpPanel } = require('../utils/panelRenderer');
    return renderModuleHelpPanel(message, 'level');
  }
};
