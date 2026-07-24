const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const db = require('../database/db');
const { PermissionsBitField } = require('discord.js');

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

async function ensureShinobiRoles(guild) {
  const rankRolesDef = [
    { name: 'Student', color: 0x95A5A6, rankKey: 'Academy Student' },
    { name: 'Genin', color: 0x2ECC71, rankKey: 'Genin' },
    { name: 'Chunin', color: 0x3498DB, rankKey: 'Chunin' },
    { name: 'Special Jounin', color: 0x9B59B6, rankKey: 'Special Jounin' },
    { name: 'Jounin', color: 0xE67E22, rankKey: 'Jounin' },
    { name: 'ANBU Black Ops', color: 0xE74C3C, rankKey: 'ANBU Black Ops' },
    { name: 'Hokage', color: 0xF1C40F, rankKey: 'Hokage' }
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
          reason: 'Naruto Leveling System Auto-Setup'
        });
        createdRoles.push(def.name);
      } catch (e) {
        console.error(`Failed to create role ${def.name}:`, e.message);
      }
    }

    if (role) {
      roleMap.set(def.rankKey, role.id);
      roleMap.set(def.name, role.id);
    }
  }

  return { roleMap, createdRoles };
}

module.exports = {
  name: 'level',
  description: 'Level System: level rank, level leaderboard, level setup, level disable, level status',
  aliases: [
    'levels', 'lvl', 'xp',
    'leaderboard', 'rank', 'lb'
  ],
  levelConfigs,
  getOrCreateLevelConfig,
  ensureShinobiRoles,

  async execute(message, args) {
    const rawFirstWord = message.content.trim().split(/ +/)[0] || '';
    const invoked = rawFirstWord.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();
    let sub = args[0]?.toLowerCase();

    if (invoked === 'rank') sub = 'rank';
    if (invoked === 'leaderboard' || invoked === 'lb') sub = 'leaderboard';

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

      const { roleMap, createdRoles } = await ensureShinobiRoles(guild);
      config.levelRoles = roleMap;
      levelConfigs.set(guildId, config);

      const createdSummary = createdRoles.length > 0
        ? `• **Created Roles (${createdRoles.length})**: ${createdRoles.map(r => `\`${r}\``).join(', ')}`
        : `• **Shinobi Roles**: All 7 rank roles are active in server!`;

      const embed = createStyledEmbed({
        title: `${emojis.LEVEL} Leveling System & Roles Configured`,
        description:
          `Successfully configured Naruto Leveling Engine for **${guild.name}**!\n\n` +
          `• **Announcement Channel**: <#${chan.id}>\n` +
          `• **System Status**: \`ENABLED ✅\`\n` +
          `${createdSummary}\n\n` +
          `**📜 Configured Shinobi Rank Hierarchy:**\n` +
          `\`Student\` ➔ \`Genin\` ➔ \`Chunin\` ➔ \`Special Jounin\` ➔ \`Jounin\` ➔ \`ANBU Black Ops\` ➔ \`Hokage\``,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 2. .level disable
    if (sub === 'disable') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(`${emojis.WARNING} Only Administrators can disable leveling.`);
      }

      config.enabled = false;
      levelConfigs.set(guildId, config);

      return message.reply(`${emojis.SUCCESS} Leveling system disabled on this server.`);
    }

    // 3. .level status
    if (sub === 'status') {
      const embed = createStyledEmbed({
        title: `${emojis.LEVEL} Leveling System Status`,
        fields: [
          { name: `${emojis.GEAR} Status`, value: config.enabled ? '`ENABLED ✅`' : '`DISABLED ❌`', inline: true },
          { name: `${emojis.MESSAGES} Announcement Channel`, value: config.channelId ? `<#${config.channelId}>` : '*Current Channel*', inline: true },
          { name: `${emojis.ROLES} Shinobi Rank Roles`, value: config.levelRoles.size > 0 ? `\`${config.levelRoles.size} Configured\`` : '`Run .level setup`', inline: true }
        ],
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 4. .level leaderboard / .ninja lb level / .lb
    if (sub === 'leaderboard' || sub === 'lb' || sub === 'top') {
      const top10 = db.getTopUsers('xp', 10);
      const lines = top10.map((u, i) => `\`#${i + 1}\` **<@${u.userId}>** — Level \`${u.level}\` (\`${u.xp} XP\`) • Rank: *${u.rank}*`);

      const embed = createStyledEmbed({
        title: `${emojis.STAR} Shinobi Level Leaderboard`,
        description: lines.join('\n') || '*No leveling data available yet.*',
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 5. .level addxp @user <amount>
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

    // 6. .level setlevel @user <level>
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

    // 7. .level rank [@user]
    if (!sub || sub === 'rank' || sub === 'card') {
      const targetUser = message.mentions.users.first() || author;
      const userData = db.getUser(targetUser.id);
      const nextLvlXp = userData.level * 75;
      const progress = Math.min(100, Math.floor((userData.xp / nextLvlXp) * 100));
      const bar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));

      const embed = createStyledEmbed({
        title: `${emojis.LEVEL} Shinobi Rank Card — ${targetUser.username}`,
        subtitle: `${emojis.NINJA_RANK} ${userData.rank}`,
        fields: [
          { name: `${emojis.STAR} Level`, value: `\`Level ${userData.level}\``, inline: true },
          { name: `${emojis.ZAP} Total XP`, value: `\`${userData.xp} XP\``, inline: true },
          { name: `${emojis.MESSAGES} Messages Sent`, value: `\`${userData.messages}\``, inline: true },
          { name: `${emojis.LEVEL} Level Progress`, value: `\`${userData.xp} / ${nextLvlXp} XP\` (${progress}%)\n\`${bar}\``, inline: false }
        ],
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    const { renderModuleHelpPanel } = require('../utils/panelRenderer');
    return renderModuleHelpPanel(message, 'level');
  }
};
