const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const db = require('../database/db');
const { PermissionsBitField } = require('discord.js');
const { createDynamicBox } = require('../utils/boxBuilder');

// Global Leveling Config per guild
const levelConfigs = new Map();

// Compact number formatter: 3400 → 3.4K
function fmtNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}


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

const RANK_GRADIENT_PALETTES = [
  { id: 1,  name: 'Kurama Flame',       colors: ['#FF0000', '#FF7300', '#FFEA00'], accent: '#FF7300' },
  { id: 2,  name: 'Neon Cyberpunk',     colors: ['#FF007F', '#7F00FF', '#00F0FF'], accent: '#FF007F' },
  { id: 3,  name: 'Emerald Shinobi',     colors: ['#00F260', '#0575E6'],           accent: '#00F260' },
  { id: 4,  name: 'Vaporwave Aura',      colors: ['#8A2387', '#E94057', '#F27121'], accent: '#E94057' },
  { id: 5,  name: 'Solar Eclipse',      colors: ['#F12711', '#F5AF19'],           accent: '#F5AF19' },
  { id: 6,  name: 'Chidori Electric',   colors: ['#00c6ff', '#0072ff'],           accent: '#00c6ff' },
  { id: 7,  name: 'Sakura Blossom',     colors: ['#FF758C', '#FF7EB3'],           accent: '#FF758C' },
  { id: 8,  name: 'Golden Hokage',       colors: ['#BF953F', '#FCF6BA', '#B38728'], accent: '#FFD700' },
  { id: 9,  name: 'Midnight Purple',     colors: ['#654ea3', '#eaafc8'],           accent: '#9B59B6' },
  { id: 10, name: 'Ocean Abyssal',      colors: ['#2B5876', '#4E4376'],           accent: '#2B5876' },
  { id: 11, name: 'Poison Venom',       colors: ['#11998e', '#38ef7d'],           accent: '#38ef7d' },
  { id: 12, name: 'Cosmic Nebula',      colors: ['#3A1C71', '#D76D77', '#FFAF7B'], accent: '#D76D77' },
  { id: 13, name: 'Rinnegan Twilight',  colors: ['#4568DC', '#B06AB3'],           accent: '#B06AB3' },
  { id: 14, name: 'Crimson Akatsuki',   colors: ['#800020', '#E50914'],           accent: '#E50914' },
  { id: 15, name: 'Shadow Anbu',        colors: ['#232526', '#414345', '#FF4E50'], accent: '#FF4E50' },
  { id: 16, name: 'Sage Chakra',        colors: ['#00F260', '#FFD700', '#FF6B00'], accent: '#FF6B00' }
];

