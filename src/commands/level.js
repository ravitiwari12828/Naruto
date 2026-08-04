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
      const top10 = db.getTopUsersByXP(10, guildId);
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

        // ── BACKGROUND: deep dark with subtle grid pattern ────────────────
        ctx.fillStyle = '#0f0f1a';
        ctx.fillRect(0, 0, W, H);

        // Subtle dot grid
        ctx.fillStyle = 'rgba(255,255,255,0.025)';
        for (let gx = 20; gx < W; gx += 30) {
          for (let gy = 20; gy < H; gy += 30) {
            ctx.beginPath();
            ctx.arc(gx, gy, 1.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Diagonal slash accent (top-right corner, Naruto leaf village inspired)
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(W - 200, 0);
        ctx.lineTo(W, 0);
        ctx.lineTo(W, H);
        ctx.lineTo(W - 130, H);
        ctx.closePath();
        const bgAccent = ctx.createLinearGradient(W - 200, 0, W, H);
        bgAccent.addColorStop(0, 'rgba(255,107,0,0.07)');
        bgAccent.addColorStop(1, 'rgba(255,200,0,0.04)');
        ctx.fillStyle = bgAccent;
        ctx.fill();
        ctx.restore();

        // Bright accent slash line
        ctx.save();
        ctx.strokeStyle = 'rgba(255,107,0,0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(W - 200, 0);
        ctx.lineTo(W - 130, H);
        ctx.stroke();
        ctx.restore();

        // Rounded card border
        ctx.save();
        ctx.strokeStyle = 'rgba(255,107,0,0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(1, 1, W - 2, H - 2, 16);
        ctx.stroke();
        ctx.restore();

        // ── AVATAR (circle, left side) ───────────────────────────────────
        const avX = 95, avY = H / 2, avR = 68;

        // Outer glow (soft orange halo)
        ctx.save();
        const halo = ctx.createRadialGradient(avX, avY, avR - 5, avX, avY, avR + 20);
        halo.addColorStop(0, 'rgba(255,107,0,0.35)');
        halo.addColorStop(1, 'rgba(255,107,0,0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(avX, avY, avR + 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Ring border
        ctx.save();
        const ringGrad = ctx.createLinearGradient(avX - avR, avY - avR, avX + avR, avY + avR);
        ringGrad.addColorStop(0, '#FF6B00');
        ringGrad.addColorStop(0.5, '#FFD700');
        ringGrad.addColorStop(1, '#FF6B00');
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
          fbGrad.addColorStop(0, '#FF6B00');
          fbGrad.addColorStop(1, '#6b00ff');
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

        // Thin coloured underline
        const unameW = ctx.measureText('@' + uname).width;
        const lineGrad = ctx.createLinearGradient(tx, 0, tx + unameW, 0);
        lineGrad.addColorStop(0, '#FF6B00');
        lineGrad.addColorStop(1, '#FFD700');
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
          ctx.fillStyle = 'rgba(255,107,0,0.12)';
          ctx.strokeStyle = 'rgba(255,107,0,0.3)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(chipX, chipY, totalW, chipH, chipR);
          ctx.fill();
          ctx.stroke();
          ctx.restore();

          // Label (dim)
          ctx.fillStyle = '#aaaaaa';
          ctx.fillText(label, chipX + chipPad, chipY + 19);

          // Value (orange-gold)
          ctx.fillStyle = '#FFD700';
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

        // Fill (only as wide as actual progress)
        const filled = Math.round(barW * progress);
        if (filled > 2) {
          const barGrad = ctx.createLinearGradient(barX, 0, barX + filled, 0);
          barGrad.addColorStop(0, '#FF6B00');
          barGrad.addColorStop(0.5, '#FF9900');
          barGrad.addColorStop(1, '#FFD700');
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
          title: `📈 Shinobi Rank Card — ${targetUser.username}`,
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
