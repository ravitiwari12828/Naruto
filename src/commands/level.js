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

    // 8. .level rank [@user] — Canvas Rank Card
    if (!sub || sub === 'rank' || sub === 'card') {
      const targetUser = message.mentions.users.first() || author;
      const userData = db.getUser(targetUser.id);
      const nextLvlXp = userData.level * 75;
      const progress = Math.min(1, (userData.xp || 0) / Math.max(1, nextLvlXp));

      try {
        const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');

        // ── Card Dimensions ──────────────────────────
        const W = 700, H = 200;
        const canvas = createCanvas(W, H);
        const ctx = canvas.getContext('2d');

        // ── Background: dark card ────────────────────
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.roundRect(0, 0, W, H, 18);
        ctx.fill();

        // ── Accent triangle shape (top-right, teal like reference) ─
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(W - 140, 0);
        ctx.lineTo(W, 0);
        ctx.lineTo(W, H);
        ctx.lineTo(W - 80, H);
        ctx.closePath();
        ctx.fillStyle = '#00b4d8';
        ctx.globalAlpha = 0.22;
        ctx.fill();
        // Inner lighter slice
        ctx.beginPath();
        ctx.moveTo(W - 70, 0);
        ctx.lineTo(W, 0);
        ctx.lineTo(W, H);
        ctx.lineTo(W - 30, H);
        ctx.closePath();
        ctx.fillStyle = '#48cae4';
        ctx.globalAlpha = 0.18;
        ctx.fill();
        ctx.restore();

        // ── Orange side accent bar (left edge) ──────
        ctx.save();
        ctx.fillStyle = '#FF6B00';
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.roundRect(0, 0, 6, H, [18, 0, 0, 18]);
        ctx.fill();
        ctx.restore();

        // ── Subtle inner glow border ─────────────────
        ctx.save();
        ctx.strokeStyle = '#FF6B00';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.roundRect(1, 1, W - 2, H - 2, 17);
        ctx.stroke();
        ctx.restore();

        // ── Circular Avatar ──────────────────────────
        const avatarX = 70, avatarY = H / 2, avatarR = 60;

        // Avatar glow ring (orange)
        ctx.save();
        ctx.shadowColor = '#FF6B00';
        ctx.shadowBlur = 18;
        ctx.strokeStyle = '#FF6B00';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(avatarX, avatarY, avatarR + 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Clip circle for avatar
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
        ctx.clip();

        try {
          const avatarUrl = targetUser.displayAvatarURL({ extension: 'png', size: 256 });
          const avatarImg = await loadImage(avatarUrl);
          ctx.drawImage(avatarImg, avatarX - avatarR, avatarY - avatarR, avatarR * 2, avatarR * 2);
        } catch {
          // Fallback: gradient circle if avatar load fails
          const grad = ctx.createRadialGradient(avatarX, avatarY, 0, avatarX, avatarY, avatarR);
          grad.addColorStop(0, '#FF6B00');
          grad.addColorStop(1, '#1a1a2e');
          ctx.fillStyle = grad;
          ctx.fillRect(avatarX - avatarR, avatarY - avatarR, avatarR * 2, avatarR * 2);
        }
        ctx.restore();

        // ── Username ─────────────────────────────────
        const textX = 155;
        const username = targetUser.username.length > 18
          ? targetUser.username.slice(0, 18) + '…'
          : targetUser.username;

        ctx.font = 'bold 30px sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('@' + username, textX, 68);

        // Underline below username (orange accent)
        const usernameWidth = ctx.measureText('@' + username).width;
        ctx.save();
        ctx.strokeStyle = '#FF6B00';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(textX, 76);
        ctx.lineTo(textX + usernameWidth, 76);
        ctx.stroke();
        ctx.restore();

        // ── Inline Stats: Level  XP  Rank ────────────
        const statsY = 112;
        ctx.font = 'bold 17px sans-serif';

        // "Level:" label (dim)
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText('Level:', textX, statsY);
        const lvlLabelW = ctx.measureText('Level:').width;

        // Level value (yellow)
        ctx.fillStyle = '#FFD700';
        const lvlText = String(userData.level || 1);
        ctx.fillText(lvlText, textX + lvlLabelW + 6, statsY);
        const lvlValW = ctx.measureText(lvlText).width;

        // "XP:" label
        const xpLabelX = textX + lvlLabelW + 6 + lvlValW + 24;
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText('XP:', xpLabelX, statsY);
        const xpLabelW = ctx.measureText('XP:').width;

        // XP value (yellow)
        ctx.fillStyle = '#FFD700';
        const xpText = `${fmtNum(userData.xp || 0)} / ${fmtNum(nextLvlXp)}`;
        ctx.fillText(xpText, xpLabelX + xpLabelW + 6, statsY);
        const xpValW = ctx.measureText(xpText).width;

        // "Rank:" label
        const rankLabelX = xpLabelX + xpLabelW + 6 + xpValW + 24;
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText('Rank:', rankLabelX, statsY);
        const rankLabelW = ctx.measureText('Rank:').width;

        // Rank value (yellow)
        ctx.fillStyle = '#FFD700';
        ctx.fillText(String(userData.rank || 'Student').split(' ')[0], rankLabelX + rankLabelW + 6, statsY);

        // ── XP Progress Bar ───────────────────────────
        const barX = textX, barY = 135;
        const barW = W - textX - 70, barH = 18;
        const filled = Math.round(barW * progress);

        // Bar background (dark track)
        ctx.save();
        ctx.fillStyle = '#2e2e4e';
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, barH / 2);
        ctx.fill();

        // Filled portion — orange → red gradient
        if (filled > 0) {
          const barGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
          barGrad.addColorStop(0, '#FF6B00');
          barGrad.addColorStop(0.6, '#FF3300');
          barGrad.addColorStop(1, '#FF6B00');
          ctx.fillStyle = barGrad;
          ctx.beginPath();
          ctx.roundRect(barX, barY, Math.max(barH, filled), barH, barH / 2);
          ctx.fill();

          // Shine highlight on filled bar
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          ctx.beginPath();
          ctx.roundRect(barX, barY, Math.max(barH, filled), barH / 2, [barH / 2, barH / 2, 0, 0]);
          ctx.fill();
        }
        ctx.restore();

        // Percentage text inside/below bar
        const pctText = Math.round(progress * 100) + '%';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = progress > 0.15 ? '#fff' : '#aaa';
        ctx.fillText(pctText, barX + 8, barY + 13);

        // ── Shinobi rank label (bottom right of card) ─
        ctx.font = '13px sans-serif';
        ctx.fillStyle = '#48cae4';
        ctx.globalAlpha = 0.85;
        const rankLabel = '⚡ ' + (userData.rank || 'Academy Student');
        const rankLabelMW = ctx.measureText(rankLabel).width;
        ctx.fillText(rankLabel, W - rankLabelMW - 20, H - 14);
        ctx.globalAlpha = 1;

        // ── Send card as image attachment ─────────────
        const buffer = canvas.toBuffer('image/png');
        const { AttachmentBuilder } = require('discord.js');
        const attachment = new AttachmentBuilder(buffer, { name: 'rankcard.png' });
        return message.channel.send({ files: [attachment] });

      } catch (err) {
        console.error('[RankCard Canvas Error]', err.message);
        // Fallback to embed if canvas fails
        const nextLvlXp2 = userData.level * 75;
        const progress2 = Math.min(100, Math.floor(((userData.xp || 0) / Math.max(1, nextLvlXp2)) * 100));
        const filled2 = Math.floor(progress2 / 10);
        const bar = '█'.repeat(filled2) + '░'.repeat(10 - filled2);
        const box = createDynamicBox('SHINOBI RANK PROFILE', [
          { key: 'Username', value: targetUser.username.slice(0, 12) },
          { key: 'Rank    ', value: (userData.rank || 'Student').slice(0, 12) },
          { key: 'Level   ', value: 'Level ' + (userData.level || 1) },
          { key: 'Total XP', value: (userData.xp || 0) + ' XP' },
          { key: 'Progress', value: '[' + bar + '] ' + progress2 + '%' }
        ]);
        const embed = createStyledEmbed({
          title: `${emojis.RANK || emojis.LEVEL || '📈'} Shinobi Rank Card — ${targetUser.username}`,
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