module.exports = {
  name: 'level',
  description: 'Level System & Shinobi Chakra Perks: level rank, level leaderboard, level setup, level perks, level cardtheme',
  aliases: [
    'levels', 'lvl', 'xp',
    'rank', 'perks', 'rewards',
    'ranktheme', 'cardtheme', 'leveltheme'
  ],
  levelConfigs,
  getOrCreateLevelConfig,
  ensureShinobiRolesAndPerks,
  RANK_GRADIENT_PALETTES,

  async execute(message, args) {
    const rawFirstWord = message.content.trim().split(/ +/)[0] || '';
    const invoked = rawFirstWord.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();
    let sub = args[0]?.toLowerCase();

    if (invoked === 'rank') sub = 'rank';
    if (invoked === 'perks' || invoked === 'rewards') sub = 'perks';
    if (['ranktheme', 'cardtheme', 'leveltheme'].includes(invoked)) sub = 'cardtheme';

    const author = message.author;
    const guild = message.guild;
    const guildId = guild.id;
    const config = getOrCreateLevelConfig(guildId);

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // ── CARD THEME SUBCOMMAND (.level cardtheme [1-16]) ──
    if (sub === 'cardtheme' || sub === 'theme') {
      const themeNum = parseInt(args[1] || args[0]);
      if (!isNaN(themeNum) && themeNum >= 1 && themeNum <= 16) {
        const chosen = RANK_GRADIENT_PALETTES[themeNum - 1];
        db.updateUser(author.id, u => { u.cardTheme = themeNum; }, guildId);
        return message.reply(`${emojis.SUCCESS || '✅'} **Rank Card Gradient Theme set to Theme #${themeNum}: "${chosen.name}"!** Type \`.rank\` to view your new card!`);
      }

      // Display 16 Themes Catalog
      const themeItems = RANK_GRADIENT_PALETTES.map(p => `#${String(p.id).padStart(2, '0')} : ${p.name}`);
      const box = createDynamicBox('16 RANK CARD GRADIENT THEMES', themeItems);

      const embed = createStyledEmbed({
        title: `${emojis.SPARKLES || '✨'} 16 Rank Card Gradient Color Palettes`,
        description:
          `Select your favorite gradient theme for your \`.rank\` card!\n\n` +
          '```\n' + box + '\n```\n' +
          `**Usage:** \`.ranktheme <1-16>\` or \`.level cardtheme <1-16>\` e.g. \`.ranktheme 5\``,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

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
        title: `${emojis.LEVEL || '<a:chart_animated:1537179539514462308>'} Shinobi Leveling & Role Hierarchy Configured`,
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
      const userData = db.getUser(author.id, guildId);
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
        title: `${emojis.LEVEL || '<a:chart_animated:1537179539514462308>'} Shinobi Level Perks & Unlockable Rewards`,
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

    // 3. .level disable / .level enable
    if (sub === 'disable' || sub === 'enable') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(`${emojis.WARNING} Only Administrators can toggle leveling.`);
      }
      const isEnable = sub === 'enable';
      db.updateLevelConfig(guildId, cfg => { cfg.enabled = isEnable; });
      return message.reply(`${emojis.SUCCESS} Server leveling system **${isEnable ? 'ENABLED' : 'DISABLED'}**.`);
    }

    // 4. .level config / .level status / .level settings
    if (sub === 'status' || sub === 'config' || sub === 'settings') {
      const cfg = db.getLevelConfig(guildId);

      let channelDisplay = 'Current Channel';
      if (cfg.channelId === 'dm') channelDisplay = '📥 Direct Messages (DM)';
      else if (cfg.channelId === 'none') channelDisplay = '<a:wrong_animated:1537179702928875631> Disabled (No Messages)';
      else if (cfg.channelId && cfg.channelId !== 'default') channelDisplay = `<#${cfg.channelId}>`;

      const rewardCount = (cfg.roleRewards ? cfg.roleRewards.length : 0) + 7; // 7 default ranks
      const ignoredChanCount = cfg.ignoredChannels ? cfg.ignoredChannels.length : 0;
      const ignoredRoleCount = cfg.ignoredRoles ? cfg.ignoredRoles.length : 0;
      const multCount = cfg.multipliers ? Object.keys(cfg.multipliers).length : 0;

      const box = createDynamicBox('SHINOBI LEVELING CONFIG', [
        { key: 'Status   ', value: cfg.enabled ? 'ENABLED' : 'DISABLED' },
        { key: 'Announce ', value: channelDisplay.slice(0, 16) },
        { key: 'XP Rate  ', value: `${cfg.minXp}-${cfg.maxXp} XP (${cfg.cooldown}s)` },
        { key: 'Role Mode', value: (cfg.roleRewardsMode || 'stack').toUpperCase() },
        { key: 'Rewards  ', value: `${rewardCount} configured` },
        { key: 'Ignored  ', value: `${ignoredChanCount} chan / ${ignoredRoleCount} role` },
        { key: 'Boosters ', value: `${multCount} multipliers` }
      ]);

      const embed = createStyledEmbed({
        title: `${emojis.LEVEL || '<a:settings_animated:1537177506170404905>'} Server Leveling System Configuration`,
        subtitle: `Shinobi Advanced Server Leveling Engine`,
        description:
          '```\n' + box + '\n```\n\n' +
          `**<a:rapid_animated:1537177482006896692> Configuration Commands:**\n` +
          `• \`.level channel <#channel|dm|default|none>\` — Set announcement channel\n` +
          `• \`.level message <text>\` — Set custom level up message\n` +
          `• \`.level rewards add <level> <@role>\` — Add custom level role reward\n` +
          `• \`.level rewards mode <stack|replace>\` — Toggle stacking or replacing roles\n` +
          `• \`.level ignore channel <#channel>\` — Toggle no-XP channel\n` +
          `• \`.level ignore role <@role>\` — Toggle no-XP role\n` +
          `• \`.level multiplier add <@role> <multiplier>\` — Add XP boost (e.g. 1.5x)\n` +
          `• \`.level rate <minXp> <maxXp> [cooldown]\` — Customize XP earn rate`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // ── SHINOBI LEVELING CONFIGURATION SUBCOMMANDS ─────────────────────────────

    // .level channel <#channel | dm | default | none>
    if (sub === 'channel' || sub === 'announcements') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(`${emojis.WARNING} Only Administrators can change level announcement settings.`);
      }

      const argVal = args[1]?.toLowerCase();
      if (!argVal) {
        return message.reply(`${emojis.WARNING} Usage: \`.level channel <#channel | dm | default | none>\``);
      }

      let setVal = null;
      let display = '';
      if (['dm', 'direct'].includes(argVal)) {
        setVal = 'dm';
        display = '📥 Direct Messages (DM)';
      } else if (['none', 'disabled', 'off'].includes(argVal)) {
        setVal = 'none';
        display = '<a:wrong_animated:1537179702928875631> Disabled (No announcements)';
      } else if (['default', 'current', 'here'].includes(argVal)) {
        setVal = 'default';
        display = 'Current Chat Channel';
      } else {
        const chan = message.mentions.channels.first() || guild.channels.cache.get(argVal);
        if (!chan) return message.reply(`${emojis.WARNING} Channel not found! Mention a valid channel or use \`dm\`, \`default\`, or \`none\`.`);
        setVal = chan.id;
        display = `<#${chan.id}>`;
      }

      db.updateLevelConfig(guildId, cfg => { cfg.channelId = setVal; });
      return message.reply(`${emojis.SUCCESS} Level up announcements will now be sent to **${display}**.`);
    }

    // .level message <custom text | reset>
    if (sub === 'message' || sub === 'msg') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(`${emojis.WARNING} Only Administrators can set level up messages.`);
      }

      const customText = args.slice(1).join(' ');
      if (!customText) {
        const currentMsg = db.getLevelConfig(guildId).message || 'Default Styled Embed';
        return message.reply(
          `${emojis.INFO} **Current Level Up Message:**\n\`${currentMsg}\`\n\n` +
          `**Usage:** \`.level message <text>\` or \`.level message reset\`\n` +
          `**Variables:** \`{user}\`, \`{user.mention}\`, \`{level}\`, \`{rank}\`, \`{role}\``
        );
      }

      if (customText.toLowerCase() === 'reset' || customText.toLowerCase() === 'default') {
        db.updateLevelConfig(guildId, cfg => { cfg.message = null; });
        return message.reply(`${emojis.SUCCESS} Reset level up message to default styled embed.`);
      }

      db.updateLevelConfig(guildId, cfg => { cfg.message = customText; });
      return message.reply(`${emojis.SUCCESS} Custom level up message saved!\n> ${customText}`);
    }

    // .level rewards <add|remove|mode|list>
    if (sub === 'rewards' || sub === 'reward') {
      const action = args[1]?.toLowerCase();

      if (action === 'add') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
          return message.reply(`${emojis.WARNING} Only Administrators can configure role rewards.`);
        }
        const lvlNum = parseInt(args[2]);
        const role = message.mentions.roles.first() || guild.roles.cache.get(args[3] || args[2]);
        if (isNaN(lvlNum) || !role) {
          return message.reply(`${emojis.WARNING} Usage: \`.level rewards add <level> <@role>\``);
        }

        db.updateLevelConfig(guildId, cfg => {
          if (!cfg.roleRewards) cfg.roleRewards = [];
          cfg.roleRewards = cfg.roleRewards.filter(r => r.level !== lvlNum);
          cfg.roleRewards.push({ level: lvlNum, roleId: role.id });
        });

        return message.reply(`${emojis.SUCCESS} Added **Level ${lvlNum}** Role Reward: <@&${role.id}>.`);
      }

      if (action === 'remove' || action === 'del') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
          return message.reply(`${emojis.WARNING} Only Administrators can configure role rewards.`);
        }
        const lvlNum = parseInt(args[2]);
        if (isNaN(lvlNum)) return message.reply(`${emojis.WARNING} Usage: \`.level rewards remove <level>\``);

        db.updateLevelConfig(guildId, cfg => {
          if (cfg.roleRewards) cfg.roleRewards = cfg.roleRewards.filter(r => r.level !== lvlNum);
        });

        return message.reply(`${emojis.SUCCESS} Removed Role Reward for Level **${lvlNum}**.`);
      }

      if (action === 'mode') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
          return message.reply(`${emojis.WARNING} Only Administrators can change role reward mode.`);
        }
        const mode = args[2]?.toLowerCase();
        if (!['stack', 'replace'].includes(mode)) {
          return message.reply(`${emojis.WARNING} Usage: \`.level rewards mode <stack | replace>\`\n> **stack:** Keep previous level roles\n> **replace:** Remove previous level roles upon leveling up`);
        }

        db.updateLevelConfig(guildId, cfg => { cfg.roleRewardsMode = mode; });
        return message.reply(`${emojis.SUCCESS} Role reward mode set to **${mode.toUpperCase()}**.`);
      }

      // Default: List Role Rewards
      const cfg = db.getLevelConfig(guildId);
      const customList = (cfg.roleRewards || []).map(r => `Lvl ${r.level} : <@&${r.roleId}>`).join('\n') || 'None configured';

      const embed = createStyledEmbed({
        title: `<a:gift_animated:1537179583064055931> Server Role Rewards — ${guild.name}`,
        subtitle: `Mode: ${(cfg.roleRewardsMode || 'stack').toUpperCase()} (Stack or Replace)`,
        description:
          `**<a:scroll_animated:1537179663791693844> Configured Custom Role Rewards:**\n${customList}\n\n` +
          `**Default Shinobi Rank Rewards:**\n` +
          `• Lvl 5: Genin • Lvl 15: Chunin • Lvl 25: Special Jounin • Lvl 40: Jounin • Lvl 60: ANBU • Lvl 75: Sannin • Lvl 100: Hokage\n\n` +
          `*To add: \`.level rewards add <level> <@role>\`*\n` +
          `*To change mode: \`.level rewards mode <stack|replace>\`*`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // .level ignore <channel|role|list>
    if (sub === 'ignore' || sub === 'no-xp' || sub === 'blacklist') {
      const action = args[1]?.toLowerCase();

      if (action === 'channel' || action === 'chan') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
          return message.reply(`${emojis.WARNING} Only Administrators can configure ignored channels.`);
        }
        const chan = message.mentions.channels.first() || guild.channels.cache.get(args[2]);
        if (!chan) return message.reply(`${emojis.WARNING} Usage: \`.level ignore channel <#channel>\``);

        let isIgnored = false;
        db.updateLevelConfig(guildId, cfg => {
          if (!cfg.ignoredChannels) cfg.ignoredChannels = [];
          if (cfg.ignoredChannels.includes(chan.id)) {
            cfg.ignoredChannels = cfg.ignoredChannels.filter(id => id !== chan.id);
            isIgnored = false;
          } else {
            cfg.ignoredChannels.push(chan.id);
            isIgnored = true;
          }
        });

        return message.reply(`${emojis.SUCCESS} Channel <#${chan.id}> is now **${isIgnored ? 'IGNORED (No-XP)' : 'ACTIVE (XP Enabled)'}**.`);
      }

      if (action === 'role') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
          return message.reply(`${emojis.WARNING} Only Administrators can configure ignored roles.`);
        }
        const role = message.mentions.roles.first() || guild.roles.cache.get(args[2]);
        if (!role) return message.reply(`${emojis.WARNING} Usage: \`.level ignore role <@role>\``);

        let isIgnored = false;
        db.updateLevelConfig(guildId, cfg => {
          if (!cfg.ignoredRoles) cfg.ignoredRoles = [];
          if (cfg.ignoredRoles.includes(role.id)) {
            cfg.ignoredRoles = cfg.ignoredRoles.filter(id => id !== role.id);
            isIgnored = false;
          } else {
            cfg.ignoredRoles.push(role.id);
            isIgnored = true;
          }
        });

        return message.reply(`${emojis.SUCCESS} Role <@&${role.id}> is now **${isIgnored ? 'IGNORED (No-XP)' : 'ACTIVE (XP Enabled)'}**.`);
      }

      // List Ignored Channels & Roles
      const cfg = db.getLevelConfig(guildId);
      const chanList = (cfg.ignoredChannels || []).map(id => `<#${id}>`).join(', ') || 'None';
      const roleList = (cfg.ignoredRoles || []).map(id => `<@&${id}>`).join(', ') || 'None';

      const embed = createStyledEmbed({
        title: `<a:disabled_animated:1537177373613629542> Ignored Channels & Roles (No-XP) — ${guild.name}`,
        description:
          `**Forbidden Channels (No-XP):**\n${chanList}\n\n` +
          `**Forbidden Roles (No-XP):**\n${roleList}\n\n` +
          `*Toggle channel: \`.level ignore channel <#channel>\`*\n` +
          `*Toggle role: \`.level ignore role <@role>\`*`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // .level multiplier <add|remove|list>
    if (sub === 'multiplier' || sub === 'boosters' || sub === 'mult') {
      const action = args[1]?.toLowerCase();

      if (action === 'add') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
          return message.reply(`${emojis.WARNING} Only Administrators can configure XP multipliers.`);
        }
        const role = message.mentions.roles.first() || guild.roles.cache.get(args[2]);
        const mult = parseFloat(args[3] || args[2]);
        if (!role || isNaN(mult) || mult <= 0) {
          return message.reply(`${emojis.WARNING} Usage: \`.level multiplier add <@role> <multiplier>\` (e.g. \`.level multiplier add @Booster 1.5\`)`);
        }

        db.updateLevelConfig(guildId, cfg => {
          if (!cfg.multipliers) cfg.multipliers = {};
          cfg.multipliers[role.id] = mult;
        });

        return message.reply(`${emojis.SUCCESS} Added **${mult}x XP Multiplier** for role <@&${role.id}>.`);
      }

      if (action === 'channel' || action === 'chan') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
          return message.reply(`${emojis.WARNING} Only Administrators can configure channel multipliers.`);
        }
        const chan = message.mentions.channels.first() || guild.channels.cache.get(args[2]);
        const mult = parseFloat(args[3] || args[2]);
        if (!chan || isNaN(mult) || mult <= 0) {
          return message.reply(`${emojis.WARNING} Usage: \`.level multiplier channel <#channel> <multiplier>\` (e.g. \`.level multiplier channel #general 2.0\`)`);
        }

        db.updateLevelConfig(guildId, cfg => {
          if (!cfg.channelMultipliers) cfg.channelMultipliers = {};
          cfg.channelMultipliers[chan.id] = mult;
        });

        return message.reply(`${emojis.SUCCESS} Added **${mult}x XP Multiplier** for channel <#${chan.id}>.`);
      }

      if (action === 'remove' || action === 'del') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
          return message.reply(`${emojis.WARNING} Only Administrators can configure XP multipliers.`);
        }
        const role = message.mentions.roles.first() || message.mentions.channels.first() || guild.roles.cache.get(args[2]);
        if (!role) return message.reply(`${emojis.WARNING} Usage: \`.level multiplier remove <@role | #channel>\``);

        db.updateLevelConfig(guildId, cfg => {
          if (cfg.multipliers) delete cfg.multipliers[role.id];
          if (cfg.channelMultipliers) delete cfg.channelMultipliers[role.id];
        });

        return message.reply(`${emojis.SUCCESS} Removed XP Multiplier for <@&${role.id}>.`);
      }

      // List Multipliers
      const cfg = db.getLevelConfig(guildId);
      const roleList = Object.entries(cfg.multipliers || {})
        .map(([rId, m]) => `<@&${rId}> : **${m}x XP**`)
        .join('\n') || 'None configured';

      const chanList = Object.entries(cfg.channelMultipliers || {})
        .map(([cId, m]) => `<#${cId}> : **${m}x XP**`)
        .join('\n') || 'None configured';

      const embed = createStyledEmbed({
        title: `<a:sparkles_animated:1537179684175872171> Active XP Multipliers — ${guild.name}`,
        description:
          `**Role Boosters:**\n${roleList}\n\n` +
          `**Channel Boosters:**\n${chanList}\n\n` +
          `*Add Role Multiplier: \`.level multiplier add <@role> <multiplier>\`*\n` +
          `*Add Channel Multiplier: \`.level multiplier channel <#channel> <multiplier>\`*`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // .level bg <url | hexColor | reset>
    if (sub === 'bg' || sub === 'background' || sub === 'cardbg') {
      const input = args.slice(1).join(' ').trim();
      if (!input) {
        return message.reply(`${emojis.INFO} Usage: \`.level bg <image_url | #hexColor | reset>\``);
      }
      if (input.toLowerCase() === 'reset') {
        db.updateUser(author.id, u => { u.cardBg = null; }, guildId);
        return message.reply(`${emojis.SUCCESS} Reset your rank card background to default theme.`);
      }
      db.updateUser(author.id, u => { u.cardBg = input; }, guildId);
      return message.reply(`${emojis.SUCCESS} Updated your rank card background to: \`${input}\`!`);
    }

    // .level champion role <@role>
    if (sub === 'champion' || sub === 'firstplace') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(`${emojis.WARNING} Only Administrators can set the champion role.`);
      }
      const role = message.mentions.roles.first() || guild.roles.cache.get(args[2] || args[1]);
      if (!role) return message.reply(`${emojis.WARNING} Usage: \`.level champion role <@role>\``);

      db.updateLevelConfig(guildId, cfg => { cfg.championRoleId = role.id; });
      return message.reply(`${emojis.SUCCESS} Set <@&${role.id}> as the **#1 Leaderboard Champion Role**!`);
    }

    // .level reaction-rate <min> <max>
    if (sub === 'reaction-rate' || sub === 'rx-rate') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(`${emojis.WARNING} Only Administrators can configure reaction XP rates.`);
      }
      const minXp = parseInt(args[1]);
      const maxXp = parseInt(args[2]);
      if (isNaN(minXp) || isNaN(maxXp) || minXp < 1 || maxXp < minXp) {
        return message.reply(`${emojis.WARNING} Usage: \`.level reaction-rate <minXp> <maxXp>\` (e.g. \`.level reaction-rate 5 15\`)`);
      }
      db.updateLevelConfig(guildId, cfg => { cfg.reactionXpMin = minXp; cfg.reactionXpMax = maxXp; });
      return message.reply(`${emojis.SUCCESS} Reaction XP Rate set to **${minXp} - ${maxXp} XP** per reaction.`);
    }

    // .level voice-rate <xpPerMin>
    if (sub === 'voice-rate' || sub === 'voice-xp') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(`${emojis.WARNING} Only Administrators can configure voice XP rates.`);
      }
      const rate = parseInt(args[1]);
      if (isNaN(rate) || rate < 0) {
        return message.reply(`${emojis.WARNING} Usage: \`.level voice-rate <xpPerMin>\` (e.g. \`.level voice-rate 10\`)`);
      }
      db.updateLevelConfig(guildId, cfg => { cfg.voiceXpRate = rate; });
      return message.reply(`${emojis.SUCCESS} Voice XP Rate set to **${rate} XP per minute**.`);
    }

    // .level rate <minXp> <maxXp> [cooldownSeconds]
    if (sub === 'rate' || sub === 'xp-rate') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(`${emojis.WARNING} Only Administrators can configure XP earn rates.`);
      }

      const minXp = parseInt(args[1]);
      const maxXp = parseInt(args[2]);
      const cooldown = parseInt(args[3] || '120');

      if (isNaN(minXp) || isNaN(maxXp) || minXp < 1 || maxXp < minXp) {
        return message.reply(`${emojis.WARNING} Usage: \`.level rate <minXp> <maxXp> [cooldownSeconds]\` (e.g. \`.level rate 15 40 120\`)`);
      }

      db.updateLevelConfig(guildId, cfg => {
        cfg.minXp = minXp;
        cfg.maxXp = maxXp;
        cfg.cooldown = Math.max(1, cooldown);
      });

      return message.reply(`${emojis.SUCCESS} XP Earn Rate set to **${minXp} - ${maxXp} XP** per message with a **${cooldown}s cooldown**.`);
    }

    // .level reset <@user | all>
    if (sub === 'reset') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(`${emojis.WARNING} Only Administrators can reset server levels.`);
      }

      const target = message.mentions.members?.first();
      const targetUser = target?.user;
      const isAll = args[1]?.toLowerCase() === 'all';

      if (!targetUser && !isAll) {
        return message.reply(`${emojis.WARNING} Usage: \`.level reset <@user | all>\``);
      }

      if (isAll) {
        db.resetGuildLevels(guildId);
        return message.reply(`${emojis.SUCCESS} **ALL** server XP, levels, and ranks have been reset for **${guild.name}**.`);
      } else {
        db.resetGuildLevels(guildId, targetUser.id);
        return message.reply(`${emojis.SUCCESS} Reset leveling data for ${targetUser.username} in this server.`);
      }
    }

    // 5. .level leaderboard / .lb [weekly | monthly | all]
    if (sub === 'leaderboard' || sub === 'lb' || sub === 'top') {
      const mode = (args[1] || '').toLowerCase();
      let top10 = [];
      let lbTitle = 'Shinobi Level Leaderboard — Top Chatters';

      if (['weekly', 'week'].includes(mode)) {
        top10 = db.getTopUsersByWeeklyXP(10, guildId);
        lbTitle = '📅 Weekly XP Leaderboard — Top Chatters This Week';
      } else if (['monthly', 'month'].includes(mode)) {
        top10 = db.getTopUsersByMonthlyXP(10, guildId);
        lbTitle = '🗓️ Monthly XP Leaderboard — Top Chatters This Month';
      } else {
        top10 = db.getTopUsersByXP(10, guildId);
        lbTitle = '<a:rank_animated:1537179656090943538> All-Time Shinobi Leaderboard — Top Chatters';
      }

      const items = top10.map((u, i) => `#${i + 1} Lvl ${u.level} - ${u.rank.slice(0, 10)} (${u.xp} XP)`);
      const box = createDynamicBox('SHINOBI LEADERBOARD TOP 10', items.length ? items : ['No data available']);

      const embed = createStyledEmbed({
        title: `${emojis.RANK || emojis.LEVEL || '<a:rank_animated:1537179656090943538>'} ${lbTitle}`,
        subtitle: `Server: ${guild.name} • View: ${mode ? mode.toUpperCase() : 'ALL-TIME'}`,
        description: '```\n' + box + '\n```\n*Use `.level lb weekly` or `.level lb monthly` to toggle views!*',
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

      db.updateUser(target.id, (u) => { u.xp = (u.xp || 0) + amount; }, guildId);
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

      db.updateUser(target.id, (u) => {
        u.xp = Math.pow((newLvl - 1), 2) * 100;
        u.level = newLvl;
      }, guildId);
      return message.reply(`${emojis.SUCCESS} Set ${target.user.username}'s level to **Level ${newLvl}**.`);
    }

    // 8. .level rank [@user] — Canvas Rank Card
    if (!sub || sub === 'rank' || sub === 'card') {
      const targetUser = message.mentions.users.first() || author;
      const userData = db.getUser(targetUser.id, guildId);
      const totalXp  = userData.xp || 0;
      const level    = userData.level || 1;

      // ── Correct XP Math (ProBot quadratic: level = floor(0.1*sqrt(xp))+1) ──
      // Inverse: xp needed to START level L = ((L-1)/0.1)^2 = (L-1)^2 * 100
      const xpStartThisLevel = Math.pow((level - 1), 2) * 100;
      const xpStartNextLevel = Math.pow(level, 2) * 100;
      const xpInThisLevel    = Math.max(0, totalXp - xpStartThisLevel);
      const xpNeededThisLevel = xpStartNextLevel - xpStartThisLevel;
      const progress = Math.min(1, xpInThisLevel / Math.max(1, xpNeededThisLevel));

      try {
        const { createCanvas, loadImage } = require('@napi-rs/canvas');

        const W = 760, H = 220;
        const canvas = createCanvas(W, H);
        const ctx = canvas.getContext('2d');

        // ── 16 DYNAMIC GRADIENT PALETTES SELECTION ──────────────────────────
        let paletteIdx = 0;
        const numArg = parseInt(args[1] || args[0]);
        if (!isNaN(numArg) && numArg >= 1 && numArg <= 16) {
          paletteIdx = numArg - 1;
        } else if (userData.cardTheme && userData.cardTheme >= 1 && userData.cardTheme <= 16) {
          paletteIdx = userData.cardTheme - 1;
        } else {
          paletteIdx = (targetUser.id.charCodeAt(targetUser.id.length - 1) % 16);
        }
        const palette = RANK_GRADIENT_PALETTES[paletteIdx] || RANK_GRADIENT_PALETTES[0];
        const primaryColor = palette.colors[0];
        const secondaryColor = palette.colors[1] || palette.colors[0];
        const accentColor = palette.accent || palette.colors[palette.colors.length - 1];

        // ── BACKGROUND: custom image / custom color / default dark ────────
        let bgLoaded = false;
        if (userData.cardBg && userData.cardBg.startsWith('http')) {
          try {
            const customBgImg = await loadImage(userData.cardBg);
            ctx.drawImage(customBgImg, 0, 0, W, H);
            // Dark overlay for readability
            ctx.fillStyle = 'rgba(15,15,26,0.65)';
            ctx.fillRect(0, 0, W, H);
            bgLoaded = true;
          } catch {}
        }

        if (!bgLoaded) {
          ctx.fillStyle = (userData.cardBg && userData.cardBg.startsWith('#')) ? userData.cardBg : '#0f0f1a';
          ctx.fillRect(0, 0, W, H);
        }

        // Subtle dot grid
        ctx.fillStyle = 'rgba(255,255,255,0.025)';
        for (let gx = 20; gx < W; gx += 30) {
          for (let gy = 20; gy < H; gy += 30) {
            ctx.beginPath();
            ctx.arc(gx, gy, 1.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Diagonal slash accent (top-right corner, Theme-colored)
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(W - 200, 0);
        ctx.lineTo(W, 0);
        ctx.lineTo(W, H);
        ctx.lineTo(W - 130, H);
        ctx.closePath();
        const bgAccent = ctx.createLinearGradient(W - 200, 0, W, H);
        bgAccent.addColorStop(0, primaryColor + '22');
        bgAccent.addColorStop(1, secondaryColor + '11');
        ctx.fillStyle = bgAccent;
        ctx.fill();
        ctx.restore();

        // Bright accent slash line
        ctx.save();
        ctx.strokeStyle = primaryColor + '55';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(W - 200, 0);
        ctx.lineTo(W - 130, H);
        ctx.stroke();
        ctx.restore();

        // Rounded card border
        ctx.save();
        ctx.strokeStyle = primaryColor + '33';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(1, 1, W - 2, H - 2, 16);
        ctx.stroke();
        ctx.restore();

        // ── AVATAR (circle, left side) ───────────────────────────────────
        const avX = 95, avY = H / 2, avR = 68;

        // Outer glow (soft halo)
        ctx.save();
        const halo = ctx.createRadialGradient(avX, avY, avR - 5, avX, avY, avR + 20);
        halo.addColorStop(0, primaryColor + '55');
        halo.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(avX, avY, avR + 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Ring border with multi-stop Gradient
        ctx.save();
        const ringGrad = ctx.createLinearGradient(avX - avR, avY - avR, avX + avR, avY + avR);
        ringGrad.addColorStop(0, primaryColor);
        ringGrad.addColorStop(0.5, secondaryColor);
        ringGrad.addColorStop(1, accentColor);
        ctx.strokeStyle = ringGrad;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(avX, avY, avR + 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Avatar clip + draw
        ctx.save();
        ctx.beginPath();
        ctx.arc(avX, avY, avR, 0, Math.PI * 2);
        ctx.clip();
        try {
          const avImg = await loadImage(targetUser.displayAvatarURL({ extension: 'png', size: 256 }));
          ctx.drawImage(avImg, avX - avR, avY - avR, avR * 2, avR * 2);
        } catch {
          const fbGrad = ctx.createLinearGradient(avX - avR, avY - avR, avX + avR, avY + avR);
          fbGrad.addColorStop(0, primaryColor);
          fbGrad.addColorStop(1, secondaryColor);
          ctx.fillStyle = fbGrad;
          ctx.fillRect(avX - avR, avY - avR, avR * 2, avR * 2);
          ctx.font = 'bold 40px sans-serif';
          ctx.fillStyle = '#fff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(targetUser.username[0].toUpperCase(), avX, avY);
          ctx.textAlign = 'left';
          ctx.textBaseline = 'alphabetic';
        }
        ctx.restore();

        // ── USERNAME (large, white, bold) ─────────────────────────────────
        const tx = 188;
        const uname = targetUser.username.length > 16
          ? targetUser.username.slice(0, 16) + '…'
          : targetUser.username;

        ctx.font = 'bold 34px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('@' + uname, tx, 62);

        // Thin gradient underline
        const unameW = ctx.measureText('@' + uname).width;
        const lineGrad = ctx.createLinearGradient(tx, 0, tx + unameW, 0);
        lineGrad.addColorStop(0, primaryColor);
        lineGrad.addColorStop(1, accentColor);
        ctx.save();
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tx, 70);
        ctx.lineTo(tx + unameW, 70);
        ctx.stroke();
        ctx.restore();

        // ── STAT CHIPS: Level / XP / Rank ────────────────────────────────
        const chipY = 90, chipH = 28, chipR = 8, chipPad = 12;
        const stats = [
          { label: 'LVL', value: String(level) },
          { label: 'XP', value: `${fmtNum(xpInThisLevel)} / ${fmtNum(xpNeededThisLevel)}` },
          { label: 'RANK', value: (userData.rank || 'Student').split(' ')[0] }
        ];

        ctx.font = 'bold 13px sans-serif';
        let chipX = tx;
        for (const chip of stats) {
          const label = chip.label + ' ';
          const val   = chip.value;
          const lW = ctx.measureText(label).width;
          const vW = ctx.measureText(val).width;
          const totalW = lW + vW + chipPad * 2;

          // Chip background
          ctx.save();
          ctx.fillStyle = primaryColor + '22';
          ctx.strokeStyle = primaryColor + '44';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(chipX, chipY, totalW, chipH, chipR);
          ctx.fill();
          ctx.stroke();
          ctx.restore();

          // Label (dim)
          ctx.fillStyle = '#aaaaaa';
          ctx.fillText(label, chipX + chipPad, chipY + 19);

          // Value (accent gold/colored)
          ctx.fillStyle = accentColor;
          ctx.fillText(val, chipX + chipPad + lW, chipY + 19);

          chipX += totalW + 10;
        }

        // ── PROGRESS BAR ──────────────────────────────────────────────────
        const barX = tx, barY = 140;
        const barW = W - tx - 60, barH2 = 20;

        // Track
        ctx.save();
        ctx.fillStyle = '#1e1e30';
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH2, barH2 / 2);
        ctx.fill();
        ctx.stroke();

        // Fill (Multi-color gradient matching theme)
        const filled = Math.round(barW * progress);
        if (filled > 2) {
          const barGrad = ctx.createLinearGradient(barX, 0, barX + filled, 0);
          if (palette.colors.length === 2) {
            barGrad.addColorStop(0, palette.colors[0]);
            barGrad.addColorStop(1, palette.colors[1]);
          } else {
            barGrad.addColorStop(0, palette.colors[0]);
            barGrad.addColorStop(0.5, palette.colors[1]);
            barGrad.addColorStop(1, palette.colors[2]);
          }
          ctx.fillStyle = barGrad;
          ctx.beginPath();
          ctx.roundRect(barX, barY, filled, barH2, barH2 / 2);
          ctx.fill();

          // Top shine strip
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.beginPath();
          ctx.roundRect(barX + 2, barY + 2, filled - 4, barH2 / 2 - 2, [(barH2 / 2) - 1, (barH2 / 2) - 1, 0, 0]);
          ctx.fill();
        }
        ctx.restore();

        // Percentage label — floats to the right of the filled bar
        const pctText = Math.round(progress * 100) + '%';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = progress > 0.08 ? '#ffffff' : '#777777';
        const pctX = Math.min(barX + filled + 6, barX + barW - ctx.measureText(pctText).width - 4);
        ctx.fillText(pctText, Math.max(barX + 4, pctX), barY + 14);

        // XP progress label below bar
        ctx.font = '11px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillText(`${fmtNum(xpInThisLevel)} XP earned this level  •  ${fmtNum(xpNeededThisLevel - xpInThisLevel)} XP to level ${level + 1}`, barX, barY + barH2 + 15);

        // ── Server rank number (top-right) ────────────────────────────────
        // Fetch server rank
        let serverRank = '?';
        try {
          const top = db.getTopUsersByXP(500, guildId);
          const idx = top.findIndex(u => u.id === targetUser.id || u.userId === targetUser.id);
          serverRank = idx >= 0 ? String(idx + 1) : '—';
        } catch {}

        ctx.font = 'bold 13px sans-serif';
        ctx.fillStyle = 'rgba(255,215,0,0.7)';
        const srLabel = `# ${serverRank}`;
        const srW = ctx.measureText(srLabel).width;
        ctx.fillText(srLabel, W - srW - 18, 22);

        // Small "SERVER RANK" text above it
        ctx.font = '9px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillText('SERVER RANK', W - ctx.measureText('SERVER RANK').width - 18, 12);

        // ── Send ──────────────────────────────────────────────────────────
        const buffer = canvas.toBuffer('image/png');
        const { AttachmentBuilder } = require('discord.js');
        const attachment = new AttachmentBuilder(buffer, { name: 'rankcard.png' });
        return message.channel.send({ files: [attachment] });

      } catch (err) {
        console.error('[RankCard Canvas Error]', err.message);
        // Fallback embed
        const pct = Math.round(progress * 100);
        const barStr = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));
        const box = createDynamicBox('SHINOBI RANK CARD', [
          { key: 'Username', value: targetUser.username.slice(0, 12) },
          { key: 'Rank    ', value: (userData.rank || 'Student').slice(0, 12) },
          { key: 'Level   ', value: String(level) },
          { key: 'XP      ', value: `${fmtNum(xpInThisLevel)}/${fmtNum(xpNeededThisLevel)}` },
          { key: 'Progress', value: '[' + barStr + '] ' + pct + '%' }
        ]);
        const embed = createStyledEmbed({
          title: `<a:chart_animated:1537179539514462308> Shinobi Rank Card — ${targetUser.username}`,
          subtitle: `${userData.rank || 'Academy Student'}`,
          description: '```\n' + box + '\n```',
          requestedBy: author,
          clientUser
        });
        return message.channel.send({ embeds: [embed] });
      }
    }

    const { renderModuleHelpPanel } = require('../utils/panelRenderer');
    return renderModuleHelpPanel(message, 'level');
  }
};
